const User = require('../../models/User');

const ALLOWED_IDS = [
  process.env.OWNER_ID,
  '890141605460344902',
  '699999175437189121',
  '858603090289623100',
  '318943905326301185'
];

module.exports = {
  name: 'unban',
  description: 'Gỡ cấm người dùng khỏi bot (chỉ Owner hoặc người được cấp quyền)',

  async execute(message, args) {
    const authorId = message.author.id;

    if (!ALLOWED_IDS.includes(authorId)) {
      return message.reply('❌ Bạn không có quyền dùng lệnh này!');
    }

    const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
    if (!target) {
      return message.reply('❌ Không tìm thấy người dùng.');
    }

    const user = await User.findOne({ userId: target.id });
    if (!user || !user.bannedUntil) {
      return message.reply('❌ Người dùng này hiện không bị cấm.');
    }

    await User.updateOne(
      { userId: target.id },
      {
        $set: {
          bannedUntil: null,
          bannedReason: '',
          warned: false,
          warnedAt: null
        }
      }
    );


    return message.reply(`✅ Đã gỡ cấm <@${target.id}> khỏi bot.`);
  }
};
