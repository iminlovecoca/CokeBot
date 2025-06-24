const User = require('../models/User');

module.exports = {
  name: 'top',
  description: 'Xem bảng xếp hạng người có nhiều coke nhất trong server',
  async execute(message, args) {
    const limit = (!args[0] || isNaN(args[0])) ? 5 : Math.min(parseInt(args[0]), 50);

    // Lấy top users toàn bộ server
    const topUsers = await User.find({})
      .sort({ coke: -1 });

    if (!topUsers || topUsers.length === 0) {
      return message.reply('Không có dữ liệu người chơi nào.');
    }

    // Tìm thứ hạng người gọi lệnh
    const authorId = message.author.id;
    const userRankIndex = topUsers.findIndex(u => u.userId === authorId);
    const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
    const userCoke = userRankIndex >= 0 ? topUsers[userRankIndex].coke.toLocaleString() : null;

    let text = '```md\n< Top ' + limit + ' Coke Rankings >\n';
    if (userRank) {
      text += `> Xếp hạng: ${userRank}\n> Coke: ${userCoke}\n\n`;
    }

    for (let i = 0; i < Math.min(limit, topUsers.length); i++) {
      const u = topUsers[i];
      const fetchedUser = await message.client.users.fetch(u.userId).catch(() => null);
      const username = fetchedUser ? `@${fetchedUser.username}` : 'Người chơi đã rời';
      const coke = u.coke.toLocaleString();

      if (i === 0 && fetchedUser) {
        // người đứng đầu có link in đậm
        text += `#${i + 1}\t${username}\n\tCoke: ${coke}\n`;
      } else {
        text += `#${i + 1}\t${username}\n\tCoke: ${coke}\n`;
      }
    }

    const now = new Date();
    const dateStr = now.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      month: '2-digit', day: '2-digit', year: 'numeric',
      hour12: false, hour: '2-digit', minute: '2-digit'
    });

    text += `${dateStr}\n\`\`\``;
    return message.channel.send(text);
  }
};
