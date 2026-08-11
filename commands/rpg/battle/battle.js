const BaseCommand = require("../../../core/BaseCommand");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const config = require("../../../data/config");
const User = require("../../../models/User");
const { checkAndSetCooldown, notifyCooldown } = require("../../../utils/cooldown");
const {
  addRpgExp,
  calculateRpgPower,
  getEffectiveRpgStats,
  getRpgClass,
  requireRpgCharacter,
  getEquippedItems,
  getCharacterAssetPath,
  getEquippedPetBonuses,
  getEquippedPet,
} = require("../../../utils/rpgUtil");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const CLASS_EMOJIS = {
  warrior: "⚙️",
  archer: "🌿",
  paladin: "🪨",
  assassin: "💧",
  mage: "🔥",
  wretch: "🪵",
};

// Global pending challenges map keyed by receiverId
const pendingChallenges = new Map();

/**
 * Helper to find any active challenge involving a specific userId (as sender or receiver)
 */
const findUserChallenge = (userId) => {
  for (const [key, c] of pendingChallenges.entries()) {
    if (c.senderId === userId || c.receiverId === userId) {
      return { key, challenge: c };
    }
  }
  return null;
};

class BattleCommand extends BaseCommand {
  constructor() {
    super({
      name: "battle",
      aliases: ["b", "pvp", "arena"],
      description: "Khiêu chiến PvP với người chơi khác hoặc ngẫu nhiên.",
      usage: `${config.prefix}battle [@mention]`,
      examples: [
        {
          intent: "PVP ngẫu nhiên với người đã tạo class",
          command: `${config.prefix}battle`,
        },
        {
          intent: "Khiêu chiến một người chơi cụ thể",
          command: `${config.prefix}battle @Khang`,
        },
      ],
      cooldown: 0,
    });
  }

  async execute(message, args = []) {
    const senderId = message.author.id;

    // Handle subcommand aliases: `xb accept`, `xb ab`, `xb decline`, `xb db`
    const firstArg = (args[0] || "").toLowerCase();
    if (["accept", "ab"].includes(firstArg)) {
      return handleAcceptChallenge(message);
    }
    if (["decline", "db"].includes(firstArg)) {
      return handleDeclineChallenge(message);
    }

    const targetMention = message.mentions.users.first();
    const cooldownSeconds = 15;
    const remaining = checkAndSetCooldown(senderId, "pvp", cooldownSeconds);
    if (remaining > 0) {
      return notifyCooldown(message, remaining);
    }

    let senderUser, senderClass;
    try {
      const res = await requireRpgCharacter(senderId);
      senderUser = res.user;
      senderClass = res.rpgClass;
    } catch {
      return message.reply(
        `${config.emoji.warning} Bạn chưa tạo nhân vật RPG. Hãy gõ \`${config.prefix}class\` để tạo nhân vật trước khi PvP.`,
      );
    }

    if (senderUser.rpg?.godsetBackup) {
      return message.reply(
        `${config.emoji.no} Bạn không thể tham gia PvP lúc này.`,
      );
    }

    // Direct PvP Challenge against targeted user
    if (targetMention) {
      const receiverId = targetMention.id;
      if (receiverId === senderId) {
        return message.reply(
          `${config.emoji.no} Bạn không thể tự chiến đấu với chính mình!`,
        );
      }
      if (targetMention.bot) {
        return message.reply(
          `${config.emoji.no} Bạn không thể khiêu chiến với Bot!`,
        );
      }

      // Concurrency check: Ensure sender does not have an active pending challenge
      const senderActive = findUserChallenge(senderId);
      if (senderActive) {
        return message.reply(
          `${config.emoji.no} Bạn đang trong một lời khiêu chiến chưa hoàn tất. Hãy từ chối (\`${config.prefix}db\`) hoặc chờ hết hạn trước khi khiêu chiến người khác.`,
        );
      }

      // Concurrency check: Ensure target does not have an active pending challenge
      const targetActive = findUserChallenge(receiverId);
      if (targetActive) {
        return message.reply(
          `${config.emoji.no} <@${receiverId}> hiện đang trong một lời khiêu chiến khác chưa hoàn tất!`,
        );
      }

      let receiverUser, receiverClass;
      try {
        const res = await requireRpgCharacter(receiverId);
        receiverUser = res.user;
        receiverClass = res.rpgClass;
      } catch {
        return message.reply(
          `${config.emoji.no} Đối phương chưa tạo nhân vật RPG. Họ cần dùng lệnh \`${config.prefix}class\` trước.`,
        );
      }

      const hiddenBattleIds = config.permissions?.hidden_battle_ids || [];
      const { isDev } = require("../../../utils/userUtil");
      const isTargetHidden = hiddenBattleIds.includes(receiverId) || receiverUser.rpg?.hiddenFromBattle;
      if (isTargetHidden && senderId !== receiverId && !isDev(senderId)) {
        return message.reply(
          `${config.emoji.no} Không tìm thấy người chơi này!`,
        );
      }

      if (receiverUser.rpg?.godsetBackup) {
        return message.reply(
          `${config.emoji.no} Đối phương không thể tham gia PvP lúc này.`,
        );
      }

      const senderName = message.member?.displayName || message.author.displayName || message.author.username;
      const targetMember = message.guild?.members.cache.get(receiverId);
      const targetName = targetMember?.displayName || targetMention.displayName || targetMention.username;

      const senderClassEmoji = CLASS_EMOJIS[senderUser.rpg.classKey] || "⚔️";
      const receiverClassEmoji = CLASS_EMOJIS[receiverUser.rpg.classKey] || "⚔️";

      const senderPwr = Math.floor(calculateRpgPower(senderUser));
      const receiverPwr = Math.floor(calculateRpgPower(receiverUser));

      const senderStreak = senderUser.rpg?.pvpStreak || 0;
      const receiverStreak = receiverUser.rpg?.pvpStreak || 0;

      const senderAvatar = message.author.displayAvatarURL({ dynamic: true, extension: "png", size: 256 });

      // 100% OwO Vietnamese style challenge embed
      const challengeEmbed = new EmbedBuilder()
        .setColor(senderClass.color || "#5865F2")
        .setAuthor({
          name: `${targetName.toUpperCase()}, ${senderName} đã thách đấu bạn một trận quyết chiến!`,
          iconURL: senderAvatar,
        })
        .setDescription(
          `\`${config.prefix}ab\` để chấp nhận trận đấu!\n` +
          `\`${config.prefix}db\` để từ chối trận đấu!`
        )
        .addFields(
          {
            name: `${senderName} | ${senderStreak} trận thắng`,
            value: `L.${senderUser.rpg.level} ${senderClassEmoji} ${senderClass.name} | ⚔️ **${senderPwr.toLocaleString()}** Lực chiến`,
            inline: true,
          },
          {
            name: `${targetName} | ${receiverStreak} trận thắng`,
            value: `L.${receiverUser.rpg.level} ${receiverClassEmoji} ${receiverClass.name} | ⚔️ **${receiverPwr.toLocaleString()}** Lực chiến`,
            inline: true,
          }
        )
        .setFooter({ text: "Thách đấu này sẽ hết hạn trong 10 phút" })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("pvp_accept")
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("pvp_decline")
          .setLabel("Decline")
          .setStyle(ButtonStyle.Danger)
      );

      // Send challenge message as traditional Discord Embed with buttons below (skipV2: true)
      const prompt = await message.reply({
        content: `<@${receiverId}>`,
        embeds: [challengeEmbed],
        components: [row],
        skipV2: true,
      });

      const challengeData = {
        senderId,
        receiverId,
        senderUser,
        receiverUser,
        senderClass,
        receiverClass,
        prompt,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      };

      pendingChallenges.set(receiverId, challengeData);

      const collector = prompt.createMessageComponentCollector({
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (interaction) => {
        const clickerId = interaction.user.id;

        if (interaction.customId === "pvp_accept") {
          // Only the challenged target user can accept
          if (clickerId !== receiverId) {
            return interaction.reply({
              content: `❌ Chỉ <@${receiverId}> mới có thể chấp nhận lời khiêu chiến này!`,
              flags: 64,
            });
          }

          collector.stop("accepted");
          pendingChallenges.delete(receiverId);
          await interaction.deferUpdate().catch(() => {});
          const freshSender = await User.findOne({ userId: senderId });
          const freshReceiver = await User.findOne({ userId: receiverId });
          if (!freshSender || !freshReceiver) return;
          const { updateQuestProgress } = require("../../../utils/questUtil");
          await Promise.all([
            updateQuestProgress(freshSender, "pvp_battle", 1, message.channel),
            updateQuestProgress(freshReceiver, "pvp_battle", 1, message.channel),
          ]);
          await runPvPBattle(message, prompt, freshSender, freshReceiver);

        } else if (interaction.customId === "pvp_decline") {
          // Both receiver (target) AND sender (challenger) can decline/cancel
          if (clickerId !== receiverId && clickerId !== senderId) {
            return interaction.reply({
              content: `❌ Bạn không thể từ chối lời thách đấu của người khác!`,
              flags: 64,
            });
          }

          collector.stop("declined");
          pendingChallenges.delete(receiverId);

          const cancelMsg = clickerId === senderId
            ? `❌ <@${senderId}> đã hủy lời khiêu chiến gửi tới <@${receiverId}>.`
            : `❌ <@${receiverId}> đã từ chối lời khiêu chiến từ <@${senderId}>.`;

          await interaction.update({
            content: cancelMsg,
            embeds: [],
            components: [],
            skipV2: true,
          }).catch(() => {});
        }
      });

      collector.on("end", async (collected, reason) => {
        pendingChallenges.delete(receiverId);
        if (reason === "accepted" || reason === "declined") return;
        await prompt
          .edit({
            content: `⌛ Lời khiêu chiến đã hết hạn. <@${receiverId}> đã không trả lời kịp thời.`,
            embeds: [],
            components: [],
            skipV2: true,
          })
          .catch(() => {});
      });

      return;
    }

    // Random PvP Matchmaking
    const hiddenBattleIds = config.permissions?.hidden_battle_ids || [];
    const excludedIds = Array.from(new Set([senderId, ...hiddenBattleIds]));
    const opponents = await User.aggregate([
      {
        $match: {
          "rpg.classKey": { $ne: null },
          userId: { $nin: excludedIds },
          "rpg.godsetBackup": null,
          "rpg.hiddenFromBattle": { $ne: true },
        },
      },
      { $sample: { size: 1 } },
    ]).catch(() => []);

    if (!opponents || opponents.length === 0) {
      return message.reply(
        `${config.emoji.no} Không tìm thấy người chơi nào khác có nhân vật RPG trong dữ liệu game để thách đấu.`,
      );
    }

    const randomOpponent = opponents[0];
    await runPvPBattle(message, null, senderUser, randomOpponent);
  }
}

/**
 * Handle accepting a pending PvP challenge via `xab` command.
 */
const handleAcceptChallenge = async (message) => {
  const receiverId = message.author.id;
  const challenge = pendingChallenges.get(receiverId);

  if (!challenge) {
    return message.reply(
      `${config.emoji.no} Bạn hiện không có lời khiêu chiến PvP nào đang chờ chấp nhận!`,
    );
  }

  pendingChallenges.delete(receiverId);
  const { senderId, prompt } = challenge;

  const freshSender = await User.findOne({ userId: senderId });
  const freshReceiver = await User.findOne({ userId: receiverId });
  if (!freshSender || !freshReceiver) return;

  const { updateQuestProgress } = require("../../../utils/questUtil");
  await Promise.all([
    updateQuestProgress(freshSender, "pvp_battle", 1, message.channel),
    updateQuestProgress(freshReceiver, "pvp_battle", 1, message.channel),
  ]);

  await runPvPBattle(message, prompt, freshSender, freshReceiver);
};

/**
 * Handle declining or canceling a pending PvP challenge via `xdb` command.
 */
const handleDeclineChallenge = async (message) => {
  const userId = message.author.id;
  const found = findUserChallenge(userId);

  if (!found) {
    return message.reply(
      `${config.emoji.no} Bạn hiện không có lời khiêu chiến PvP nào để từ chối hoặc hủy!`,
    );
  }

  const { key, challenge } = found;
  pendingChallenges.delete(key);

  const { senderId, receiverId, prompt } = challenge;
  const isSender = userId === senderId;

  const statusMsg = isSender
    ? `❌ <@${senderId}> đã hủy lời khiêu chiến gửi tới <@${receiverId}>.`
    : `❌ <@${receiverId}> đã từ chối lời khiêu chiến từ <@${senderId}>.`;

  if (prompt && prompt.editable) {
    await prompt
      .edit({
        content: statusMsg,
        embeds: [],
        components: [],
        skipV2: true,
      })
      .catch(() => {});
  }

  return message.reply(statusMsg);
};

/**
 * Executes a PvP battle between two users and displays the result.
 */
const runPvPBattle = async (message, promptMessage, user1OrId, user2OrId) => {
  const getUserId = (val) => (typeof val === "object" && val !== null ? val.userId : val);
  const user1 = typeof user1OrId === "object" && typeof user1OrId.save === "function" ? user1OrId : await User.findOne({ userId: getUserId(user1OrId) });
  const user2 = typeof user2OrId === "object" && typeof user2OrId.save === "function" ? user2OrId : await User.findOne({ userId: getUserId(user2OrId) });

  const p1Id = user1.userId;
  const p2Id = user2.userId;

  const class1 = getRpgClass(user1.rpg.classKey);
  const class2 = getRpgClass(user2.rpg.classKey);

  let p1Name = user1.rpg?.name || message.client.users.cache.get(p1Id)?.username || message.author.displayName || message.author.username;
  let p2Name = user2.rpg?.name || message.client.users.cache.get(p2Id)?.username || `Người chơi #${p2Id.slice(-4)}`;

  const equipped1 = getEquippedItems(user1);
  const equipped2 = getEquippedItems(user2);

  const { simulateBattle, renderPvPImage, processRewards } = require("../../../rpg/battle");

  // Simulate battle (30 max turns)
  const result = simulateBattle(user1, user2, { maxTurns: 30 });

  // Process XP and rewards
  const rewards = await processRewards(user1, user2, result, {
    isTargeted: !!promptMessage,
    channel: message.channel,
  });

  const isP1Winner = result.winner && result.winner.id === user1.userId;

  const battleDisplay = user1.rpg?.settings?.battleDisplay || "image";
  const battleSpeed = user1.rpg?.settings?.battleSpeed || "instant";
  const battleLogs = user1.rpg?.settings?.battleLogs || "false";
  const showImage = !["text", "compact"].includes(battleDisplay);

  const memberName = message.member?.displayName || message.author.displayName || message.author.username;
  const authorAvatar = message.author.displayAvatarURL({ dynamic: true, extension: "png", size: 256 });
  const weapon1Emoji = equipped1.weapon?.emoji ? ` ${equipped1.weapon.emoji}` : "";
  const weapon2Emoji = equipped2.weapon?.emoji ? ` ${equipped2.weapon.emoji}` : "";

  let footerText = "";
  if (result.isDraw) {
    footerText = `Hòa sau ${result.turns} lượt! | Cả hai nhận +50 XP | Chuỗi thắng giữ nguyên${rewards.petFooterInfo || ""}`;
  } else {
    const winText = isP1Winner ? "Chiến thắng" : "Thất bại";
    const xpGained = isP1Winner ? 200 : 50;
    const isTargeted = !!promptMessage;
    let streakText = isTargeted ? "Không tính chuỗi" : `Chuỗi thắng: ${isP1Winner ? user1.rpg.pvpStreak : 0}`;
    footerText = `${winText} trong ${result.turns} lượt! | +${xpGained} XP | ${streakText}${rewards.petFooterInfo || ""}`;
  }

  // Discord Embed with round circular avatar icon
  const finalEmbed = new EmbedBuilder()
    .setColor(result.isDraw ? "#F1C40F" : isP1Winner ? "#2ECC71" : "#E74C3C")
    .setAuthor({
      name: `${memberName} Đang chiến đấu!`,
      iconURL: authorAvatar,
    })
    .addFields(
      {
        name: `${p1Name}${weapon1Emoji} (${class1.name})`,
        value: `LV. **${user1.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user1)).toLocaleString()}**`,
        inline: true,
      },
      {
        name: `${p2Name}${weapon2Emoji} (${class2.name})`,
        value: `LV. **${user2.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user2)).toLocaleString()}**`,
        inline: true,
      }
    );

  // Show detailed logs if enabled in battlesetting
  if (battleLogs === "true" && result.logs && result.logs.length > 0) {
    const logSnippet = result.logs.slice(-8).join("\n");
    finalEmbed.addFields({
      name: "📜 Nhật ký trận đấu",
      value: logSnippet.length > 1024 ? logSnippet.substring(0, 1021) + "..." : logSnippet,
      inline: false,
    });
  } else if (battleLogs === "link" && result.logs && result.logs.length > 0) {
    finalEmbed.addFields({
      name: "📜 Nhật ký trận đấu",
      value: `*Trận đấu diễn ra trong ${result.turns} lượt.*`,
      inline: false,
    });
  }

  const getActiveStatusEmojis = (effects) => {
    if (!effects) return "";
    const list = [];
    if (effects.bleedRounds > 0) list.push("<:bleed:1521938497642958889>");
    if (effects.healReduced) list.push("<:healreduction:1523340558855045190>");
    if (effects.armorReduced > 0) list.push("<:break:1521938480337391736>");
    if (effects.armorBoosted > 0) list.push("<:atkup:1521938477359300648>");
    return list.length > 0 ? " " + list.join(" ") : "";
  };

  const pet1 = getEquippedPet(user1);
  const pet2 = getEquippedPet(user2);

  if (showImage && result.history && result.history.length > 0) {
    const history = result.history;
    const totalStates = history.length;
    let indices = [totalStates - 1];
    if (battleSpeed === "short") {
      indices = totalStates > 1 ? [0, totalStates - 1] : [0];
    } else if (battleSpeed === "lengthy") {
      const mid1Index = Math.max(1, Math.min(totalStates - 2, Math.floor(totalStates * 0.33)));
      const mid2Index = Math.max(mid1Index + 1, Math.min(totalStates - 2, Math.floor(totalStates * 0.66)));
      indices = [0];
      if (totalStates > 2) indices.push(mid1Index);
      if (totalStates > 3) indices.push(mid2Index);
      indices.push(totalStates - 1);
    }

    let activeMessage = promptMessage;
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const state = history[idx];
      const isFinalFrame = i === indices.length - 1;
      let finalStatus = isFinalFrame ? (result.isDraw ? "timeout" : "ko") : null;

      const imgData = await renderPvPImage(
        user1,
        user2,
        state.p1.hp,
        result.p1.maxHp,
        state.p1.rage || 0,
        pet1,
        state.p1.effects,
        state.p2.hp,
        result.p2.maxHp,
        state.p2.rage || 0,
        pet2,
        state.p2.effects,
        finalStatus
      ).catch((err) => {
        console.error("Failed to render PvP image:", err);
        return null;
      });

      if (imgData) {
        const attachment = new AttachmentBuilder(imgData.buffer, { name: imgData.name });
        const p1Status = getActiveStatusEmojis(state.p1.effects);
        const p2Status = getActiveStatusEmojis(state.p2.effects);
        const currentEmbed = EmbedBuilder.from(finalEmbed)
          .setImage(`attachment://${imgData.name}`)
          .setFields([
            {
              name: `${p1Name}${weapon1Emoji} (${class1.name})${p1Status}`,
              value: `LV. **${user1.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user1)).toLocaleString()}**`,
              inline: true,
            },
            {
              name: `${p2Name}${weapon2Emoji} (${class2.name})${p2Status}`,
              value: `LV. **${user2.rpg.level}**\n⚔ Lực chiến: **${Math.floor(calculateRpgPower(user2)).toLocaleString()}**`,
              inline: true,
            },
          ]);

        if (battleLogs === "true" && result.logs && result.logs.length > 0) {
          const logSnippet = result.logs.slice(-8).join("\n");
          currentEmbed.addFields({
            name: "📜 Nhật ký trận đấu",
            value: logSnippet.length > 1024 ? logSnippet.substring(0, 1021) + "..." : logSnippet,
            inline: false,
          });
        }

        if (isFinalFrame) {
          currentEmbed.setFooter({ text: footerText });
        } else {
          currentEmbed.setFooter({ text: `Đang chiến đấu... Lượt ${state.turn}/${result.turns}` });
        }

        const payload = { embeds: [currentEmbed], files: [attachment] };
        if (activeMessage && activeMessage.editable) {
          const edited = await activeMessage.edit({ ...payload, components: [] }).catch((err) => {
            console.error("[PVP_BATTLE] Error editing activeMessage:", err);
            return null;
          });
          if (!edited) {
            activeMessage = await message.channel.send(payload).catch(() => null);
          }
        } else {
          activeMessage = await message.channel.send(payload).catch(() => null);
        }
      }

      if (i < indices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  } else {
    const finalEmbedWithFooter = EmbedBuilder.from(finalEmbed).setFooter({ text: footerText });
    if (promptMessage && promptMessage.editable) {
      const edited = await promptMessage.edit({ embeds: [finalEmbedWithFooter], components: [] }).catch((err) => {
        console.error("[PVP_BATTLE] Error editing promptMessage:", err);
        return null;
      });
      if (!edited) {
        await message.channel.send({ embeds: [finalEmbedWithFooter] }).catch(() => {});
      }
    } else {
      await message.channel.send({ embeds: [finalEmbedWithFooter] }).catch(() => {});
    }
  }
};

module.exports = new BattleCommand();
module.exports.pendingChallenges = pendingChallenges;
module.exports.handleAcceptChallenge = handleAcceptChallenge;
module.exports.handleDeclineChallenge = handleDeclineChallenge;