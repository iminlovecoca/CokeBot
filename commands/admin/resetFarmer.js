const User = require('../../models/User');

module.exports = {
  name: 'rmzoo',
  description: 'Xoá toàn bộ dữ liệu hunt và animal (farmer) của 1 người chơi (owner only)',
  async execute(message, args) {
    const ownerId = '745950731638407210'; 
    if (message.author.id !== ownerId) {
      return message.reply('❌ | Bạn không có quyền dùng lệnh này.');
    }

    const targetUserId = args[0];
    if (!targetUserId || isNaN(targetUserId)) {
      return message.reply('❌ | Vui lòng cung cấp ID người dùng hợp lệ.');
    }

    let user = await User.findOne({ userId: targetUserId });
    if (!user) return message.reply('❌ | Không tìm thấy user này!');

    user.zoo = {};
    user.zooPoints = 0;
    user.huntStones = { boost: {}, multi: {}, fixed: {} };
    user.isHunting = false;
    user.petExp = {};

    await user.save();

    return message.reply(`✅ | Đã xoá dữ liệu farmer (hunt, animal) cho user có ID **${targetUserId}**.`);
  },
};