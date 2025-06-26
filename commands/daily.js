const User = require('../models/User');

module.exports = {
  name: 'daily',
  async execute(message) {
    const userId = message.author.id;
    const name = message.author.username;

    let user = await User.findOne({ userId });

    // Tạo mới nếu chưa có
    if (!user) {
      user = await User.create({ userId, dailyStreak: 0, coke: 0 });
    } else {
      if (isNaN(user.coke)) user.coke = 0;
      if (isNaN(user.dailyStreak)) user.dailyStreak = 0;
    }

    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const nowDate = new Date(now);
    const lastDate = user.lastDaily
      ? new Date(new Date(user.lastDaily).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }))
      : new Date(0);

    const isSameDay = (
      nowDate.getFullYear() === lastDate.getFullYear() &&
      nowDate.getMonth() === lastDate.getMonth() &&
      nowDate.getDate() === lastDate.getDate()
    );

    // Nếu chưa sang ngày mới
    if (isSameDay) {
      // Tính thời gian còn lại
      const nextDay = new Date(nowDate);
      nextDay.setDate(nowDate.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      const remaining = nextDay - nowDate;

      const h = Math.floor(remaining / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((remaining % (1000 * 60)) / 1000);

      return message.reply(`⏱ | **${name}**, cần đợi **${h}H ${m}M ${s}S** để nhận.`);
    }

    // Nếu cách ngày trước hơn 2 ngày thì reset chuỗi
    const diffDays = Math.floor((nowDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      user.dailyStreak = 1;
    } else {
      user.dailyStreak += 1;
    }

    // Tính phần thưởng
    let reward = 500 + (user.dailyStreak - 1) * 210;
    if (reward > 10000) reward = 10000;

    user.coke += reward;
    user.lastDaily = new Date(); // lưu theo UTC
    await user.save();

    const formattedReward = reward.toLocaleString('en-US');
    const emoji = '<:Economy_Cowoncy:1386429292883214397>';

    return message.reply(
      `${emoji} | **${name}** đã nhận được **${formattedReward} coke**!\n🔥 Chuỗi ngày: **${user.dailyStreak} ngày**`
    );
  }
};
