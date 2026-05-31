const config = require('../../data/config')
const { getUser } = require('../../utils/userUtil')
const { getUserXpNeeded, getRankEmoji } = require('../../utils/userUtil')

module.exports = {
  name: 'rank',
  aliases: ['level', 'lvl'],
  description: '🔰 Xem cấp bậc rank và level',
  usage: `${config.prefix}rank`,
  examples: [
    { intent: 'Xem thông tin level và rank của bạn', command: `${config.prefix}rank` }
  ],

  async execute(message) {
    const displayName = message.member?.displayName || message.author.username;
    let user = await getUser(message.author.id);
    const xpNeed = getUserXpNeeded(user.level);
    const xpPercent = Math.floor((user.xp / xpNeed) * 100);
    const progressBar =
      `▰`.repeat(Math.floor(xpPercent / 10)) +
      `▱`.repeat(10 - Math.floor(xpPercent / 10));

    const rankEmoji = getRankEmoji(user.level);

    const output =
      `🔰 **${displayName}** 🔰\n` +
      `**Rank **|** ${rankEmoji}\n` +
      `XP \t**|** ${user.xp} / ${xpNeed}\n` +
      `Level ${user.level} ${progressBar} ${xpPercent}%**`;

    return message.channel.send(output);
  }
};
