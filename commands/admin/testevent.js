const { EmbedBuilder } = require("discord.js");
const Event = require("../../models/Event");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");

module.exports = {
  name: "testevent",
  description: "Tạo nhanh một sự kiện thử nghiệm có thời hạn 10 phút để kiểm tra tính năng sự kiện (Chỉ Admin)",
  usage: `${config.prefix}testevent`,
  async execute(message, args = []) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      return message.reply("❌ Bạn không có quyền sử dụng lệnh này!");
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const event = await Event.create({
      name: "Sự Kiện Thử Nghiệm 🧪",
      description: "Sự kiện thử nghiệm hệ thống. Yêu cầu tham gia đấu PvP 1 lần để hoàn thành và nhận thưởng.",
      expiresAt,
      requirement: {
        type: "pvp_battle",
        target: 1
      },
      rewards: {
        coke: 10000,
        gear: {
          rank: "Epic",
          type: "weapon",
          name: "longsword"
        },
        other: {
          name: "dungeonkey",
          quantity: 1
        }
      }
    });

    const embed = new EmbedBuilder()
      .setColor("#3498DB")
      .setTitle("🧪 Đã Tạo Sự Kiện Thử Nghiệm!")
      .setDescription(`Sự kiện thử nghiệm đã được đưa vào hệ thống. Hãy gõ lệnh \`${config.prefix}event\` để xem tiến trình và nhận thưởng sau khi làm xong yêu cầu.`)
      .addFields(
        { name: "Tên sự kiện", value: event.name },
        { name: "Yêu cầu", value: "Đấu PvP 1 lần (`xpvp @user <coke>`)" },
        { name: "Hết hạn lúc", value: `<t:${Math.floor(event.expiresAt.getTime() / 1000)}:R>` },
        {
          name: "Phần thưởng",
          value: `• Coke: **+10,000**\n` +
                 `• Trang bị: **[Epic] longsword (weapon)**\n` +
                 `• Khác: **dungeonkey** x1`
        }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
