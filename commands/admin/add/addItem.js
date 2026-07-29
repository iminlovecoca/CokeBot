const User = require("../../../models/User");
const stoneUtil = require("../../../utils/stoneUtil");
const boxUtil = require("../../../utils/boxUtil");
const BaseCommand = require("../../../core/BaseCommand");
class AddItemCommand extends BaseCommand {
  constructor() {
    super({
      name: 'additem',
      description: 'Thêm đồ vào kho để thử nghiệm',
      cooldown: 0
    });
  }

  async execute(message, args) {
    if (!args[0] || !args[1]) return message.reply('Vui lòng nhập !additem <itemId> <số lượng>!');
    const itemId = args[0].toLowerCase();
    const quantity = parseInt(args[1]);
    if (isNaN(quantity) || quantity <= 0) return message.reply('Số lượng phải là số nguyên dương!');
    if (stoneUtil[itemId] || boxUtil[itemId]) {
      await User.updateOne({ userId: message.author.id }, { $inc: { [`inventory.${itemId}`]: quantity } }, { upsert: true });
      return message.reply(`Đã thêm ${quantity} ${itemId} vào kho!`);
    } else {
      return message.reply('Item ID không hợp lệ! Chỉ hỗ trợ đá hoặc hộp.');
    }
    }
}
module.exports = new AddItemCommand();