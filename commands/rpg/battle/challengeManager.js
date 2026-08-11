const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../../data/config");
const User = require("../../../models/User");
const { calculateRpgPower, getEquippedItems } = require("../../../utils/rpgUtil");
const runPvPBattle = require("./runPvPBattle");
const confirmationManager = require("../../../utils/confirmationManager");

const CLASS_EMOJIS = {
  warrior: "⚙️",
  archer: "🌿",
  paladin: "🪨",
  assassin: "💧",
  mage: "🔥",
  wretch: "🪵",
};

const pendingChallenges = confirmationManager.pendingRequests;

const findUserChallenge = (userId) => {
  const found = confirmationManager.findRequest(userId);
  if (!found) return null;
  return { key: found.key, challenge: found.request };
};

const sendChallenge = async (
  message,
  senderId,
  receiverId,
  targetMention,
  senderUser,
  receiverUser,
  senderClass,
  receiverClass
) => {
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

  const equipped1 = getEquippedItems(senderUser);
  const equipped2 = getEquippedItems(receiverUser);
  const weapon1Emoji = equipped1.weapon?.emoji ? ` | ${equipped1.weapon.emoji}` : "";
  const weapon2Emoji = equipped2.weapon?.emoji ? ` | ${equipped2.weapon.emoji}` : "";

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
        value: `L.${senderUser.rpg.level} ${senderClassEmoji} ${senderClass.name}${weapon1Emoji}\n⚔️ **${senderPwr.toLocaleString()}** Lực chiến`,
        inline: true,
      },
      {
        name: `${targetName} | ${receiverStreak} trận thắng`,
        value: `L.${receiverUser.rpg.level} ${receiverClassEmoji} ${receiverClass.name}${weapon2Emoji}\n⚔️ **${receiverPwr.toLocaleString()}** Lực chiến`,
        inline: true,
      }
    )
    .setFooter({ text: "Thách đấu này sẽ hết hạn trong 10 phút" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pvp_accept")
      .setLabel("Chấp Nhận")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("pvp_decline")
      .setLabel("Từ Chối")
      .setStyle(ButtonStyle.Danger)
  );

  const prompt = await message.reply({
    content: `<@${receiverId}>`,
    embeds: [challengeEmbed],
    components: [row],
    skipV2: true,
  });

  const collector = prompt.createMessageComponentCollector({
    time: 10 * 60 * 1000,
  });

  confirmationManager.createRequest({
    type: "battle",
    senderId,
    receiverId,
    prompt,
    data: { senderUser, receiverUser, senderClass, receiverClass },
    timeoutMs: 10 * 60 * 1000,
    onAccept: async (req, triggerContext) => {
      collector.stop("accepted");
      if (triggerContext && typeof triggerContext.deferUpdate === "function" && !triggerContext.replied && !triggerContext.deferred) {
        await triggerContext.deferUpdate().catch(() => {});
      }
      const freshSender = await User.findOne({ userId: senderId });
      const freshReceiver = await User.findOne({ userId: receiverId });
      if (!freshSender || !freshReceiver) return;
      await runPvPBattle(message, prompt, freshSender, freshReceiver);
    },
    onDecline: async (req, triggerContext, isSender) => {
      collector.stop("declined");
      const cancelMsg = isSender
        ? `❌ <@${senderId}> đã hủy lời khiêu chiến gửi tới <@${receiverId}>.`
        : `❌ <@${receiverId}> đã từ chối lời khiêu chiến từ <@${senderId}>.`;

      if (triggerContext && typeof triggerContext.update === "function" && !triggerContext.replied && !triggerContext.deferred) {
        await triggerContext.update({
          content: cancelMsg,
          embeds: [],
          components: [],
          skipV2: true,
        }).catch(() => {});
      } else if (prompt && prompt.editable) {
        await prompt.edit({
          content: cancelMsg,
          embeds: [],
          components: [],
          skipV2: true,
        }).catch(() => {});
      }
      if (triggerContext && typeof triggerContext.reply === "function" && triggerContext !== message) {
        await triggerContext.reply(cancelMsg).catch(() => {});
      }
    },
    onExpire: async () => {
      collector.stop("expired");
      if (prompt && prompt.editable) {
        await prompt.edit({
          content: `⌛ Lời khiêu chiến đã hết hạn. <@${receiverId}> đã không trả lời kịp thời.`,
          embeds: [],
          components: [],
          skipV2: true,
        }).catch(() => {});
      }
    },
  });

  collector.on("collect", async (interaction) => {
    const clickerId = interaction.user.id;

    if (interaction.customId === "pvp_accept") {
      if (clickerId !== receiverId) {
        return interaction.reply({
          content: `❌ Chỉ <@${receiverId}> mới có thể chấp nhận lời khiêu chiến này!`,
          flags: 64,
        });
      }
      await confirmationManager.acceptRequest(clickerId, interaction);
    } else if (interaction.customId === "pvp_decline") {
      if (clickerId !== receiverId && clickerId !== senderId) {
        return interaction.reply({
          content: `❌ Bạn không thể từ chối lời thách đấu của người khác!`,
          flags: 64,
        });
      }
      await confirmationManager.declineRequest(clickerId, interaction);
    }
  });

  return prompt;
};

const handleAcceptChallenge = async (message) => {
  return confirmationManager.acceptRequest(message.author.id, message);
};

const handleDeclineChallenge = async (message) => {
  return confirmationManager.declineRequest(message.author.id, message);
};

module.exports = {
  pendingChallenges,
  findUserChallenge,
  sendChallenge,
  handleAcceptChallenge,
  handleDeclineChallenge,
};
