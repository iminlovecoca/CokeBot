const User = require('../../models/User');
const OWNER_ID = '745950731638407210'; // Thay bằng Discord ID của bạn nếu cần

module.exports = {
  name: 'delete',
  description: 'Xoá dữ liệu người chơi (chỉ dành cho Owner)',

  async execute(message, args) {
    if (message.author.id !== OWNER_ID)
      return message.reply('❌ | Lệnh này chỉ dành cho **Owner**.');

    const target = message.mentions.users.first();
    const isDeleteAll = args[0] === 'all';

    if (isDeleteAll) {
      const confirm = await message.reply('⚠️ Bạn có chắc muốn xoá toàn bộ dữ liệu người chơi? Gõ `yes` để xác nhận.');

      const filter = m => m.author.id === message.author.id;
      const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000 });

      if (!collected.size || collected.first().content.toLowerCase() !== 'yes') {
        return message.channel.send('❌ Huỷ thao tác xoá toàn bộ.');
      }

      await User.deleteMany({});
      return message.channel.send('✅ Đã xoá toàn bộ dữ liệu người chơi.');
    }

    if (!target) return message.reply('❌ | Cú pháp đúng: `!delete @user` hoặc `!delete all`');

    const confirmMsg = await message.reply(`⚠️ Bạn có chắc muốn xoá dữ liệu của **${target.username}**? Gõ \`yes\` để xác nhận.`);

    const filter = m => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async m => {
      if (m.content.toLowerCase() === 'yes') {
        const deleted = await User.deleteOne({ userId: target.id });
        if (deleted.deletedCount > 0) {
          message.channel.send(`✅ Đã xoá dữ liệu của **${target.username}**.`);
        } else {
          message.channel.send(`⚠️ Không tìm thấy dữ liệu của **${target.username}**.`);
        }
      } else {
        message.channel.send('❌ Đã huỷ thao tác xoá.');
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        message.channel.send('⌛ Hết thời gian, thao tác xoá đã bị huỷ.');
      }
    });
  }
};
