const User = require('../models/User');
const { Events } = require('discord.js');

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

function getRankEmoji(level) {
  if (level >= 61) return '<:Ancient:1390024806535004333>';
  if (level >= 51) return '<:Legendary:1390024789279772833>';
  if (level >= 41) return '<:Mysthic:1390024772200567026>';
  if (level >= 31) return '<:Epic:1390024749517770832>';
  if (level >= 21) return '<:Rare:1390024624380706916>';
  if (level >= 11) return '<:Uncommon:1390024590347997245>';
  return '<:Common:1390024512774471902>';
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    const userId = message.author.id;
    const user = await User.findOne({ userId }) || await User.create({
      userId, level: 1, xp: 0, coke: 0, dailyXp: 0
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const last = user.lastXpReset ? user.lastXpReset.toISOString().split('T')[0] : null;

    if (last !== today) {
      user.dailyXp = 0;
      user.lastXpReset = now;
    }

    if (user.dailyXp >= 3000) return;

    const gain = Math.min(10, 3000 - user.dailyXp);
    user.xp += gain;        
    user.dailyXp += gain;  

    let leveledUp = false;
    let oldLevel = user.level;
    let totalReward = 0;

    while (user.xp >= getXpNeeded(user.level)) {
      user.xp -= getXpNeeded(user.level);
      user.level++;
      const reward = 10000 + (user.level - 1) * 5000;
      totalReward += reward;
      user.coke += reward;
      leveledUp = true;
    }

    await user.save();

    if (leveledUp) {
      const emoji = getRankEmoji(user.level);
      message.channel.send(
        `🎉 **Chúc mừng <@${userId}> đã lên cấp!**\n` +
        `📈 Level: \`${oldLevel} → ${user.level}\`\n` +
        `💰 Thưởng: \`${totalReward.toLocaleString()} coke\`\n` +
        `🏅 Rank: ${emoji}`
      );
    }
  }
};
