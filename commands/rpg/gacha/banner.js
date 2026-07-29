const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const gachaBanner = require("../../../data/gachaBanner");
const { DateTime } = require("luxon");
class BannerCommand extends BaseCommand {
  constructor() {
    super({
      name: "banner",
      aliases: ["xbanner", "gachabanner"],
      description: "Xem thông tin banner gacha hiện tại và thời gian kết thúc.",
      usage: `${config.prefix}banner`,
      cooldown: 0
    });
  }
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    const bannersToShow = [];
    if (subcommand === "wp" || subcommand === "weapon") {
      if (gachaBanner.weapon) bannersToShow.push(gachaBanner.weapon);
    } else if (subcommand === "skin") {
      if (gachaBanner.skin) bannersToShow.push(gachaBanner.skin);
    } else {
      if (gachaBanner.weapon) bannersToShow.push(gachaBanner.weapon);
      if (gachaBanner.skin) bannersToShow.push(gachaBanner.skin);
    }
    if (bannersToShow.length === 0) {
      return message.reply("❌ Hiện tại không có banner gacha nào đang diễn ra.");
    }
    const { AttachmentBuilder } = require("discord.js");
    const fs = require("fs");
    const path = require("path");
    const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
    const now = DateTime.now().setZone(timezone);
    const embeds = [];
    const files = [];
    for (let idx = 0; idx < bannersToShow.length; idx++) {
      const banner = bannersToShow[idx];
      const expireDate = DateTime.fromISO(banner.expiresAt).setZone(timezone);
      if (expireDate < now) continue;
      const timeStr = expireDate.toFormat("HH:mm");
      const dateStr = expireDate.toFormat("dd/MM/yyyy");
      const embed = new EmbedBuilder()
        .setColor(banner.weaponType === "weapon" ? "#FFD700" : "#9B59B6")
        .setTitle(`✨ ${banner.bannerName} ✨`)
        .setDescription(
          `🔥 **Thông tin tiêu điểm:**\n` +
          `• Vũ khí: ${banner.weaponEmoji} **${banner.weaponName}**\n` +
          `• Cấp bậc: **${banner.rarity}**\n` +
          `• Loại: \`${banner.weaponType === "weapon" ? "Vũ khí" : "Skin"}\`\n\n` +
          `⏰ Thời gian kết thúc: **${timeStr}:** ngày **${dateStr}**`
        )
        .setTimestamp();
      if (banner.coverImage) {
        if (banner.coverImage.startsWith("http://") || banner.coverImage.startsWith("https://")) {
          embed.setImage(banner.coverImage);
        } else {
          const localPath = path.join(__dirname, "../../../assets/backgrounds", banner.coverImage);
          if (fs.existsSync(localPath)) {
            const fileName = `banner_cover_${idx}.png`;
            const attachment = new AttachmentBuilder(localPath, { name: fileName });
            files.push(attachment);
            embed.setImage(`attachment://${fileName}`);
          }
        }
      }
      embeds.push(embed);
    }
    if (embeds.length === 0) {
      return message.reply("❌ Tất cả các banner đã kết thúc hoặc không khả dụng.");
    }
    const payload = { embeds };
    if (files.length > 0) {
      payload.files = files;
    }
    return message.reply(payload);
  }
}
module.exports = new BannerCommand();