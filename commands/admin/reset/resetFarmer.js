const User = require("../../../models/User");
const BaseCommand = require("../../../core/BaseCommand");
const { isOwner } = require("../../../utils/userUtil");

class ResetFarmerCommand extends BaseCommand {
  constructor() {
    super({
      name: 'rmzoo',
      description: 'Xoá toàn bộ dữ liệu hunt và animal (farmer) của 1 người chơi (owner only)',
      cooldown: 0
    });
  }
  async execute(message, args) {
    if (!isOwner(message.author.id)) {
      return message.reply('❌ | Bạn không có quyền dùng lệnh này.');
    }
    const targetUserId = args[0];
    if (!targetUserId || isNaN(targetUserId)) {
      return message.reply('❌ | Vui lòng cung cấp ID người dùng hợp lệ.');
    }
    let user = await User.findOne({ userId: targetUserId });
    if (!user) {
      return message.reply('❌ | Không tìm thấy người dùng này trong CSDL.');
    }
    user.zoo = {};
    user.zooPoints = 0;
    user.huntStones = { boost: {}, multi: {}, fixed: {} };
    await user.save();
    return message.reply(`✅ | Đã xoá toàn bộ dữ liệu hunt & sở thú (zoo) của người dùng **${targetUserId}**.`);
  }
}
module.exports = new ResetFarmerCommand();