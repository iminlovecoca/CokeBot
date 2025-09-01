const User = require('../../models/User');

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

function getRankEmoji(level) {
  if (level <= 10) return '<:Common:1390024512774471902>';
  if (level <= 20) return '<:Uncommon:1390024590347997245>';
  if (level <= 30) return '<:Rare:1390024624380706916>';
  if (level <= 40) return '<:Epic:1390024749517770832>';
  if (level <= 50) return '<:Mysthic:1390024772200567026>';
  if (level <= 60) return '<:Legendary:1390024789279772833>';
  return '<:Ancient:1390024806535004333>';
}

module.exports = {
  name: 'rank',
  aliases: ['level', 'lvl'],
  description: '🔰 Xem cấp bậc rank và level',

  async execute(message) {
    const user = message.author;
    const displayName = message.member?.displayName || user.username;

    let userData = await User.findOne({ userId: user.id });
    if (!userData) {
      userData = await User.create({ userId: user.id, level: 1, xp: 0, coke: 0 });
    }

    const xpNeed = getXpNeeded(userData.level);
    const xpPercent = Math.floor((userData.xp / xpNeed) * 100);
    const progressBar =
      `▰`.repeat(Math.floor(xpPercent / 10)) +
      `▱`.repeat(10 - Math.floor(xpPercent / 10));

    const rankEmoji = getRankEmoji(userData.level);

    const output =
      `🔰 ${displayName}\n` +
      `Rank: ${rankEmoji}\n` +
      `Lvl ${userData.level} ${progressBar} ${xpPercent}%\n` +
      `XP: ${userData.xp} / ${xpNeed}`;

    return message.channel.send(output);
  }
};
