const User = require('../../models/User');

module.exports = {
  name: 'setlvl',
  description: '📌 Chỉ owner mới có thể chỉnh cấp độ người chơi (có thể set/gỡ VIP)',

  async execute(message, args) {
    const ownerId = '745950731638407210';
    if (message.author.id !== ownerId) {
      return message.reply('❌ | Lệnh này chỉ dành cho **owner**.');
    }

    const [mention, levelStr, flag] = args;
    const level = parseInt(levelStr);
    const target = message.mentions.users.first();

    if (!target || isNaN(level) || level <= 0) {
      return message.reply('❌ | Dùng đúng cú pháp: `!setlvl @user <level> [vip/novip]`');
    }

    const userData = await User.findOneAndUpdate(
      { userId: target.id },
      { $set: { level: level, xp: 0 } },
      { new: true, upsert: true }
    );

    let cokeReward = 0;
    for (let i = 1; i <= level; i++) {
      cokeReward += 10000 + (i - 1) * 5000;
    }

    userData.coke += cokeReward;

    let vipNote = '';
    if (flag?.toLowerCase() === 'vip') {
      userData.vipLevel = 1;
      vipNote = '<:Vip:1395101517421215744> Gán thêm quyền **VIP**.';
    } else if (flag?.toLowerCase() === 'novip') {
      userData.vipLevel = 0;
      vipNote = '🚫 Đã **gỡ quyền VIP**.';
    }

    await userData.save();

    return message.reply(
      `✅ | Đã đặt **level ${level}** cho **${target.username}**.\n` +
      `💰 Thưởng thêm **${cokeReward.toLocaleString()} coke** (cộng vào số dư hiện tại).\n` +
      (vipNote ? vipNote : '')
    );
  }
};
