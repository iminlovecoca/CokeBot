const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { getRpgColor, formatRpgFooter, formatRpgTitle } = require("../../../utils/rpgUi");

class GachaCommand extends BaseCommand {
  constructor() {
    super({
      name: "gacha",
      aliases: ["qc"],
      description: "Hệ thống Gacha vũ khí RPG (Đã đóng cửa).",
      usage: `${config.prefix}gacha`,
      cooldown: 0,
    });
  }

  async execute(message, _args) {
    const embed = new EmbedBuilder()
      .setColor(getRpgColor("warning") || 0xf59e0b)
      .setTitle(formatRpgTitle("Hệ Thống Gacha Vũ Khí Đã Đóng Cửa", "⚠️"))
      .setDescription(
        `Cơ chế **Gacha vũ khí** đã được loại bỏ khỏi game để đảm bảo tính cân bằng và trải nghiệm nhập vai chuẩn OwO.\n\n` +
          `🗡️ **Cách kiếm vũ khí hiện tại:**\n` +
          `• 📦 **Mở Hòm Vũ Khí**: Dùng lệnh \`${config.prefix}wc\` hoặc \`${config.prefix}use wc\` (kiếm hòm từ săn bắt, phó bản, boss thế giới).\n` +
          `• 🏰 **Vượt Phó Bản (Dungeon)**: Dùng lệnh \`${config.prefix}dungeon\` để săn vũ khí phó bản và đá rèn Cristal.\n` +
          `• 🐲 **Diệt Boss Thế Giới (World Boss)**: Dùng lệnh \`${config.prefix}boss\` để nhận vũ khí sử thi và tài nguyên quý hiếm.\n` +
          `• 🏪 **Cửa Hàng Vũ Khí Hàng Ngày**: *(Sắp ra mắt)* Mua vũ khí luân phiên mỗi ngày bằng Coke.\n\n` +
          `💡 *Vũ khí thường (Common) nhận được từ Hòm Vũ Khí có thể dùng để trang bị tăng sức mạnh cho Linh Thú qua lệnh \`${config.prefix}equip pet <tên_pet> <ID_vũ_khí>\`!*`
      )
      .setFooter(formatRpgFooter("Cập nhật hệ thống RPG • Gacha đã vô hiệu hóa"))
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}

module.exports = new GachaCommand();
