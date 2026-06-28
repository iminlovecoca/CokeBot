const BaseCommand = require('../../core/BaseCommand');
const config = require('../../data/config')

class RankCommand extends BaseCommand {
  constructor() {
    super({
      name: 'rank',
      aliases: ['level', 'lvl'],
      description: '🔰 Xem cấp bậc rank và level',
      usage: `${config.prefix}rank`,
      examples: [
        { intent: 'Xem thông tin level và rank của bạn', command: `${config.prefix}rank` }
      ],
      category: 'user'
    });
  }

  async execute(message, args, client, locator) {
    const userService = locator.get('userService');
    const displayName = message.member?.displayName || message.author.username;
    
    let user = await userService.getUser(message.author.id);
    const xpNeed = userService.getUserXpNeeded(user.level);
    const xpPercent = Math.floor((user.xp / xpNeed) * 100);
    const progressBar =
      `▰`.repeat(Math.floor(xpPercent / 10)) +
      `▱`.repeat(10 - Math.floor(xpPercent / 10));

    const rankEmoji = userService.getRankEmoji(user.level);

    const output =
      `🔰 **${displayName}** 🔰\n` +
      `**Rank **|** ${rankEmoji}\n` +
      `XP \t**|** ${user.xp} / ${xpNeed}\n` +
      `Level ${user.level} ${progressBar} ${xpPercent}%**`;

    return message.channel.send(output);
  }
}

module.exports = new RankCommand();
