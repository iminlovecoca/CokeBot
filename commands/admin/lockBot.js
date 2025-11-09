const config = require('../../data/config');

module.exports = {
  name: 'lock',
  description: 'Khóa hoặc mở khóa bot (Owner Only)',
  async execute(message) {
    if (message.author.id !== process.env.OWNER_ID) return;

    message.client.botLocked = !message.client.botLocked;
    message.client.allowedIds = config.permissions.admin_user_ids;

    if (message.client.botLocked) {
      await message.reply('🔒 Bot đã bị **khóa**. Chỉ Admin có thể sử dụng lệnh.');
    } else {
      await message.reply('🔓 Bot đã được **mở khóa**, mọi người có thể sử dụng lệnh.');
    }
  }
};