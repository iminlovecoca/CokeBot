const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const {
  findRpgItem,
  calculateRpgPower,
  requireRpgCharacter,
  getRpgClass,
  formatStats,
} = require("../../utils/rpgUtil");

const slotEmoji = {
  weapon: "🗡️",
  armor: "🛡️",
  helmet: "🪖",
  boots: "🥾",
  ring: "💍",
  necklace: "📿",
};

const rarityEmoji = {
  Common: "⚪",
  Rare: "🔵",
  Epic: "🟣",
  Legendary: "🟡",
  Mythic: "🔴",
  Ancient: "🟤",
  Divine: "💠",
};

const rarityColor = {
  Common: "#95A5A6",
  Rare: "#3498DB",
  Epic: "#9B59B6",
  Legendary: "#F1C40F",
  Mythic: "#E67E22",
  Ancient: "#E74C3C",
  Divine: "#FFFFFF",
};

module.exports = {
  name: "tradegear",
  aliases: ["tg", "trade", "tradeitem"],
  description: "Trade trang bị (vũ khí) RPG của bạn với người chơi khác.",
  usage: `${config.prefix}tradegear @mention <itemId>`,
  examples: [
    { intent: "Trade trang bị ID 3 cho người khác", command: `${config.prefix}tradegear @Khang 3` },
  ],

  async execute(message, args = []) {
    const senderId = message.author.id;
    const targetUserMention = message.mentions.users.first();
    const itemIdStr = args.find((arg) => !arg.startsWith("<@") && !arg.startsWith("<!@"));
    const itemId = Number(itemIdStr);

    if (!targetUserMention) {
      return message.reply(
        `${config.emoji.warning} Vui lòng mention người chơi bạn muốn trade cùng.\nSử dụng: \`${config.prefix}tradegear @mention <itemId>\``,
      );
    }

    if (targetUserMention.id === senderId) {
      return message.reply(`${config.emoji.no} Bạn không thể tự trade trang bị với chính mình!`);
    }

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return message.reply(
        `${config.emoji.warning} Vui lòng nhập đúng ID trang bị (số nguyên dương).\nVí dụ: \`${config.prefix}tradegear @mention 3\``,
      );
    }

    // Load sender details
    const { user: senderUser, rpgClass: senderClass } = await requireRpgCharacter(senderId);

    // Find the item
    const senderItem = findRpgItem(senderUser, itemId);
    if (!senderItem) {
      return message.reply(`${config.emoji.no} Bạn không sở hữu trang bị RPG có ID \`${itemId}\`.`);
    }

    // Check if equipped
    const isEquipped = Object.values(senderUser.rpg.equipped || {}).includes(senderItem.id);
    if (isEquipped) {
      return message.reply(
        `${config.emoji.no} Bạn đang mặc trang bị này. Hãy tháo ra (\`${config.prefix}unequip ${senderItem.slot}\`) trước khi trade.`,
      );
    }

    // Load receiver details
    const receiverId = targetUserMention.id;
    let receiverUser;
    try {
      const res = await requireRpgCharacter(receiverId);
      receiverUser = res.user;
    } catch {
      return message.reply(
        `${config.emoji.no} Đối phương chưa tạo nhân vật RPG. Họ cần dùng lệnh \`${config.prefix}class\` trước khi nhận vật phẩm.`,
      );
    }

    // Check unique ID: "những ng có cùng id sẽ cũng có cùng vũ khí với nhau và không thể trade được"
    // senderItem.uid is guaranteed to exist because of our legacy handler in getRpgItems
    const hasSameUid = receiverUser.rpg.items.some(
      (item) => item.uid && item.uid === senderItem.uid,
    );
    if (hasSameUid) {
      return message.reply(
        `❌ **Không thể trade!** Cả hai người đều có cùng vũ khí này (trùng mã UID: \`${senderItem.uid.slice(0, 12)}\`).`,
      );
    }

    // Build confirm buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("trade_confirm")
        .setLabel("Xác nhận chuyển")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("trade_cancel")
        .setLabel("Hủy giao dịch")
        .setStyle(ButtonStyle.Danger),
    );

    const receiverClass = getRpgClass(receiverUser.rpg.classKey);

    const embed = new EmbedBuilder()
      .setColor(rarityColor[senderItem.rarity] || senderClass.color)
      .setTitle("🛡️ Xác Nhận Giao Dịch Trang Bị RPG")
      .setDescription(
        `Bạn có chắc chắn muốn chuyển trang bị sau cho <@${receiverId}> không?\n` +
          `**Chú ý:** Hành động này không thể hoàn tác.`,
      )
      .addFields(
        {
          name: "Người gửi",
          value: `<@${senderId}> (${senderClass.name})`,
          inline: true,
        },
        {
          name: "Người nhận",
          value: `<@${receiverId}> (${receiverClass.name})`,
          inline: true,
        },
        {
          name: "Trang bị giao dịch",
          value:
            `Tên: **${rarityEmoji[senderItem.rarity] || "⚪"} ${senderItem.name}**\n` +
            `Slot: **${slotEmoji[senderItem.slot] || "🎒"} ${config.rpg.gear_slot_names[senderItem.slot] || senderItem.slot}**\n` +
            `Độ hiếm: **${senderItem.rarity}**\n` +
            `Power: **+${senderItem.power.toLocaleString()}**\n` +
            `Chỉ số: **${formatStats(senderItem.stats) || "Không có"}**\n` +
            `Mã UID: \`${senderItem.uid}\``,
        },
      );

    const prompt = await message.reply({
      embeds: [embed],
      components: [row],
    });

    const collector = prompt.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === senderId,
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "trade_confirm") {
        collector.stop("confirmed");

        // Reload data to ensure consistency and avoid race conditions
        const freshSender = await getUser(senderId);
        const freshReceiver = await getUser(receiverId);

        // Re-run ownership check
        const freshItem = findRpgItem(freshSender, itemId);
        if (!freshItem) {
          return interaction.update({
            content: "❌ Giao dịch thất bại: Bạn không còn sở hữu trang bị này.",
            embeds: [],
            components: [],
          });
        }

        const freshIsEquipped = Object.values(freshSender.rpg.equipped || {}).includes(freshItem.id);
        if (freshIsEquipped) {
          return interaction.update({
            content: `❌ Giao dịch thất bại: Trang bị đã bị mặc lên người. Hãy tháo ra trước.`,
            embeds: [],
            components: [],
          });
        }

        // Re-run same UID check
        const freshHasSameUid = freshReceiver.rpg.items.some(
          (item) => item.uid && item.uid === freshItem.uid,
        );
        if (freshHasSameUid) {
          return interaction.update({
            content: `❌ Giao dịch thất bại: Đối phương đã sở hữu vũ khí cùng mã UID này.`,
            embeds: [],
            components: [],
          });
        }

        // Perform trade
        // Remove from sender
        freshSender.rpg.items = freshSender.rpg.items.filter((item) => item.id !== freshItem.id);
        freshSender.rpg.power = calculateRpgPower(freshSender);

        // Add to receiver
        const newReceiverItemId = (freshReceiver.rpg.lastItemId || 0) + 1;
        freshReceiver.rpg.lastItemId = newReceiverItemId;

        const transferredItem = {
          ...freshItem,
          id: newReceiverItemId,
        };

        freshReceiver.rpg.items.push(transferredItem);
        freshReceiver.rpg.power = calculateRpgPower(freshReceiver);

        // Save modifications
        freshSender.markModified("rpg");
        freshReceiver.markModified("rpg");

        await freshSender.save();
        await freshReceiver.save();

        const successEmbed = EmbedBuilder.from(embed)
          .setColor("#57F287")
          .setTitle("✅ Giao Dịch Thành Công")
          .setDescription(
            `Trang bị **${transferredItem.name}** đã được chuyển thành công từ <@${senderId}> sang <@${receiverId}>!\n` +
              `ID mới của vật phẩm: \`#${newReceiverItemId}\``,
          );

        await interaction.update({
          embeds: [successEmbed],
          components: [],
        });
      } else if (interaction.customId === "trade_cancel") {
        collector.stop("cancelled");
        await interaction.update({
          content: "❌ Giao dịch đã bị hủy.",
          embeds: [],
          components: [],
        });
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "confirmed" || reason === "cancelled") return;
      await prompt.edit({
        content: "⌛ Phiên giao dịch đã hết thời gian phản hồi (60s).",
        embeds: [],
        components: [],
      }).catch(() => {});
    });
  },
};
