const BaseCommand = require("../../../core/BaseCommand");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  findRpgItem,
  calculateRpgPower,
  requireRpgCharacter,
  getRpgClass,
  formatStats,
} = require("../../../utils/rpgUtil");
const { getRarityColor, getRarityEmoji, getSlotEmoji, getSlotLabel, getRpgColor, formatRpgFooter, formatRpgTitle, safeInteractionUpdate } = require("../../../utils/rpgUi");
class TradegearCommand extends BaseCommand {
  constructor() {
    super({
      name: "tradegear",
      aliases: ["tg", "trade", "tradeitem"],
      description: "Trade trang bị (vũ khí) RPG của bạn với người chơi khác.",
      usage: `${config.prefix}tradegear @mention <itemId>`,
      examples: [
        { intent: "Trade trang bị ID 3 cho người khác", command: `${config.prefix}tradegear @Khang 3` },
      ],
      cooldown: 0
    });
  }
  async execute(message, args = []) {
    const senderId = message.author.id;
    const targetUserMention = message.mentions.users.first();
    const itemIdStr = args.find((arg) => !arg.startsWith("<@") && !arg.startsWith("<!@"));
    const cleanItemIdStr = itemIdStr ? itemIdStr.trim().replace(/^[gG]/, "") : "";
    const itemId = Number(cleanItemIdStr);
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
    const { user: senderUser, rpgClass: senderClass } = await requireRpgCharacter(senderId);
    const senderItem = findRpgItem(senderUser, itemId);
    if (!senderItem) {
      return message.reply(`${config.emoji.no} Bạn không sở hữu trang bị RPG có ID \`${itemId}\`.`);
    }
    if (senderItem.isGodset) {
      return message.reply(`${config.emoji.no} Trang bị từ God Set không thể giao dịch!`);
    }
    if (senderItem.isFavorite) {
      return message.reply(
        `${config.emoji.no} Trang bị này đang được yêu thích ⭐ và đã bị khóa. Hãy bỏ yêu thích trước khi giao dịch!`
      );
    }
    const isEquipped = Object.values(senderUser.rpg.equipped || {}).includes(senderItem.id);
    if (isEquipped) {
      return message.reply(
        `${config.emoji.no} Bạn đang mặc trang bị này. Hãy tháo ra (\`${config.prefix}unequip ${senderItem.slot}\`) trước khi trade.`,
      );
    }
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
    const hasSameUid = receiverUser.rpg.items.some(
      (item) => item.uid && item.uid === senderItem.uid,
    );
    if (hasSameUid) {
      return message.reply(
        `❌ **Không thể trade!** Cả hai người đều có cùng vũ khí này (trùng mã UID: \`${senderItem.uid.slice(0, 12)}\`).`,
      );
    }
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
      .setColor(getRarityColor(senderItem.rarity, senderClass.color || getRpgColor("brand")))
      .setTitle(formatRpgTitle("Xác nhận chuyển trang bị", "🤝"))
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
            `Tên: **${getRarityEmoji(senderItem.rarity)} ${senderItem.name}**\n` +
            `Ô: **${getSlotEmoji(senderItem.slot)} ${getSlotLabel(senderItem.slot)}**\n` +
            `Độ hiếm: ${getRarityEmoji(senderItem.rarity)} **${senderItem.rarity}**\n` +
            `Lực chiến: **+${senderItem.power.toLocaleString()}**\n` +
            `Chỉ số: **${formatStats(senderItem.stats) || "Không có"}**\n` +
            `Mã UID: \`${senderItem.uid}\``,
        },
      )
      .setFooter(formatRpgFooter("Giao dịch không thể hoàn tác • phiên xác nhận 60 giây"));
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
        const freshSender = await getUser(senderId);
        const freshReceiver = await getUser(receiverId);
        const freshItem = findRpgItem(freshSender, itemId);
        if (!freshItem) {
          return safeInteractionUpdate(interaction, {
            content: "❌ Giao dịch thất bại: Bạn không còn sở hữu trang bị này.",
            embeds: [],
            components: [],
          });
        }
        const freshIsEquipped = Object.values(freshSender.rpg.equipped || {}).includes(freshItem.id);
        if (freshIsEquipped) {
          return safeInteractionUpdate(interaction, {
            content: `❌ Giao dịch thất bại: Trang bị đã bị mặc lên người. Hãy tháo ra trước.`,
            embeds: [],
            components: [],
          });
        }
        const freshHasSameUid = freshReceiver.rpg.items.some(
          (item) => item.uid && item.uid === freshItem.uid,
        );
        if (freshHasSameUid) {
          return safeInteractionUpdate(interaction, {
            content: `❌ Giao dịch thất bại: Đối phương đã sở hữu vũ khí cùng mã UID này.`,
            embeds: [],
            components: [],
          });
        }
        freshSender.rpg.items = freshSender.rpg.items.filter((item) => item.id !== freshItem.id);
        freshSender.rpg.power = calculateRpgPower(freshSender);
        const transferredItem = {
          ...freshItem,
        };
        freshReceiver.rpg.items.push(transferredItem);
        freshReceiver.rpg.power = calculateRpgPower(freshReceiver);
        freshSender.markModified("rpg");
        freshReceiver.markModified("rpg");
        await freshSender.save();
        await freshReceiver.save();
        const successEmbed = EmbedBuilder.from(embed)
          .setColor(getRpgColor("success"))
          .setTitle(formatRpgTitle("Chuyển trang bị thành công", "✅"))
          .setDescription(
            `Trang bị **${transferredItem.name}** đã được chuyển thành công từ <@${senderId}> sang <@${receiverId}>!\n` +
              `ID vật phẩm: \`#${transferredItem.id}\``,
          )
          .setFooter(formatRpgFooter("Trang bị đã được chuyển sang kho của người nhận"));
        await safeInteractionUpdate(interaction, {
          embeds: [successEmbed],
          components: [],
        });
      } else if (interaction.customId === "trade_cancel") {
        collector.stop("cancelled");
        await safeInteractionUpdate(interaction, {
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
  }
}
module.exports = new TradegearCommand();
