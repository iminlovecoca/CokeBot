const User = require('../models/User');

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

async function processXp(message) {
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
    await user.save();
  }

  if (user.dailyXp >= 3000) return;

  const gain = Math.min(10, 3000 - user.dailyXp);
  const updatedUser = await User.findOneAndUpdate(
    { userId },
    { $inc: { xp: gain, dailyXp: gain } },
    { new: true }
  );

  let oldLevel = user.level;
  let currentLevel = updatedUser.level;
  let currentXp = updatedUser.xp;
  let totalReward = 0;
  let leveledUp = false;

  if (currentXp >= getXpNeeded(currentLevel)) {
    currentXp -= getXpNeeded(currentLevel);
    currentLevel++;
    totalReward += 5000 + (currentLevel - 1) * 2000;
    leveledUp = true;
  }

  if (leveledUp) {
    await User.updateOne(
      { userId },
      {
        $set: { level: currentLevel, xp: currentXp },
        $inc: { coke: totalReward }
      }
    );
    
    const emoji = getRankEmoji(currentLevel)
    message.channel.send(
      `🎉 **Chúc mừng <@${userId}> đã lên cấp!**\n` +
      `📈 Level: \`${oldLevel} → ${currentLevel}\`\n` +
      `💰 Thưởng: \`${totalReward.toLocaleString()} coke\`\n` +
      `🏅 Rank: ${emoji}`
    );
  }
}

module.exports = { processXp }
