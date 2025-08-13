const User = require('../../models/User');

module.exports = {
  name: 'banklog',
  description: '📊 Xem lịch sử bank và chuyển tiền (chỉ dành cho owner)',
  async execute(message, args) {
    const ownerId = '745950731638407210'; // Thay bằng ID Discord của bạn
    if (message.author.id !== ownerId) {
      return message.reply('❌ | Chỉ **owner** mới được dùng lệnh này.');
    }

    const type = args[0]?.toLowerCase();

    if (!type || !['bank', 'give'].includes(type)) {
      return message.reply(
        '❓ | Cú pháp:\n' +
        '`!banklog bank` — Xem danh sách số dư ngân hàng\n' +
        '`!banklog give` — Xem lịch sử chuyển tiền theo ngày'
      );
    }

    if (type === 'bank') {
      const users = await User.find({ bank: { $gt: 0 } }).sort({ bank: -1 }).limit(30);
      if (users.length === 0) return message.reply('❌ Không có ai có tiền trong ngân hàng.');

      let text = '```md\n< TOP Người có tiền trong ngân hàng >\n\n';
      for (const u of users) {
        const username = (await message.client.users.fetch(u.userId).catch(() => null))?.username || 'Ẩn danh';
        text += `${username.padEnd(20)} | ${u.bank.toLocaleString()} coke\n`;
      }
      text += '```';
      return message.channel.send(text);
    }

    if (type === 'give') {
      const users = await User.find({});
      const giveLogs = {};

      for (const u of users) {
        const give = u.dailyGive || {};
        for (const date in give) {
          if (!giveLogs[date]) giveLogs[date] = 0;
          giveLogs[date] += give[date];
        }
      }

      if (Object.keys(giveLogs).length === 0) return message.reply('❌ Không có dữ liệu chuyển tiền.');

      const sortedDates = Object.keys(giveLogs).sort((a, b) => new Date(b) - new Date(a));
      let text = '```md\n< Lịch sử chuyển tiền theo ngày >\n\n';
      for (const date of sortedDates) {
        text += `📅 ${date} : ${giveLogs[date].toLocaleString()} coke\n`;
      }
      text += '```';
      return message.channel.send(text);
    }
  }
};
