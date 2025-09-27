const User = require('../../models/User');

const OWNER_ID = process.env.OWNER_ID;
const ALLOWED_IDS = process.env.ALLOWED_IDS ? process.env.ALLOWED_IDS.split(',') : [];

module.exports = {
  name: 'resetbank',
  description: 'Reset số dư bank về 0 cho 1 người hoặc tất cả',
  async execute(message, args) {
    const authorId = message.author.id;

    if (![OWNER_ID, ...ALLOWED_IDS].includes(authorId)) {
      return message.reply('❌ | Bạn không có quyền dùng lệnh này!');
    }

    if (!args[0]) {
      return message.reply('❌ | Cú pháp: `!resetbank all` hoặc `!resetbank <@user|userId>`');
    }

    if (args[0].toLowerCase() === 'all') {
      await User.updateMany({}, { $set: { bank: 0 } });
      return message.reply('🏦 | Đã reset toàn bộ **bank** của tất cả user về 0.');
    }

    const target =
      message.mentions.users.first() ||
      (await message.client.users.fetch(args[0]).catch(() => null));

    if (!target) {
      return message.reply('❌ | Không tìm thấy user.');
    }

    await User.updateOne({ userId: target.id }, { $set: { bank: 0 } }, { upsert: true });

    return message.reply(`🏦 | Đã reset **bank** của <@${target.id}> về 0.`);
  },
};
