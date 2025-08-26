const { DateTime } = require('luxon');
const User = require('../../models/User');

module.exports = {
  name: 'daily',
  async execute(message) {
    try {
      const userId = message.author.id;
      const member = await message.guild.members.fetch(userId);
      const name = member.displayName;

      let user = await User.findOne({ userId });
      if (!user) {
        user = await User.create({
          userId,
          coke: 0,
          dailyStreak: 0,
          level: 1,
          xp: 0,
          lastDaily: null
        });
      }

      const now = DateTime.now().setZone('Asia/Ho_Chi_Minh');
      const today = now.startOf('day');
      const lastClaim = user.lastDaily
        ? DateTime.fromJSDate(user.lastDaily).setZone('Asia/Ho_Chi_Minh').startOf('day')
        : null;

      if (lastClaim && lastClaim.equals(today)) {
        const nextClaim = today.plus({ days: 1 });
        const diff = nextClaim.diff(now, ['hours', 'minutes', 'seconds']).toObject();
        const h = Math.floor(diff.hours);
        const m = Math.floor(diff.minutes);
        const s = Math.floor(diff.seconds);

        return message.reply(`⏱ | **${name}**, cần đợi **${h}H ${m}M ${s}S** để nhận.`);
      }

      let streak = 1;
      if (lastClaim) {
        const daysDiff = today.diff(lastClaim, 'days').days;
        if (daysDiff === 1) {
          streak = user.dailyStreak + 1;
        }
      }

      let reward = 1000 + streak * 500;
      if (reward > 10000) reward = 10000;

      user.coke += reward;
      user.dailyStreak = streak;
      user.lastDaily = new Date();

      user.xp = Math.min((user.xp || 0) + 500, 3000);

      const getXpNeeded = level => 2000 + (level - 1) * 1000;
      while (user.xp >= getXpNeeded(user.level)) {
        user.xp -= getXpNeeded(user.level);
        user.level++;
        user.coke += 2000;
      }

      await user.save();

      return message.reply(`:dollar: | **${name}** đã nhận được **${reward.toLocaleString()} coke**!\n🔥 Chuỗi ngày: **${streak} ngày**`);
    } catch (err) {
      console.error('Daily error:', err);
      return message.reply('❌ | Đã xảy ra lỗi khi thực hiện lệnh.');
    }
  }
};
