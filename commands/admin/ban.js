const User = require('../../models/User');

const ALLOWED_IDS = [
  process.env.OWNER_ID,
  '890141605460344902',
  '699999175437189121',
  '858603090289623100',
  '318943905326301185'
];

module.exports = {
  name: 'ban',
  description: 'Cấm người dùng sử dụng bot (chỉ Owner hoặc người được cấp quyền)',

  async execute(message, args) {
    const authorId = message.author.id;

    if (!ALLOWED_IDS.includes(authorId)) {
      return message.reply('❌ Bạn không có quyền dùng lệnh này!');
    }

    const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    const duration = parseFloat(args[1]);

    if (!target || isNaN(duration) || duration <= 0) {
      return message.reply('❌ Cú pháp: `!ban @user <số_giờ>` hoặc `!ban <userId> <số_giờ>` (VD: `!ban @user 2.5`)');
    }

    if (ALLOWED_IDS.includes(target.id)) {
      return message.reply('🚫 Bạn không thể cấm người quản trị bot!');
    }

    const bannedUntil = Date.now() + duration * 60 * 60 * 1000;

    await User.updateOne(
      { userId: target.id },
      { $set: { bannedUntil } },
      { upsert: true }
    );

    const until = `<t:${Math.floor(bannedUntil / 1000)}:F>`

    return message.reply(`🔒 Đã cấm <@${target.id}> sử dụng bot trong **${duration} giờ** (đến ${until}).`);
  }
};
