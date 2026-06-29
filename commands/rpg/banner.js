const BaseCommand = require("../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const gachaBanner = require("../../data/gachaBanner");
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
      .setTimestamp();

    const files = [];
    if (banner.coverImage) {
      if (banner.coverImage.startsWith("http://") || banner.coverImage.startsWith("https://")) {
        embed.setImage(banner.coverImage);
      } else {
        const { AttachmentBuilder } = require("discord.js");
        const fs = require("fs");
        const path = require("path");
        const localPath = path.join(__dirname, "../../assets/backgrounds", banner.coverImage);
        if (fs.existsSync(localPath)) {
          const attachment = new AttachmentBuilder(localPath, { name: "banner_cover.png" });
          files.push(attachment);
          embed.setImage("attachment://banner_cover.png");
        }
      }
    }

    const payload = { embeds: [embed] };
    if (files.length > 0) {
      payload.files = files;
    }
    return message.reply(payload);
  }
}

module.exports = new BannerCommand();
