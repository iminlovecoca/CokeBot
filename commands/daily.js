const User = require('../models/User');

module.exports = {
  name: 'daily',
  async execute(message) {
    const userId = message.author.id;
    const name = message.author.username;
    let user = await User.findOne({ userId });
    const now = new Date();

    if (!user) {
      user = await User.create({ userId, dailyStreak: 0 });
    }

    const last = user.lastDaily || new Date(0);
    const diffMs = now - last;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Nếu chưa đến 24h thì hiển thị đếm ngược giống ảnh mẫu
    if (diffHours < 24) {
      const remaining = 24 * 60 * 60 * 1000 - diffMs;
      const h = Math.floor(remaining / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((remaining % (1000 * 60)) / 1000);

      return message.reply(`⏱ | **${name}**, cần đợi **${h}H ${m}M ${s}S** để nhận.`);
    }

    // Kiểm tra mất chuỗi
    const chainExpired = diffHours > 48;
    if (chainExpired) user.dailyStreak = 1;
    else user.dailyStreak = (user.dailyStreak || 0) + 1;

    // Tính phần thưởng
    let reward = 500 + (user.dailyStreak - 1) * 210;
    if (reward > 10000) reward = 10000;

    user.coke += reward;
    user.lastDaily = now;
    await user.save();

    const formattedReward = reward.toLocaleString('en-US');
    const emoji = '<:Economy_Cowoncy:1386429292883214397>';

    return message.reply(
      `${emoji} | **${name}** đã nhận được **${formattedReward} coke**!\n🔥 Chuỗi ngày: **${user.dailyStreak} ngày**`
    );
  }
};
