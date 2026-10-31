const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { getDailyDrops, getDailyResetCountdown } = require("../../../utils/dateUtil");
const { getEventStatus, isMonthlyEventActive } = require("../../../utils/eventUtil");
const { getAnimal } = require("../../../data/animals");
const { getRpgColor, formatRpgFooter, formatRpgTitle } = require("../../../utils/rpgUi");

class EventCommand extends BaseCommand {
  constructor() {
    super({
      name: "event",
      aliases: ["sukien", "events", "monthlyevent"],
      description: "Xem thông tin Sự Kiện Hàng Tháng, tiến độ nhận quà, linh thú giới hạn và danh sách phần thưởng.",
      usage: `${config.prefix}event`,
      examples: [
        { intent: "Xem thông tin sự kiện", command: `${config.prefix}event` },
        { intent: "Xem sự kiện bằng alias", command: `${config.prefix}sukien` },
      ],
      cooldown: 3,
    });
  }

  async execute(message) {
    const user = await getUser(message.author.id);
    const dailyDrops = getDailyDrops(user);
    const eventStatus = getEventStatus();
    const countdown = getDailyResetCountdown();

    const currentCount = Math.min(eventStatus.dailyCap, Number(dailyDrops.eventDropCount) || 0);
    const displayName = message.member?.displayName || message.author.username;

    const embed = new EmbedBuilder()
      .setColor(eventStatus.isActive ? (getRpgColor("Mythic") || "#e67e22") : "#7f8c8d")
      .setTitle(formatRpgTitle(`SỰ KIỆN HÀNG THÁNG • ${eventStatus.isActive ? "ĐANG DIỄN RA" : "CHƯA BẮT ĐẦU"}`, eventStatus.emoji));

    let desc = "";
    if (eventStatus.isActive) {
      desc = `🎉 **${eventStatus.name}** đang diễn ra! (Từ ngày **${eventStatus.startDateStr}** đến hết ngày **${eventStatus.endDateStr}**)\n` +
        `⏳ Thời gian còn lại: **${eventStatus.daysRemaining} ngày** (Mỗi tháng diễn ra 1 lần trong vòng 14 ngày).\n\n` +
        `🎁 **Tiến độ nhận quà hôm nay của bạn:** **${currentCount}/${eventStatus.dailyCap}** phần quà\n` +
        `⏱ Làm mới lượt nhận quà sau: \`${countdown.formatted}\`\n`;
    } else {
      desc = `⏳ **${eventStatus.name}** hiện chưa bắt đầu.\n` +
        `📅 Dự kiến mở lại: **${eventStatus.nextStartDateStr}** (Từ ngày 1 đến ngày 14 hàng tháng).\n\n` +
        `🎁 Trong thời gian mở sự kiện, bạn có thể nhận tối đa **10 phần quà/ngày** khi đi săn thú (\`${config.prefix}hunt\`) và chiến đấu (\`${config.prefix}battle\`)!\n`;
    }

    embed.setDescription(desc);

    // Active Generation Event Pets
    const petLines = (eventStatus.activePetKeys || [])
      .map((k) => {
        const pet = getAnimal(k);
        if (!pet) return null;
        return `• ${pet.emoji} **${pet.name}** (<a:Generation:1563835095541092352> Bậc Thế Hệ) - *${pet.role || "Chiến thú sự kiện"}*`;
      })
      .filter(Boolean)
      .join("\n");

    if (petLines) {
      embed.addFields({
        name: "🐾 Linh Thú Thế Hệ Giới Hạn Tháng Này",
        value: `${petLines}\n` +
          `⚠️ *Chỉ xuất hiện khi đi săn (\`${config.prefix}hunt\`) hoặc rơi từ quà sự kiện trong 14 ngày diễn ra sự kiện. Nếu bỏ lỡ, bạn sẽ không còn cơ hội tìm thấy linh thú này nữa!*`,
        inline: false,
      });
    }

    // Rewards Pool Info
    const rewardsInfo =
      `• <:cokecy:1509951335016173662> **1,000 - 5,000 Coke:** Ngẫu nhiên mỗi lần rơi.\n` +
      `• <:danisa:1404057793920635043> **Bánh Danisa:** 1 hộp bánh thơm ngon dùng tặng bạn bè hoặc tự thưởng.\n` +
      `• 🔺 **Ngọc Đặc Biệt (Special Gem):** Ngọc hình tam giác ngẫu nhiên (từ Common đến Divine) gia tăng tỉ lệ bắt thú Thần Thoại & Bí Mật.\n` +
      `• <:lootbox:1563961108727992470> **Hộp Quà (Lootbox):** 1 - 2 hộp mở thú và trang bị.\n` +
      `• <:crate:1512793698025603282> **Hộp Vũ Khí (Weapon Crate):** 1 - 2 hộp nâng cấp vũ khí.\n` +
      `• <:key:1516398711712911461> **Chìa khóa Phó bản (Dungeon Key):** 1 chìa khóa khiêu chiến phó bản cùng tổ đội.\n` +
      `• 🌟 **Jackpot Linh Thú Thế Hệ:** Cơ hội trực tiếp nhận 1 trong 2 linh thú sự kiện giới hạn tháng này!`;

    embed.addFields({
      name: "🎁 Danh Sách Phần Quà Rơi Ngẫu Nhiên",
      value: rewardsInfo,
      inline: false,
    });

    // Special Rules
    embed.addFields({
      name: "📜 Quy Tắc & Cơ Chế Đặc Biệt",
      value:
        `• **Cách nhận:** Gõ \`${config.prefix}hunt\` hoặc \`${config.prefix}battle\` (tỉ lệ rơi ~${eventStatus.dropChancePct}% mỗi lượt, tối đa ${eventStatus.dailyCap} quà/ngày).\n` +
        `• **Cơ chế Ngọc Đặc Biệt (🔺):** Chỉ có thể kích hoạt và phát huy sức mạnh khi sự kiện đang diễn ra. Khi hết 14 ngày sự kiện, ngọc trong túi đồ sẽ được giữ nguyên; ngọc đang gắn trên người sẽ **tự động ẩn đi & bảo lưu độ bền**, và sẽ **tự động kích hoạt trở lại** khi sự kiện tháng sau mở!`,
      inline: false,
    });

    embed.setFooter(formatRpgFooter(`Gõ ${config.prefix}hunt hoặc ${config.prefix}battle để tham gia sự kiện`));
    return message.reply({ embeds: [embed] });
  }
}

module.exports = new EventCommand();
