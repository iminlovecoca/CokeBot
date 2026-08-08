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

// Global pending challenges map keyed by targetUserId
const pendingChallenges = new Map();

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

      // OwO-style challenge embed matching user's screenshot
      const challengeEmbed = new EmbedBuilder()
        .setColor(senderClass.color || "#5865F2")
        .setAuthor({
          name: `${targetName.toUpperCase()}, ${senderName} challenges you to a duel!`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `\`${config.prefix}ab\` to accept the battle!\n` +
          `\`${config.prefix}db\` to decline the battle!`
        )
        .addFields(
          {
            name: `${senderName} | ${senderStreak} wins`,
            value: `L.${senderUser.rpg.level} ${senderClassEmoji} ${senderClass.name} | ⚔️ **${senderPwr.toLocaleString()}** Pwr`,
            inline: true,
          },
          {
            name: `${targetName} | ${receiverStreak} wins`,
            value: `L.${receiverUser.rpg.level} ${receiverClassEmoji} ${receiverClass.name} | ⚔️ **${receiverPwr.toLocaleString()}** Pwr`,
            inline: true,
          }
        )
        .setFooter({ text: "This challenge will expire in 10 minutes" })
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

      const prompt = await message.reply({
        content: `<@${receiverId}>`,
        embeds: [challengeEmbed],
        components: [row],
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
        filter: (interaction) => interaction.user.id === receiverId,
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "pvp_accept") {
          collector.stop("accepted");
          pendingChallenges.delete(receiverId);
          await interaction.deferUpdate();
          const { updateQuestProgress } = require("../../../utils/questUtil");
          await Promise.all([
            updateQuestProgress(senderUser, "pvp_battle", 1, message.channel),
            updateQuestProgress(receiverUser, "pvp_battle", 1, message.channel),
          ]);
          await runPvPBattle(message, prompt, senderUser, receiverUser);
        } else if (interaction.customId === "pvp_decline") {
          collector.stop("declined");
          pendingChallenges.delete(receiverId);
          await interaction.update({
            content: `❌ <@${receiverId}> đã từ chối lời khiêu chiến từ <@${senderId}>.`,
            embeds: [],
            components: [],
          });
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
 * Handle accepting a pending PvP challenge.
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
  const { senderUser, receiverUser, prompt } = challenge;

  const { updateQuestProgress } = require("../../../utils/questUtil");
  await Promise.all([
    updateQuestProgress(senderUser, "pvp_battle", 1, message.channel),
    updateQuestProgress(receiverUser, "pvp_battle", 1, message.channel),
  ]);

  await runPvPBattle(message, prompt, senderUser, receiverUser);
};

/**
 * Handle declining a pending PvP challenge.
 */
const handleDeclineChallenge = async (message) => {
  const receiverId = message.author.id;
  const challenge = pendingChallenges.get(receiverId);

  if (!challenge) {
    return message.reply(
      `${config.emoji.no} Bạn hiện không có lời khiêu chiến PvP nào để từ chối!`,
    );
  }

  pendingChallenges.delete(receiverId);
  const { senderId, prompt } = challenge;

  if (prompt && prompt.editable) {
    await prompt
      .edit({
        content: `❌ <@${receiverId}> đã từ chối lời khiêu chiến từ <@${senderId}>.`,
        embeds: [],
        components: [],
      })
      .catch(() => {});
  }

  return message.reply(
    `❌ Bạn đã từ chối lời khiêu chiến từ <@${senderId}>.`,
  );
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

  const finalEmbed = new EmbedBuilder()
    .setColor(result.isDraw ? "#F1C40F" : isP1Winner ? "#2ECC71" : "#E74C3C")
    .setAuthor({
      name: `${memberName} Đang chiến đấu!`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
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

        const payload = { embeds: [currentEmbed], files: [attachment], skipV2: true };
        if (activeMessage && activeMessage.editable) {
          await activeMessage.edit({ ...payload, components: [] }).catch(() => {});
        } else {
          activeMessage = await message.reply(payload).catch(() => null);
        }
      }

      if (i < indices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  } else {
    const finalEmbedWithFooter = EmbedBuilder.from(finalEmbed).setFooter({ text: footerText });
    if (promptMessage && promptMessage.editable) {
      await promptMessage.edit({ embeds: [finalEmbedWithFooter], components: [], skipV2: true }).catch(() => {});
    } else {
      await message.reply({ embeds: [finalEmbedWithFooter], skipV2: true }).catch(() => {});
    }
  }
};

module.exports = new BattleCommand();
module.exports.pendingChallenges = pendingChallenges;
module.exports.handleAcceptChallenge = handleAcceptChallenge;
module.exports.handleDeclineChallenge = handleDeclineChallenge;