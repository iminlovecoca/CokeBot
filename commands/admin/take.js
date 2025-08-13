const User = require('../../models/User');
const { formatVNCurrency } = require('../../utils/format')

const ALLOWED_IDS = [
  process.env.OWNER_ID,
  '858603090289623100',
];

module.exports = {
  name: 'take',
  description: 'Rút coke từ người dùng (chỉ Owner hoặc người được cấp quyền)',

  async execute(message, args) {
    const authorId = message.author.id;
    if (!ALLOWED_IDS.includes(authorId)) {
      return message.reply('❌ Bạn không có quyền dùng lệnh này!');
    }

    const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply('❌ Cú pháp đúng: `!take @user <số coke>` (VD: `!take @user 10000`)');
    }

    const user = await User.findOne({ userId: target.id });
    if (!user) return message.reply('❌ Không tìm thấy người dùng trong hệ thống.');

    let taken = 0;

    if (user.coke >= amount) {
      user.coke -= amount;
      taken = amount;
    } else {
      const total = user.coke + user.bank;
      if (total < amount) return message.reply('❌ Người này không đủ coke để bị trừ.');

      taken = amount;
      const fromBank = amount - user.coke;
      user.coke = 0;
      user.bank -= fromBank;
    }

    await user.save();

    return message.reply(`💸 Đã thu hồi **${formatVNCurrency(taken)} coke** từ **<@${target.id}>**.`);
  }
};
