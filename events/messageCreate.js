const mongoose = require("mongoose");
const Cokemon = require("../models/cokemon/Cokemon");
const {
  getUser,
  getOrCreateUser,
  getActiveCokemon,
  addUserXp,
  getRankEmoji,
} = require("../utils/userUtil");
const { addCokemonXp } = require("../utils/cokemonUtil");
const {
  generateVerificationCode,
  generateCaptchaImage,
  handleVerification,
  checkMessage,
} = require("../utils/anticheat.js");
const { formatDuration } = require("../utils/miscUtil.js");
const { UserFriendlyError, handleCommandError } = require("../utils/errors");
const { parseCommandArgs } = require("../utils/commandParser");
const { answerQuestion, getThreadHistory } = require("../utils/qaSystem");
const {
  handleNoituMessage,
  getGuildConfig,
} = require("../utils/noituGame");
const config = require("../data/config");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || mongoose.connection.readyState !== 1) return;

    const userId = message.author.id;
    const normalizedPrefix = (config.prefix || "").toLowerCase();
    const contentLower = message.content.toLowerCase();
    const isCommand = contentLower.startsWith(normalizedPrefix);

    if (!client.bannedUsersCache) client.bannedUsersCache = new Map();
    if (!client.verificationCache) client.verificationCache = new Map();

    const now = Date.now();

    // 1. Check ban cache first to avoid DB query for banned users
    const cachedBanUntil = client.bannedUsersCache.get(userId);
    if (cachedBanUntil && cachedBanUntil > now) {
      let isNoituChannel = false;
      if (message.guild) {
        const guildConfig = await getGuildConfig(message.guild.id);
        if (guildConfig?.channelId === message.channel.id) {
          isNoituChannel = true;
        }
      }
      const isAiThread = message.channel.isThread() && message.channel.ownerId === client.user.id;

      if (isCommand || isAiThread || isNoituChannel) {
        const remainingMs = cachedBanUntil - now;
        return message.reply(
          `🚫 Bạn đang bị cấm sử dụng bot trong ${formatDuration(Math.floor(remainingMs / 1000))} còn lại.`,
        ).catch(() => {});
      }
      return;
    }

    // 2. Run anti-cheat burst/rhythm checks in-memory
    const cachedVerifying = client.verificationCache.get(userId);
    const anticheatCheck = cachedVerifying ? null : checkMessage(message);

    const xpCooldown = client.xpCooldowns.get(userId) || 0;
    const friendshipCooldown = client.friendshipCooldowns.get(userId) || 0;
    const needsXpCheck = now > xpCooldown;
    const needsFriendshipCheck = now > friendshipCooldown;

    const shouldLoadUser =
      isCommand ||
      cachedVerifying ||
      needsXpCheck ||
      needsFriendshipCheck ||
      anticheatCheck?.status === "TRIGGER_VERIFICATION";

    if (!shouldLoadUser) {
      // Normal chat message and cooldowns are active - skip all DB lookups!
      const handledNoituGame = await handleNoituMessage(message, client);
      if (handledNoituGame) return;
      return;
    }

    try {
      const user = await getOrCreateUser(userId);

      // Update ban cache
      if (user.bannedUntil) {
        client.bannedUsersCache.set(userId, new Date(user.bannedUntil).getTime());
      } else {
        client.bannedUsersCache.delete(userId);
      }

      // Update verification cache
      if (user.anticheat?.verification_code) {
        client.verificationCache.set(userId, user.anticheat.verification_code);
      } else {
        client.verificationCache.delete(userId);
      }

      // Bot lock check
      if (client.botLocked) {
        const allowedIds = client.allowedIds || config.permissions.dev_ids;
        if (!allowedIds.includes(userId)) return;
      }

      // Ban check (for case where user was just banned and we didn't hit cachedBanUntil)
      if (user.bannedUntil && user.bannedUntil > new Date()) {
        let isNoituChannel = false;
        if (message.guild) {
          const guildConfig = await getGuildConfig(message.guild.id);
          if (guildConfig?.channelId === message.channel.id) {
            isNoituChannel = true;
          }
        }
        const isAiThread = message.channel.isThread() && message.channel.ownerId === client.user.id;

        if (isCommand || isAiThread || isNoituChannel) {
          const banExpirationDate = new Date(user.bannedUntil);
          const remainingMs = banExpirationDate.getTime() - Date.now();
          return message.reply(
            `🚫 Bạn đang bị cấm sử dụng bot trong ${formatDuration(Math.floor(remainingMs / 1000))} còn lại.`,
          ).catch(() => {});
        }
        return;
      }

      // Pending verification check
      if (user.anticheat?.verification_code) {
        await handleVerification(message, user);
        if (!user.anticheat?.verification_code) {
          client.verificationCache.delete(userId);
        }
        return;
      }

      // Anti-cheat detection
      const check = anticheatCheck || checkMessage(message);
      if (check.status === "TRIGGER_VERIFICATION") {
        const code = generateVerificationCode();
        user.anticheat.verification_code = code;
        user.anticheat.last_flag_reason = check.reason;
        await user.save();

        client.verificationCache.set(userId, code); // Update cache

        const imageBuffer = generateCaptchaImage(code);
        await message.reply({
          content:
            `**${config.emoji.warning} [Phát hiện hành vi đáng ngờ] ${config.emoji.warning}**\n` +
            `Để tiếp tục, vui lòng nhập chính xác mã trong ảnh sau trong vòng **${config.anticheat.verification_timeout_ms / 1000} giây**:`,
          files: [{ attachment: imageBuffer, name: "captcha.png" }],
        });

        setTimeout(async () => {
          const freshUser = await getUser(userId);
          if (freshUser.anticheat?.verification_code === code) {
            freshUser.anticheat.verification_code = null;
            freshUser.bannedUntil = new Date(
              Date.now() + config.anticheat.mute_duration_ms,
            );

            client.verificationCache.delete(userId); // Clear verification cache
            client.bannedUsersCache.set(userId, freshUser.bannedUntil.getTime()); // Update ban cache

            let levelDeductedMsg = "";
            if (freshUser.rpg && freshUser.rpg.classKey) {
              const oldLevel = freshUser.rpg.level || 1;
              freshUser.rpg.level = Math.max(1, oldLevel - 10);
              const { getRpgRank } = require("../utils/rpgUtil");
              freshUser.rpg.rank = getRpgRank(freshUser.rpg.level);
              freshUser.markModified("rpg");
              levelDeductedMsg = ` Cấp độ RPG của bạn đã bị giảm 10 cấp (Lvl ${oldLevel} → Lvl ${freshUser.rpg.level}).`;
            }

            await freshUser.save();
            message.channel.send(
              `<@${message.author.id}>, bạn đã không hoàn thành xác thực và đã bị cấm sử dụng lệnh.${levelDeductedMsg}`,
            );
          }
        }, config.anticheat.verification_timeout_ms);
        return;
      }

      // Conversation thread handler
      if (
        message.channel.isThread() &&
        message.channel.ownerId === client.user.id
      ) {
        if (!contentLower.startsWith(normalizedPrefix)) {
          const lastMsgTimestamp =
            message.channel.lastMessage?.createdTimestamp || 0;
          const idleTime = Date.now() - lastMsgTimestamp;
          if (idleTime > config.ai.thread_expiry_ms) {
            console.log(
              `[AI Thread] Session expired for thread ${message.channel.id}. Treating as normal message.`,
            );
          } else {
            try {
              const thinkingMsg = await message.channel.send(
                "🤔 *Đang suy nghĩ...*",
              );
              const historyText = await getThreadHistory(
                message.channel,
                [message.id, thinkingMsg.id],
                client,
              );
              const { answer } = await answerQuestion(
                message.content,
                client,
                historyText,
                userId,
              );
              await thinkingMsg.edit(answer);
              return;
            } catch (error) {
              console.error("Thread Conversation Error:", error);
              return;
            }
          }
        }
      }

      const handledNoituGame = await handleNoituMessage(message, client);
      if (handledNoituGame) return;

      // User XP gain
      if (isCommand) {
        const { leveledUp, oldLevel, newLevel, totalReward } = await addUserXp(
          user,
          10,
        );
        if (leveledUp) {
          await message.channel.send(
            `🎉 **Chúc mừng <@${userId}> đã lên cấp!**\n` +
              `📈 Level: \`${oldLevel} → ${newLevel}\`\n` +
              `💰 Thưởng: \`${totalReward.toLocaleString()} coke\`\n` +
              `🏅 Rank: ${getRankEmoji(newLevel)}`,
          );
        }
      }

      // Passive Cokemon XP and friendship
      if (needsXpCheck) {
        if (user.active_cokemon_id) {
          try {
            const selectedCokemon = await getActiveCokemon(user); // Optimized: pass user instead of userId
            const xpGained = 5 + Math.floor(selectedCokemon.level * 0.2);
            const { levelsGained } = await addCokemonXp(
              selectedCokemon,
              xpGained,
            );
            if (levelsGained > 0) {
              await message.channel.send(
                `🎉 Chúc mừng **${selectedCokemon.nickname || selectedCokemon.species_id.name}** của bạn đã tăng lên **cấp ${selectedCokemon.level}**!`,
              );
            }
          } catch (error) {
            if (!(error instanceof UserFriendlyError)) {
              console.error("Unexpected error during passive XP gain:", error);
            }
          }
        }
        client.xpCooldowns.set(
          userId,
          now + config.cokemon_settings.xp_cooldown_ms,
        );
      }

      if (needsFriendshipCheck) {
        if (user.active_cokemon_id && Math.random() < 0.2) {
          await Cokemon.updateOne(
            { _id: user.active_cokemon_id },
            { $inc: { friendship: 1 } },
          );
        }
        client.friendshipCooldowns.set(
          userId,
          now + config.cokemon_settings.friendship_cooldown_ms,
        );
      }

      // Command execution
      if (isCommand) {
        const rawArgs = message.content
          .slice(config.prefix.length)
          .trim()
          .split(/ +/);
        const parsedArgs = parseCommandArgs(rawArgs);
        const commandName = parsedArgs.shift().toLowerCase();
        const command =
          client.commands.get(commandName) ||
          client.commands.find(
            (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
          );
        if (command) {
          const isDev = config.permissions?.dev_ids?.includes(userId) || userId === process.env.OWNER_ID;
          if (!isDev && client.lockedFeatures && client.lockedFeatures.length > 0) {
            const cmdName = command.name.toLowerCase();
            const cmdCategory = (command.category || "").toLowerCase();
            const isLocked = client.lockedFeatures.some(feature => {
              const f = feature.toLowerCase();
              return f === cmdName || f === cmdCategory || (command.aliases && command.aliases.map(a => a.toLowerCase()).includes(f));
            });
            if (isLocked) {
              return message.reply(`🚫 Tính năng/lệnh này đã bị chủ bot khóa tạm thời.`);
            }
          }
          // OOP Commands accept (message, args, client, services)
          // Legacy Commands accept (message, args) and ignore the rest
          await command.execute(message, parsedArgs, client, client.services);
        }
      }
    } catch (error) {
      await handleCommandError(error, message);
    }
  },
};
