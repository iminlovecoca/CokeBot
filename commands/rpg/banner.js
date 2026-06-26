const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const gachaBanner = require("../../data/gachaBanner");
const { DateTime } = require("luxon");

module.exports = {
  name: "banner",
  aliases: ["xbanner", "gachabanner"],
  description: "Xem thông tin banner gacha hiện tại và thời gian kết thúc.",
  usage: `${config.prefix}banner`,

  async execute(message, args) {
    // Load banner configuration
    const banner = gachaBanner;
    if (!banner || !banner.bannerName) {
      return message.reply("❌ Hiện tại không có banner gacha nào đang diễn ra.");
    }

    const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
    const expireDate = DateTime.fromISO(banner.expiresAt).setZone(timezone);
    const now = DateTime.now().setZone(timezone);

    if (expireDate < now) {
      return message.reply("❌ Banner gacha hiện tại đã kết thúc.");
    }

    // Format the time as hh:mm and the full date
    const timeStr = expireDate.toFormat("HH:mm");
    const dateStr = expireDate.toFormat("dd/MM/yyyy");

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle(`✨ ${banner.bannerName} ✨`)
      .setDescription(
        `🔥 **Thông tin tiêu điểm:**\n` +
        `• Vũ khí: ${banner.weaponEmoji} **${banner.weaponName}**\n` +
        `• Cấp bậc: **${banner.rarity}**\n` +
        `• Loại: \`${banner.weaponType === "weapon" ? "Vũ khí" : "Skin"}\`\n\n` +
        `⏰ Thời gian kết thúc: **${timeStr}:** ngày **${dateStr}**`
      )
      .setImage(banner.coverImage)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
