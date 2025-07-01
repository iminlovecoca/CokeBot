const User = require('../models/User');

module.exports = {
  name: 'z',
  aliases: ['zoo', 'animal'],
  async execute(message) {
    const userId = message.author.id;
    const user = await User.findOne({ userId });

    if (!user || !user.beasts || Object.keys(user.beasts).length === 0) {
      return message.reply('📭 | Bạn chưa có thú nào trong kho!');
    }

    const formatList = (rarity, list) => {
      if (!list || Object.keys(list).length === 0) return '';
      const entries = Object.entries(list);
      const header = `\n__**${rarity}**__:\n`;
      const body = entries.map(([name, count]) => `${name} \`×${count}\``).join('  |  ');
      return header + body;
    };

    let result = `📦 **Kho thú của ${message.author.username}:**`;
    result += formatList('L', user.beasts['L']);
    result += formatList('M', user.beasts['M']);
    result += formatList('E', user.beasts['E']);
    result += formatList('R', user.beasts['R']);
    result += formatList('U', user.beasts['U']);
    result += formatList('C', user.beasts['C']);

    message.reply(result);
  }
};
