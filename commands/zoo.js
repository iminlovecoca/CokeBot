// commands/zoo.js
const User = require('../models/User');

const rarityOrder = ['Ancient', 'Legendary', 'Mythic', 'Epic', 'Rare', 'Uncommon', 'Common'];
const rarityEmojis = {
    Common: '<:Common:1390024512774471902>',
    Uncommon: '<:Uncommon:1390024590347997245>',
    Rare: '<:Rare:1390024624380706916>',
    Epic: '<:Epic:1390024749517770832>',
    Mythic: '<:Mysthic:1390024772200567026>',
    Legendary: '<:Legendary:1390024789279772833>',
    Ancient: '<:Ancient:1390024806535004333>',
};

module.exports = {
  name: 'z',
  aliases: ['zoo', 'animal'],
  async execute(message) {
    const userId = message.author.id;
    const user = await User.findOne({ userId });

    if (!user || !user.beasts) {
      return message.reply('📭 | Bạn chưa có thú nào trong kho!');
    }

    let display = `🌿🌱 **${message.author.username}'s zoo!** 🌱🌿\n\n`;

    for (const rarity of rarityOrder) {
      const beastsOfRarity = user.beasts[rarity];
      if (beastsOfRarity && Object.keys(beastsOfRarity).length > 0) {
        display += `${rarityEmojis[rarity] || ''} **${rarity}**\n`;
        const list = Object.entries(beastsOfRarity)
          .map(([name, count]) => `• ${name} ×${count}`)
          .join('\n');
        display += `${list}\n\n`;
      }
    }

    message.reply(display);
  }
};
