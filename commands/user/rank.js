const User = require('../../models/User')
const { getUserXpNeeded, getRankEmoji } = require('../../utils/userUtil')

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

    const xpNeed = getUserXpNeeded(userData.level);
    const xpPercent = Math.floor((userData.xp / xpNeed) * 100);
    const progressBar =
      `▰`.repeat(Math.floor(xpPercent / 10)) +
      `▱`.repeat(10 - Math.floor(xpPercent / 10));

    const rankEmoji = getRankEmoji(userData.level);

    const output =
      `🔰 **${displayName}** 🔰\n` +
      `**Rank **|** ${rankEmoji}\n` +
      `XP \t**|** ${userData.xp} / ${xpNeed}\n` +
      `Level ${userData.level} ${progressBar} ${xpPercent}%**`;

    return message.channel.send(output);
  }
};
