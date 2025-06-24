const User = require('../models/User');

// Thay YOUR_DISCORD_ID bằng ID thật của bạn
const OWNER_ID = '745950731638407210';

module.exports = {
  name: 'm',
  description: 'Thêm coke cho người dùng (chỉ chủ bot)',

  async execute(message, args) {
    if (message.author.id !== OWNER_ID)
      return message.reply('Lệnh này chỉ dành cho **chủ sở hữu bot**.');

    const mention = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!mention || isNaN(amount)) {
      return message.reply('`!m @user <số tiền>`');
    }

    let user = await User.findOne({ userId: mention.id });
    if (!user) user = await User.create({ userId: mention.id });

    user.coke += amount;
    await user.save();

    message.channel.send(`✅ Đã thêm ${amount.toLocaleString()} coke cho **${mention.username}**.`);
  }
};
