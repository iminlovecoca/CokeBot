// commands/hunt.js
const { getRandomBeast } = require('../utils/beasts');
const User = require('../models/User');

module.exports = {
  name: 'hunt',
  aliases: ['h'],
  async execute(message, args) {
    const userId = message.author.id;
    let user = await User.findOne({ userId });

    if (!user) {
      user = await User.create({ userId });
    }

    const times = args[0] === 'all' ? 10 : parseInt(args[0]) || 1;

    if (times < 1 || times > 10) {
      return message.reply('❌ | Số lượt hunt phải từ 1 đến 10.');
    }

    const cost = 100 * times;
    if (user.coke < cost) {
      return message.reply(`💸 | Bạn cần ${cost} coke để hunt ${times} lần.`);
    }

    user.coke -= cost;
    if (!user.beasts) user.beasts = {};

    const results = [];
    for (let i = 0; i < times; i++) {
      const beast = getRandomBeast();
      const { name, emoji, rarity } = beast;

      if (!user.beasts[rarity]) user.beasts[rarity] = {};
      user.beasts[rarity][name] = (user.beasts[rarity][name] || 0) + 1;

      results.push(`${emoji}`);
    }

    await user.save();

    const reply = `🎯 | Bạn đã bắt được: ${results.join(' ')}`;
    message.reply(reply);
  }
};
