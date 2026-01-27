const { isDev } = require('../../utils/userUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config');

module.exports = {
  name: 'lock',
  description: 'Khóa hoặc mở khóa bot',
  async execute(message) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`)
    }

    message.client.botLocked = !message.client.botLocked;
    message.client.allowedIds = config.permissions.dev_ids;

    if (message.client.botLocked) {
      await message.reply('🔒 Bot đã bị **khóa**. Chỉ Admin có thể sử dụng lệnh.');
    } else {
      await message.reply('🔓 Bot đã được **mở khóa**, mọi người có thể sử dụng lệnh.');
    }
  }
};