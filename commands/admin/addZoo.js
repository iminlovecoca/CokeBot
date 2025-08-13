const User = require('../../models/User');
const animalUtil = require('../../utils/animalsUtil');

module.exports = {
  name: 'setzoo',
  description: 'Set full thú cho 1 tài khoản (owner only)',
  async execute(message, args) {
    const ownerId = '745950731638407210'; // ✅ Thay bằng ID Discord của bạn
    if (message.author.id !== ownerId) {
      return message.reply('❌ | Bạn không có quyền dùng lệnh này.');
    }

    const targetUserId = args[0];
    if (!targetUserId || isNaN(targetUserId)) {
      return message.reply('❌ | Vui lòng cung cấp ID người dùng hợp lệ.');
    }

    let user = await User.findOne({ userId: targetUserId });
    if (!user) user = await User.create({ userId: targetUserId });

    const fullZoo = {};
    for (const category in animalUtil) {
      const animals = animalUtil[category];
      if (!Array.isArray(animals)) continue;
      for (const animal of animals) {
        fullZoo[animal] = 1;
      }
    }

    user.zoo = fullZoo;
    await user.save();

    return message.reply(`✅ | Đã set full thú cho user có ID **${targetUserId}**.`);
  },
};
