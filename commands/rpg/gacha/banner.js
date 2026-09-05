const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const gachaBanner = require("../../../data/gachaBanner");
const { DateTime } = require("luxon");
const { getRarityColor, getRarityEmoji, formatRpgFooter, formatRpgTitle } = require("../../../utils/rpgUi");
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
    const bannersToShow = [];
    if (Array.isArray(gachaBanner.weapons) && gachaBanner.weapons.length > 0) {
      bannersToShow.push(...gachaBanner.weapons);
    } else if (gachaBanner.weapon) {
      bannersToShow.push(gachaBanner.weapon);
    }

    if (bannersToShow.length === 0) {
      return message.reply(`${config.emoji.no} Hiện tại không có banner gacha vũ khí nào đang diễn ra.`);
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

       const timeStr = expireDate.toFormat("HH:mm dd/MM/yyyy");
       const remaining = expireDate.diff(now, ["days", "hours", "minutes"]).toHuman({ listStyle: "short" });

       const embed = new EmbedBuilder()
         .setColor(getRarityColor(banner.rarity, "#FFD700"))
         .setTitle(formatRpgTitle(banner.bannerName, "🎴"))
         .setDescription("Banner giới hạn • Tỉ lệ và bảo hiểm áp dụng theo mùa hiện tại.")
         .addFields(
           { name: "Vũ khí nổi bật", value: `${banner.weaponEmoji} **${banner.weaponName}**`, inline: true },
           { name: "Độ hiếm", value: `${getRarityEmoji(banner.rarity)} **${banner.rarity}**`, inline: true },
           { name: "Kết thúc", value: `**${timeStr}**\nCòn khoảng **${remaining}**`, inline: false },
         )
         .setFooter(formatRpgFooter("Gacha vũ khí • dùng xgacha 1/10 hoặc xgacha banner"))
         .setTimestamp();

      if (banner.imageKey) {
        const itemPath = path.join(__dirname, "../../../assets/items", banner.imageKey);
        if (fs.existsSync(itemPath)) {
          const fileName = `banner_wp_${idx}.png`;
          const attachment = new AttachmentBuilder(itemPath, { name: fileName });
          files.push(attachment);
          embed.setImage(`attachment://${fileName}`);
        }
      } else if (banner.coverImage) {
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
      return message.reply(`${config.emoji.no} Tất cả banner gacha đã kết thúc hoặc không khả dụng.`);
    }

    const payload = { embeds };
    if (files.length > 0) {
      payload.files = files;
    }
    return message.reply(payload);
  }
}
module.exports = new BannerCommand();
