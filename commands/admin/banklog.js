const User = require('../../models/User');

module.exports = {
  name: 'banklog',
  description: '📊 Xem top số dư ngân hàng (chỉ dành cho owner)',

  async execute(message) {
    const ownerId = '745950731638407210';
    if (message.author.id !== ownerId) {
      return message.reply('❌ | Chỉ **owner** mới được dùng lệnh này.');
    }

    const users = await User.find({ bank: { $gt: 0 } })
      .sort({ bank: -1 })
      .limit(30);

    if (users.length === 0) {
      return message.reply('❌ Không có ai có tiền trong ngân hàng.');
    }

    let text = '```md\n< Top Ngân Hàng >\n\n';
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const fetchedUser = await message.client.users.fetch(u.userId).catch(() => null);
      const username = fetchedUser ? `@${fetchedUser.username}` : 'Ẩn danh';
      text += `#${i + 1}\t${username}\n\t\tBank: ${u.bank.toLocaleString()} coke\n`;
    }

    const now = new Date();
    const dateStr = now.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    text += `\n${dateStr}\n\`\`\``;
    return message.channel.send(text);
  }
};
