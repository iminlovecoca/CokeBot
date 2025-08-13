const User = require('../../models/User');

// Danh sách người được phép dùng lệnh ban
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

    // Kiểm tra quyền
    if (!ALLOWED_IDS.includes(authorId)) {
      return message.reply('❌ Bạn không có quyền dùng lệnh này!');
    }

    // Lấy người bị ban: mention hoặc ID
    const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    const duration = parseFloat(args[1]);

    // Kiểm tra cú pháp và tồn tại người dùng
    if (!target || isNaN(duration) || duration <= 0) {
      return message.reply('❌ Cú pháp: `!ban @user <số_giờ>` hoặc `!ban <userId> <số_giờ>` (VD: `!ban @user 2.5`)');
    }

    // Không cho ban người trong danh sách ALLOWED_IDS
    if (ALLOWED_IDS.includes(target.id)) {
      return message.reply('🚫 Bạn không thể cấm người quản trị bot!');
    }

    // Tính thời gian ban (miligiây)
    const bannedUntil = Date.now() + duration * 60 * 60 * 1000;

    await User.updateOne(
      { userId: target.id },
      { $set: { bannedUntil } },
      { upsert: true }
    );

    const until = `<t:${Math.floor(bannedUntil / 1000)}:F>`; // timestamp Discord

    return message.reply(`🔒 Đã cấm <@${target.id}> sử dụng bot trong **${duration} giờ** (đến ${until}).`);
  }
};
