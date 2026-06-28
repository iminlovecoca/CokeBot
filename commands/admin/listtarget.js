const { EmbedBuilder } = require("discord.js");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");

const BaseCommand = require('../../core/BaseCommand');

class ListtargetCommand extends BaseCommand {
  constructor() {
    super({
  name: "listtarget",
  aliases: ["listtargets", "eventtargets", "targetlist"],
  description: "Xem danh sách các mã loại yêu cầu (targets) có thể sử dụng khi tạo sự kiện (Chỉ Admin)",
  usage: `${config.prefix}listtarget`,
        cooldown: 0
    });
  }

  async execute(message, args = []) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      return message.reply("❌ Bạn không có quyền sử dụng lệnh này!");
    }

    const embed = new EmbedBuilder()
      .setColor("#9B59B6")
      .setTitle("🎯 DANH SÁCH MÃ YÊU CẦU SỰ KIỆN (EVENT TARGETS)")
      .setDescription(
        "Khi cấu hình ô **Yêu cầu (Format: loai,target,phu)** trong lệnh `xsetevent`, Admin có thể sử dụng các loại yêu cầu dưới đây:"
      )
      .addFields(
        {
          name: "1. Tham gia hạ gục Boss thế giới",
          value: "▫️ Mã loại: `boss_fight`\n▫️ Format: `boss_fight,target`\n▫️ Ví dụ: `boss_fight,3` (Tham gia đánh boss 3 lần)",
          inline: false,
        },
        {
          name: "2. Dứt điểm Boss thế giới",
          value: "▫️ Mã loại: `boss_last_hit`\n▫️ Format: `boss_last_hit,target`\n▫️ Ví dụ: `boss_last_hit,1` (Kết liễu boss 1 lần)",
          inline: false,
        },
        {
          name: "3. Đứng đầu danh sách RPG (BXH Lực chiến)",
          value: "▫️ Mã loại: `rpg_top_leaderboard`\n▫️ Format: `rpg_top_leaderboard,target` (target luôn là 1)\n▫️ Ví dụ: `rpg_top_leaderboard,1` (Đứng top 1 lực chiến RPG)",
          inline: false,
        },
        {
          name: "4. Chiến thắng Dungeon theo chương",
          value: "▫️ Mã loại: `dungeon_win`\n▫️ Format: `dungeon_win,target,chapter` (chapter từ 1 đến 6)\n▫️ Ví dụ: `dungeon_win,1,6` (Vượt ải thành công chương 6)",
          inline: false,
        },
        {
          name: "💡 Mẹo của Admin",
          value: "▫️ Nếu muốn sự kiện nhận ngay mà **không cần làm nhiệm vụ**, hãy **để trống** hoặc ghi `none` trong ô Yêu cầu.\n▫️ Cần nhập chính xác dấu phẩy `,` ngăn cách các tham số.",
          inline: false,
        }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
    }
}

module.exports = new ListtargetCommand();
