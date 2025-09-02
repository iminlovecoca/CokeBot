const User = require('../../models/User');
const animalUtil = require('../../utils/animalsUtil');

const HUNT_COST = 5;

module.exports = {
  name: 'h',
  description: 'Hunt animals using 5 coke per attempt. Use stones to increase success rate.',
  async execute(message, args) {
    const user = await User.findOne({ userId: message.author.id });
    if (!user) return message.reply('❌ | Bạn chưa đăng ký tài khoản!');

    if (message.content.startsWith('!z')) {
      if (!user.zoo) return message.reply('❌ | Bạn chưa sở hữu thú nào!');
      let content = `🌿 🌱 🌳 **${message.member.displayName}'s Zoo!** 🌳 🌿 🌱\n\n`;
      for (const category of Object.keys(animalUtil)) {
        const animals = animalUtil[category];
        if (!Array.isArray(animals) || animals.length === 0) continue;
        const rowAnimals = animals
          .filter(animal => user.zoo[animal] > 0)
          .map(animal => `${animal}\`${String(user.zoo[animal]).padStart(3, '0')}\``)
          .join(' ');
        if (rowAnimals.length > 0) {
          content += `${category} | ${rowAnimals}\n`;
        }
      }
      content += `\n **Zoo Points: ${user.zooPoints?.toLocaleString() || 0}**`;
      return message.reply(content);
    }

    if (message.content.startsWith('!use')) {
      const stoneIds = args.join(' ').split(',').map(s => s.trim()).filter(Boolean);
      if (!user.stones || stoneIds.length === 0) return message.reply('❌ | Bạn không có đá hoặc không nhập mã đá!');
      let used = [];
      for (const id of stoneIds) {
        if (user.stones[id] && user.stones[id] > 0) {
          user.stones[id] -= 1;
          used.push(id);
        }
      }
      await user.save();
      if (used.length === 0) return message.reply('❌ | Không tìm thấy đá hợp lệ để sử dụng!');
      return message.reply(`✅ | Đã sử dụng đá: ${used.join(', ')}`);
    }

    if (user.isHunting) return message.reply('❌ | Bạn đang săn thú, vui lòng chờ hoàn thành!');
    if (user.coke < HUNT_COST) return message.reply('❌ | Bạn không đủ coke để săn thú!');

    let successRate = 0.2;
    let usedStones = [];
    if (args.length > 0 && user.stones) {
      for (const stoneId of args) {
        if (user.stones[stoneId] && user.stones[stoneId] > 0) {
          usedStones.push(stoneId);
          successRate += 0.1;
        }
      }
      for (const stoneId of usedStones) {
        user.stones[stoneId] -= 1;
      }
    }

    const huntableCategories = Object.keys(animalUtil).filter(cat => cat !== 'Gacha');

    user.coke -= HUNT_COST;
    user.isHunting = true;
    await user.save();

    setTimeout(async () => {
      let animalCategory = huntableCategories[Math.floor(Math.random() * huntableCategories.length)];
      let animalList = animalUtil[animalCategory];
      let animal = animalList[Math.floor(Math.random() * animalList.length)];

      let team = Array.isArray(user.team) ? user.team : [];
      let exp = 10;
      let lines = [];

      if (usedStones.length > 0) {
        lines.push(`:seedling: | ${message.member.displayName}, hunt is empowered by 💎 ${usedStones.map(s => `\`${s}\``).join(', ')}!`);
      }

      if (!user.zoo || typeof user.zoo !== 'object') user.zoo = {};
      user.zoo[animal] = (user.zoo[animal] || 0) + 1;

      lines.push(`<:blank:1403928807395819671> | Bạn săn được: **${animal}**`);

      if (team.length > 0) {
        if (!user.petExp) user.petExp = {};
        team.forEach(t => {
          user.petExp[t] = (user.petExp[t] || 0) + exp;
        });
        lines.push(`<:blank:1403928807395819671> | ${team.map(t => `🐾 ${t}`).join(' ')} gained **${exp}xp**!`);
      }

      user.isHunting = false;
      await user.save();
      message.reply(lines.join('\n'));
    }, 2000);
  }
};