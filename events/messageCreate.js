const mongoose = require("mongoose");
const Cokemon = require("../models/cokemon/Cokemon");
const { AttachmentBuilder } = require("discord.js");
const {
  getUser,
  getOrCreateUser,
  getActiveCokemon,
  addUserXp,
  getRankEmoji,
  getRawRankName,
} = require("../utils/userUtil");
const { createLevelUpCanvas } = require("../utils/levelUpCanvas");
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

    // Keep a monotonic timestamp so diagnostic commands can distinguish
    // handler/DB queue time from the Discord request itself.
    message.__cokeBotReceivedAt = process.hrtime.bigint();

    const userId = message.author.id;
    const normalizedPrefix = (config.prefix || "").toLowerCase();
    const contentLower = message.content.toLowerCase();
    const isCommand = contentLower.startsWith(normalizedPrefix);

    if (!client.bannedUsersCache) client.bannedUsersCache = new Map();
    if (!client.verificationCache) client.verificationCache = new Map();

    const now = Date.now();

    
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
      try {
        const handledNoituGame = await handleNoituMessage(message, client);
        if (handledNoituGame) return;
      } catch (err) {
        console.error("[Noitu] Error in handleNoituMessage (fast path):", err);
      }
      return;
    }

    try {
      // xping is a read-only diagnostic command. Run it after the synchronous
      // anti-cheat check but before the full user/DB load, so a slow Mongo
      // lookup cannot add seconds to the connection report.
      const rawCommandName = isCommand
        ? contentLower
            .slice(normalizedPrefix.length)
            .trim()
            .split(/\s+/)[0]
        : "";
      const fastPingCommand = rawCommandName
        ? client.commands.get(rawCommandName) ||
          client.commands.find((cmd) =>
            cmd.aliases?.some((alias) => alias.toLowerCase() === rawCommandName),
          )
        : null;
      const isDev = config.permissions?.dev_ids?.includes(userId) || userId === process.env.OWNER_ID;
      const isPingLocked = !isDev && client.lockedFeatures?.some((feature) => {
        const normalizedFeature = feature.toLowerCase();
        return normalizedFeature === "ping" || normalizedFeature === "user";
      });
      const isBlockedByGlobalLock =
        client.botLocked && !(client.allowedIds || config.permissions.dev_ids || []).includes(userId);

      if (
        fastPingCommand?.name?.toLowerCase() === "ping" &&
        !fastPingCommand.cooldown &&
        !cachedVerifying &&
        anticheatCheck?.status !== "TRIGGER_VERIFICATION" &&
        !isPingLocked &&
        !isBlockedByGlobalLock
      ) {
        await fastPingCommand.execute(message, [], client, client.services);
        return;
      }

      const user = await getOrCreateUser(userId);

      
      if (user.bannedUntil) {
        client.bannedUsersCache.set(userId, new Date(user.bannedUntil).getTime());
      } else {
        client.bannedUsersCache.delete(userId);
      }

      
      if (user.anticheat?.verification_code) {
        client.verificationCache.set(userId, user.anticheat.verification_code);
      } else {
        client.verificationCache.delete(userId);
      }

      
      if (client.botLocked) {
        const allowedIds = client.allowedIds || config.permissions.dev_ids;
        if (!allowedIds.includes(userId)) return;
      }

      
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

      
      if (user.anticheat?.verification_code) {
        await handleVerification(message, user);
        if (!user.anticheat?.verification_code) {
          client.verificationCache.delete(userId);
        }
        return;
      }

      
      const check = anticheatCheck || checkMessage(message);
      if (check.status === "TRIGGER_VERIFICATION") {
        const code = generateVerificationCode();
        user.anticheat.verification_code = code;
        user.anticheat.last_flag_reason = check.reason;
        await user.save();

        client.verificationCache.set(userId, code); 

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

            client.verificationCache.delete(userId); 
            client.bannedUsersCache.set(userId, freshUser.bannedUntil.getTime()); 

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

      // Parse and resolve the command EARLY (before XP/passive work) so the
      // command response is sent without waiting for the side-effect DB writes.
      let commandDispatch = null;
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
          let isLocked = false;
          if (!isDev && client.lockedFeatures && client.lockedFeatures.length > 0) {
            const cmdName = command.name.toLowerCase();
            const cmdCategory = (command.category || "").toLowerCase();
            isLocked = client.lockedFeatures.some(feature => {
              const f = feature.toLowerCase();
              return f === cmdName || f === cmdCategory || (command.aliases && command.aliases.map(a => a.toLowerCase()).includes(f));
            });
          }
          if (isLocked) {
            return message.reply(`🚫 Tính năng/lệnh này đã bị chủ bot khóa tạm thời.`);
          }
          // Check command cooldown (must block before running the command)
          if (command.cooldown && command.cooldown > 0) {
            const { checkAndSetCooldown } = require("../utils/cooldown");
            const cd = checkAndSetCooldown(userId, command.name, command.cooldown);
            if (cd > 0) {
              const minutes = Math.floor(cd / 60);
              const seconds = cd % 60;
              let timeString = "";
              if (minutes > 0) timeString += `${minutes} phút`;
              if (minutes > 0 && seconds > 0) timeString += " ";
              if (seconds > 0) timeString += `${seconds} giây`;
              return message.reply(`⏱ | Bạn phải chờ **${timeString}** để dùng lại lệnh.`).catch(() => {});
            }
          }
          commandDispatch = { message, parsedArgs, command };
        }
      }

      // For non-command messages: noitu game handling still blocks as before.
      if (!isCommand) {
        try {
          const handledNoituGame = await handleNoituMessage(message, client);
          if (handledNoituGame) return;
        } catch (err) {
          console.error("[Noitu] Error in handleNoituMessage (full path):", err);
        }
      }

      // Dispatch the command FIRST so its response is not delayed by the
      // XP / passive / friendship side-effect DB writes below.
      if (commandDispatch) {
        await commandDispatch.command.execute(
          commandDispatch.message,
          commandDispatch.parsedArgs,
          client,
          client.services,
        );
      }

      // ---- Post-dispatch side effects (run in the background, never block) ----
      const runBackgroundSideEffects = async () => {
        // XP gain for using a command (+ level-up banner)
        if (isCommand) {
          try {
            const { leveledUp, newLevel, totalReward, totalLbReward, totalWcReward } = await addUserXp(user, 10);
            if (leveledUp) {
              try {
                const avatarUrl = message.author.displayAvatarURL({ extension: "png", size: 256 });
                const title = user.rpg?.name || user.rpg?.rank || getRawRankName(newLevel);
                const displayName = message.member?.displayName || message.author.username;
                const buffer = await createLevelUpCanvas({
                  newLevel,
                  totalReward,
                  avatarUrl,
                  title,
                });
                const attachment = new AttachmentBuilder(buffer, { name: "levelup.png" });
                let bonusRewardText = "";
                if (totalLbReward > 0 || totalWcReward > 0) {
                  bonusRewardText = ` (+**${totalLbReward}** <:lootbox:1339620577748451458>, +**${totalWcReward}** <:weapon_crate:1339620593485611089>)`;
                }
                await message.channel.send({
                  content: `🎉 | **${displayName}** | **${title}** leveled up!${bonusRewardText}`,
                  files: [attachment],
                }).catch(() => {});
              } catch (err) {
                console.error("[LEVEL_UP_NOTIFICATION] Error sending level up banner:", err);
              }
            }
          } catch (err) {
            console.error("[COMMAND_XP] Error granting command XP:", err);
          }
        }

        // Passive cokemon XP
        if (needsXpCheck) {
          if (user.active_cokemon_id) {
            try {
              const selectedCokemon = await getActiveCokemon(user);
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

        // Friendship increment
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
      };

      Promise.resolve()
        .then(runBackgroundSideEffects)
        .catch((err) => {
          console.error("[SIDE_EFFECTS] Error in background side effects:", err);
        });
    } catch (error) {
      await handleCommandError(error, message);
    }
  },
};
