const User = require('../../models/User');
const stoneUtil = require('../../utils/stoneUtil');
const boxUtil = require('../../utils/boxUtil'); // Thêm để xử lý hộp nếu có

module.exports = {
  name: 'inv',
  description: 'Xem kho đồ bạn đang có',
  async execute(message) {
    const user = await User.findOne({ userId: message.author.id });
    if (!user || !user.inventory || Object.keys(user.inventory).length === 0) {
      return message.reply('❌ | Bạn chưa có vật phẩm nào trong kho.');
    }

    const inventory = user.inventory;
    const displayName = message.member.displayName || message.author.username;

    let lines = [`════ **${displayName}'s Inventory** ════`];
    let row = '';
    let itemCount = 0;

    // Xử lý stones từ stoneUtil
    const stoneEntries = Object.entries(stoneUtil);
    for (let i = 0; i < stoneEntries.length; i++) {
      const [itemId, item] = stoneEntries[i];
      const count = inventory[itemId] || 0;
      if (count > 0) {
        const countStr = String(count).padStart(3, '0');
        row += `${item.emoji}${countStr} `;
        itemCount++;
        if (itemCount % 4 === 0) {
          lines.push(row.trim());
          row = '';
        }
      }
    }

    // Xử lý boxes từ boxUtil (nếu có)
    const boxEntries = Object.entries(boxUtil);
    for (let i = 0; i < boxEntries.length; i++) {
      const [itemId, item] = boxEntries[i];
      const count = inventory[itemId] || 0;
      if (count > 0) {
        const countStr = String(count).padStart(3, '0');
        row += `${item.emoji || '📦'}${countStr} `; // Sử dụng biểu tượng mặc định nếu không có emoji
        itemCount++;
        if (itemCount % 4 === 0) {
          lines.push(row.trim());
          row = '';
        }
      }
    }

    // Thêm dòng cuối nếu còn item chưa xuống dòng
    if (row) lines.push(row.trim());

    // Nếu không có item nào để hiển thị
    if (lines.length === 1) {
      return message.reply('❌ | Bạn chưa có vật phẩm nào trong kho.');
    }

    message.reply(lines.join('\n'));
  }
};