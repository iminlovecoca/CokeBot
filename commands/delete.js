const User = require('../models/User');

const OWNER_ID = '745950731638407210';

module.exports = {
  name: 'delete',
  description: 'Xoá dữ liệu người chơi',

  async execute(message, args) {
    if (message.author.id !== OWNER_ID)
      return message.reply('Lệnh này chỉ dành cho **Owner**.');

    const mention = message.mentions.users.first();
    if (!mention) return message.reply('Cú pháp dúng: `!deleteuser @user`');

    const confirmMsg = await message.reply(`Bạn có chắc muốn xoá dữ liệu của  **${mention.username}** (gõ \`yes\` hoặc \`no\`)`);

    // Chờ phản hồi trong 15 giây
    const filter = m => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async (m) => {
      const response = m.content.toLowerCase();
      if (response === 'yes') {
        const deleted = await User.deleteOne({ userId: mention.id });
        if (deleted.deletedCount > 0) {
          message.channel.send(`Ðã xoá dữ liệu **${mention.username}**.`);
        } else {
          message.channel.send(`Không tìm thấy dữ liệu của **${mention.username}**.`);
        }
      } else {
        message.channel.send('Ðã huỷ thao tác xoá.');
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        message.channel.send('Hết thời gian đã huỷ thao tác.');
      }
    });
  }
};
