const { DateTime } = require('luxon');
const { getUser } = require('../../utils/userUtil');
const config = require('../../data/config');

module.exports = {
  name: 'daily',
  description: 'Nhận phần thưởng coke hàng ngày.',
  usage: `${config.prefix}daily`,
  examples: [
    { intent: 'Nhận phần thưởng hàng ngày', command: `${config.prefix}daily` }
  ],
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

    const nextClaim = today.plus({ days: 1 });
    const diff = nextClaim.diff(now, ['hours', 'minutes', 'seconds']).toObject();
    const h = Math.floor(diff.hours);
    const m = Math.floor(diff.minutes);
    const s = Math.floor(diff.seconds);

    if (lastClaim && lastClaim.equals(today)) {
      return message.reply(`⏱️ **|** **${name}**, your next daily is in: **${h}H ${m}M ${s}S**`);
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

    // Add 1 wc item to user inventory
    if (!user.inventory) {
      user.inventory = new Map();
    }
    const currentWc = user.inventory.get("wc") || 0;
    user.inventory.set("wc", currentWc + 1);
    user.markModified("inventory");

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

    let responseText = `💰 **|** **${name}**, Here is your daily ${config.emoji.money} **${reward.toLocaleString()}** Coke!\n`;
    if (brokeStreak) {
      responseText += `${config.emoji.fireBreak} **|** Bạn đã mất chuỗi, bắt đầu lại từ đầu!\n`;
    } else {
      responseText += `   **|** You're on a **${streak}** daily streak! ${streakEmoji}\n`;
    }
    responseText += `📦 **|** You received a **lootbox**!\n`;
    responseText += `⏱️ **|** Your next daily is in: **${h}H ${m}M ${s}S**`;

    if (milestoneMessage) {
      responseText += `\n\n${milestoneMessage}`;
    }

    return message.reply(responseText);
  }
};
