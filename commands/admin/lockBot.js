const OWNER_ID = process.env.OWNER_ID;
const ALLOWED_IDS = process.env.ALLOWED_IDS ? process.env.ALLOWED_IDS.split(',') : [];

module.exports = {
  name: 'lock',
  description: 'Khóa hoặc mở khóa bot (Owner Only)',
  async execute(message) {
    if (message.author.id !== OWNER_ID) return;

    message.client.botLocked = !message.client.botLocked;
    message.client.allowedIds = [OWNER_ID, ...ALLOWED_IDS];

    if (message.client.botLocked) {
      await message.reply('🔒 Bot đã bị **khóa**. Chỉ Owner và Allowed IDs có thể sử dụng lệnh.');
    } else {
      await message.reply('🔓 Bot đã được **mở khóa**, mọi người có thể sử dụng lệnh.');
    }
  }
};
