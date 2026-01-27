const { DateTime } = require('luxon');
const { getUser } = require('../../utils/userUtil');
const config = require('../../data/config');

module.exports = {
  name: 'daily',
  async execute(message) {
    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId);
    const name = member.displayName;
    let user = await getUser(userId)

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

      return message.reply(`⏱ **|** **${name}**, cần đợi **${h}H ${m}M ${s}S** để nhận.`);
    }

    let streak = 1;
    let brokeStreak = false;
    if (lastClaim) {
      const daysDiff = today.diff(lastClaim, 'days').days;
      if (daysDiff === 1) {
        streak = user.dailyStreak + 1;
      } else if (daysDiff > 1) {
        brokeStreak = true;
        streak = 1;
      }
    }

    let reward = 1000 + streak * 500;
    if (reward > 10000) reward = 10000;

    user.coke += reward;
    user.dailyStreak = streak;
    user.lastDaily = new Date();

    user.xp += 500;
    const getXpNeeded = level => 2000 + (level - 1) * 1000;
    while (user.xp >= getXpNeeded(user.level)) {
      user.xp -= getXpNeeded(user.level);
      user.level++;
      user.coke += 2000;
    }

    const milestones = Object.keys(config.emoji.streakMilestones)
      .map(Number)
      .sort((a, b) => a - b);

    let streakEmoji = config.emoji.fireBreak; 
    if (!brokeStreak) {
      for (const milestone of milestones) {
        if (streak >= milestone) {
          streakEmoji = config.emoji.streakMilestones[milestone];
        } else break;
      }
    }

    let milestoneMessage = '';
    if (!brokeStreak && milestones.includes(streak)) {
      milestoneMessage = `🎉 **|** Xin chúc mừng **${name}** đã đạt **${streak} ngày** liên tiếp! ${streakEmoji}`;
    }

    await user.save();

    if (brokeStreak) {
      return message.reply(
        `${config.emoji.money} **|** **${name}** đã nhận được **${reward.toLocaleString()} coke**!\n` +
        `${config.emoji.fireBreak} **|** Bạn đã mất chuỗi, bắt đầu lại từ đầu!`
      );
    }

    return message.reply(
      `${config.emoji.money} **|** **${name}** đã nhận được **${reward.toLocaleString()} coke**!\n` +
      `${streakEmoji} **|** Chuỗi ngày: **${streak} ngày**\n` +
      (milestoneMessage ? `\n${milestoneMessage}` : '')
    )
  }
};
