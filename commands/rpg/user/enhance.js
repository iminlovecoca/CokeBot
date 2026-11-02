const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const config = require("../../../data/config");
const {
  requireRpgCharacter,
  getGearDisplayName,
  calculateRpgPower,
  getItemImageFile,
} = require("../../../utils/rpgUtil");
const { getRpgColor, formatRpgFooter, formatRpgTitle, safeInteractionUpdate } = require("../../../utils/rpgUi");

const ENHANCE_CONFIG = {
  0: { stoneId: "cristal-1", stoneQty: 1, cokeCost: 15000, rate: 1.00 },
  1: { stoneId: "cristal-2", stoneQty: 1, cokeCost: 30000, rate: 0.90 },
  2: { stoneId: "cristal-3", stoneQty: 1, cokeCost: 60000, rate: 0.80 },
  3: { stoneId: "cristal-4", stoneQty: 1, cokeCost: 100000, rate: 0.68 },
  4: { stoneId: "cristal-5", stoneQty: 1, cokeCost: 160000, rate: 0.55 },
  5: { stoneId: "cristal-6", stoneQty: 1, cokeCost: 250000, rate: 0.42 },
  6: { stoneId: "cristal-7", stoneQty: 1, cokeCost: 380000, rate: 0.30 },
  7: { stoneId: "cristal-8", stoneQty: 1, cokeCost: 550000, rate: 0.22 },
  8: { stoneId: "cristal-8", stoneQty: 2, cokeCost: 800000, rate: 0.15 },
  9: { stoneId: "cristal-8", stoneQty: 3, cokeCost: 1200000, rate: 0.10 },
  10: { stoneId: "cristal-8", stoneQty: 4, cokeCost: 2000000, rate: 0.06 },
};

class EnhanceCommand extends BaseCommand {
  constructor() {
    super({
      name: "enhance",
      aliases: ["eh", "ch", "cuonghoa"],
      description: "Cường hóa vũ khí của bạn sử dụng 8 loại Đá Cristal và Coke (Tối đa +11, cơ chế FO4).",
      usage: `${config.prefix}enhance [ID vũ khí]`,
      examples: [
        { intent: "Cường hóa vũ khí đang trang bị", command: `${config.prefix}enhance` },
        { intent: "Cường hóa vũ khí có ID 15", command: `${config.prefix}enhance 15` },
      ],
      cooldown: 0,
    });
  }

  async execute(message, args) {
    const { user } = await requireRpgCharacter(message.author.id);
    const cleanArg = args[0] ? args[0].trim().replace(/^[gG]/, "") : "";
    let itemId = Number(cleanArg);
    const equipped = user.rpg.equipped || {};

    if (!cleanArg) {
      if (!equipped.weapon) {
        return message.reply(
          `${config.emoji.no} Bạn chưa trang bị vũ khí nào. Hãy trang bị vũ khí trước hoặc nhập ID vũ khí muốn cường hóa.`
        );
      }
      itemId = equipped.weapon;
    }

    const items = user.rpg.items || [];
    const itemIndex = items.findIndex((it) => it.id === Number(itemId));
    if (itemIndex === -1) {
      return message.reply(`${config.emoji.no} Không tìm thấy trang bị này trong túi đồ của bạn.`);
    }

    const item = items[itemIndex];
    if (item.slot !== "weapon") {
      return message.reply(`${config.emoji.no} Chỉ có thể cường hóa trang bị thuộc loại **Vũ khí**.`);
    }

    // Common weapons cannot be enhanced (dedicated for pets at level 0)
    if (item.rarity === "Common") {
      return message.reply(
        `${config.emoji.no} **Vũ khí phẩm chất Thường (Common)** mặc định là cấp 0 và không thể cường hóa!\n` +
          `Vũ khí thường dùng riêng để trang bị cho Linh Thú. Bạn có thể dùng lệnh: \`${config.prefix}equip pet <tên_pet> ${item.id}\`.`
      );
    }

    const maxLevel = 11;
    const currentLvl = item.upgradeLevel || 0;
    if (currentLvl >= maxLevel) {
      return message.reply(`${config.emoji.warning} Vũ khí này đã đạt cấp độ cường hóa tối đa (**+${maxLevel}**).`);
    }

    const nextLvl = currentLvl + 1;
    const enhanceRule = ENHANCE_CONFIG[currentLvl];
    if (!enhanceRule) {
      return message.reply(`${config.emoji.no} Cấp độ cường hóa hiện tại không hợp lệ.`);
    }

    const { stoneId, stoneQty, cokeCost, rate } = enhanceRule;

    if (user.coke < cokeCost) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ Coke để cường hóa! Cần **${cokeCost.toLocaleString()}** ${config.emoji.money} nhưng bạn chỉ có **${user.coke.toLocaleString()}** ${config.emoji.money}.`
      );
    }

    if (!user.inventory) {
      user.inventory = new Map();
    }
    const userStoneQty = user.inventory.get(stoneId) || 0;
    const stoneItem = message.client.allItems.find((i) => i.item_id === stoneId);
    const stoneName = stoneItem ? stoneItem.name : `Cristal Smithing Stone [${stoneId.split("-")[1]}]`;
    const stoneEmoji = stoneItem ? stoneItem.emoji : "💎";

    if (userStoneQty < stoneQty) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ nguyên liệu! Cần **${stoneQty} x ${stoneEmoji} ${stoneName}** nhưng hiện tại chỉ có **${userStoneQty}** viên trong túi đồ.`
      );
    }

    const ratePercent = Math.round(rate * 100);
    const failLevel = Math.max(0, currentLvl - 1);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_enhance")
        .setLabel("Xác nhận đập đồ")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel_enhance")
        .setLabel("Hủy")
        .setStyle(ButtonStyle.Danger)
    );

    const confirmEmbed = new EmbedBuilder()
      .setColor(getRpgColor("premium") || 0xf39c12)
      .setTitle(formatRpgTitle("Lò Rèn Cường Hóa (Cơ chế FO4)", "🔨"))
      .setDescription(
        `Bạn có chắc chắn muốn tiến hành cường hóa vũ khí sau không?\n\n` +
          `🗡️ **Vũ khí**: ${getGearDisplayName(item)} (**+${currentLvl}** ➡️ **+${nextLvl}**)\n` +
          `🎯 **Tỉ lệ thành công**: **${ratePercent}%**\n` +
          `${config.emoji.money} Coke tiêu hao: **${cokeCost.toLocaleString()}**\n` +
          `💎 Nguyên liệu tiêu hao: **${stoneQty} x ${stoneEmoji} ${stoneName}**\n\n` +
          `⚠️ **Cảnh báo rủi ro (FO4):**\n` +
          (currentLvl === 0
            ? `• Thất bại: Mất đá & Coke (giữ nguyên cấp +0).`
            : `• Nếu thất bại: Mất đá & Coke, vũ khí sẽ **BỊ TỤT 1 CẤP** (**+${currentLvl}** ➡️ **+${failLevel}**)!`)
      )
      .setFooter(formatRpgFooter("Cân nhắc tỉ lệ trước khi xác nhận • Hết hạn sau 20 giây"))
      .setTimestamp();

    const confirmMsg = await message.reply({
      embeds: [confirmEmbed],
      components: [row],
    });

    try {
      const interaction = await confirmMsg.awaitMessageComponent({
        filter: (i) => i.user.id === message.author.id,
        time: 20000,
      });

      if (interaction.customId === "confirm_enhance") {
        const { getUser } = require("../../../utils/userUtil");
        const freshUser = await getUser(message.author.id);
        if (!freshUser || !freshUser.rpg || !freshUser.rpg.classKey) {
          return safeInteractionUpdate(interaction, {
            content: "❌ Không tìm thấy nhân vật RPG của bạn.",
            embeds: [],
            components: [],
          });
        }

        const freshItems = freshUser.rpg.items || [];
        const freshItemIndex = freshItems.findIndex((it) => it.id === Number(itemId));
        if (freshItemIndex === -1) {
          return safeInteractionUpdate(interaction, {
            content: "❌ Không tìm thấy vũ khí này trong túi đồ của bạn nữa.",
            embeds: [],
            components: [],
          });
        }

        const freshItem = freshItems[freshItemIndex];
        const freshCurrentLvl = freshItem.upgradeLevel || 0;
        if (freshCurrentLvl !== currentLvl) {
          return safeInteractionUpdate(interaction, {
            content: `❌ Giao dịch thất bại: Cấp độ vũ khí hiện tại đã thay đổi hoặc đang được xử lý trong một phiên khác.`,
            embeds: [],
            components: [],
          });
        }

        if (freshUser.coke < cokeCost) {
          return safeInteractionUpdate(interaction, {
            content: `❌ Bạn không đủ Coke để cường hóa! Cần **${cokeCost.toLocaleString()}** ${config.emoji.money} nhưng bạn chỉ có **${freshUser.coke.toLocaleString()}** ${config.emoji.money}.`,
            embeds: [],
            components: [],
          });
        }

        if (!freshUser.inventory) {
          freshUser.inventory = new Map();
        }
        const freshUserStoneQty = freshUser.inventory.get(stoneId) || 0;
        if (freshUserStoneQty < stoneQty) {
          return safeInteractionUpdate(interaction, {
            content: `❌ Bạn không đủ nguyên liệu! Cần **${stoneQty} x ${stoneEmoji} ${stoneName}** nhưng hiện tại chỉ có **${freshUserStoneQty}** viên trong túi đồ.`,
            embeds: [],
            components: [],
          });
        }

        // Deduct resources
        freshUser.coke -= cokeCost;
        const newQty = freshUserStoneQty - stoneQty;
        if (newQty <= 0) {
          freshUser.inventory.delete(stoneId);
        } else {
          freshUser.inventory.set(stoneId, newQty);
        }
        freshUser.markModified("inventory");

        // Roll success or failure
        const isSuccess = Math.random() < rate;

        let resultEmbed;
        if (isSuccess) {
          freshItem.upgradeLevel = nextLvl;
          freshItem.name = getGearDisplayName(freshItem);
          freshUser.rpg.power = calculateRpgPower(freshUser);
          freshUser.markModified("rpg");
          await freshUser.save();

          resultEmbed = new EmbedBuilder()
            .setColor(getRpgColor("reward") || 0x2ecc71)
            .setTitle(formatRpgTitle("CƯỜNG HÓA THÀNH CÔNG!", "✨"))
            .setDescription(
              `🎉 Chúc mừng bạn đã nâng cấp thành công vũ khí của mình lên **+${nextLvl}**!\n\n` +
                `🗡️ **Vũ khí**: ${getGearDisplayName(freshItem)}\n` +
                `🎯 **Tỉ lệ thành công**: **${ratePercent}%**\n` +
                `${config.emoji.money} Coke tiêu hao: **-${cokeCost.toLocaleString()}**\n` +
                `💎 Nguyên liệu tiêu hao: **-${stoneQty} x ${stoneEmoji} ${stoneName}**\n\n` +
                `💪 Lực chiến tổng hiện tại: **${freshUser.rpg.power.toLocaleString()}**`
            )
            .setFooter(formatRpgFooter("Cấp cường hóa và lực chiến đã được lưu"))
            .setTimestamp();
        } else {
          const newDegradedLvl = Math.max(0, currentLvl - 1);
          freshItem.upgradeLevel = newDegradedLvl;
          freshItem.name = getGearDisplayName(freshItem);
          freshUser.rpg.power = calculateRpgPower(freshUser);
          freshUser.markModified("rpg");
          await freshUser.save();

          resultEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(formatRpgTitle("CƯỜNG HÓA THẤT BẠI!", "💥"))
            .setDescription(
              `💀 **Rất tiếc! Đập đồ thất bại** (Tỉ lệ thành công: **${ratePercent}%**).\n\n` +
                `🗡️ **Vũ khí**: ${getGearDisplayName(freshItem)}\n` +
                `📉 Cấp độ: **+${currentLvl}** ➡️ **+${newDegradedLvl}** *(Tụt 1 cấp theo cơ chế FO4)*\n` +
                `${config.emoji.money} Coke đã mất: **-${cokeCost.toLocaleString()}**\n` +
                `💎 Nguyên liệu đã mất: **-${stoneQty} x ${stoneEmoji} ${stoneName}**\n\n` +
                `💪 Lực chiến hiện tại: **${freshUser.rpg.power.toLocaleString()}**\n\n` +
                `*Đừng nản lòng! Hãy thu thập thêm đá Cristal và thử lại lần sau.*`
            )
            .setFooter(formatRpgFooter("Cơ chế đập đồ FO4 • Đã hạ 1 cấp"))
            .setTimestamp();
        }

        let itemAttachment = null;
        const imgKey = freshItem.imageKey || getItemImageFile(freshItem);
        if (imgKey) {
          const itemImagePath = path.join(__dirname, "../../../assets/items", imgKey);
          if (fs.existsSync(itemImagePath)) {
            itemAttachment = new AttachmentBuilder(itemImagePath, { name: "item.png" });
            resultEmbed.setThumbnail("attachment://item.png");
          }
        }

        const payload = { embeds: [resultEmbed], components: [] };
        if (itemAttachment) {
          payload.files = [itemAttachment];
        }
        return safeInteractionUpdate(interaction, payload);
      } else {
        return safeInteractionUpdate(interaction, {
          content: "❌ Đã hủy yêu cầu cường hóa vũ khí.",
          embeds: [],
          components: [],
        });
      }
    } catch {
      await confirmMsg.edit({
        content: "❌ Hết thời gian chờ, yêu cầu cường hóa vũ khí đã tự động hủy.",
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  }
}

module.exports = new EnhanceCommand();
