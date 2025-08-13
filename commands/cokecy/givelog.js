const User = require('../../models/User');

module.exports = {
  name: 'givelog',
  description: '📜 Xem lịch sử chuyển và nhận coke trong 30 ngày gần nhất',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const isOwner = message.author.id === process.env.OWNER_ID;

    if (target.id !== message.author.id && !isOwner) {
      return message.reply('❌ Bạn chỉ có thể xem lịch sử của chính mình.');
    }

    const user = await User.findOne({ userId: target.id });
    if (!user) return message.reply('❌ Người dùng này chưa có tài khoản.');

    const transferLog = (user.transferHistory || []).filter(t => {
      const date = new Date(t.date);
      return Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000; // 30 ngày
    }).slice(-20).reverse();

    const receiveLog = (user.receiveHistory || []).filter(r => {
      const date = new Date(r.date);
      return Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).slice(-20).reverse();

    const formatLine = (name, amt, date) =>
      `${name} | ${amt.toLocaleString()} | ${date.toLocaleString('vi-VN')}`;

    let text = `\`\`\`md\n< Giao dịch gần đây của ${target.username} >\n`;

    text += '\n[🔁 Chuyển tiền]:\n';
    if (transferLog.length === 0) text += 'Không có.\n';
    else {
      for (const t of transferLog) {
        const userTo = await message.client.users.fetch(t.to).catch(() => null);
        text += formatLine(userTo?.username || 'Ẩn danh', t.amount, new Date(t.date)) + '\n';
      }
    }

    text += '\n[💰 Nhận tiền]:\n';
    if (receiveLog.length === 0) text += 'Không có.\n';
    else {
      for (const r of receiveLog) {
        const userFrom = await message.client.users.fetch(r.from).catch(() => null);
        text += formatLine(userFrom?.username || 'Ẩn danh', r.amount, new Date(r.date)) + '\n';
      }
    }

    text += '```';

    return message.channel.send(text);
  }
};
