const { PermissionsBitField } = require('discord.js');
const StockHolding = require('../../models/StockHolding');
const StockTx = require('../../models/StockTx');

module.exports = {
  name: 'resetstock',
  description: 'Xoá toàn bộ dữ liệu stock (owner only)',
  async execute(message, args) {
    const ownerId = '745950731638407210'; 
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới được dùng lệnh này.');
    }

    try {
      await StockHolding.deleteMany({});
      await StockTx.deleteMany({});

      return message.reply('✅ Đã xoá toàn bộ dữ liệu người chơi stock.');
    } catch (err) {
      console.error(err);
      return message.reply('❌ Lỗi khi xoá dữ liệu.');
    }
  }
};
