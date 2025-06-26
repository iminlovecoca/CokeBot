const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../models/User');

const DAILY_LIMIT = 10_000_000;

module.exports = {
  name: 'give',
  description: 'Chuyển coke cho người khác (tối đa 10 triệu/ngày)',
  async execute(message, args) {
    const mention = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!mention || isNaN(amount) || amount <= 0) {
      return message.reply('❌ | Dùng đúng cú pháp: `!give @user <số tiền>`');
    }

    const senderId = message.author.id;
    const receiverId = mention.id;

    if (senderId === receiverId) {
      return message.reply('❌ | Bạn không thể tự chuyển cho chính mình.');
    }

    const sender = await User.findOne({ userId: senderId });
    const receiver = await User.findOne({ userId: receiverId });

    if (!sender || sender.coke < amount) {
      return message.reply('<:Economy_Cowoncy:1386429292883214397> | Bạn không đủ coke để chuyển.');
    }

    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const dateKey = `${vnNow.getFullYear()}-${vnNow.getMonth() + 1}-${vnNow.getDate()}`;

    sender.dailyGive = sender.dailyGive || {};
    const transferredToday = sender.dailyGive[dateKey] || 0;

    if (transferredToday + amount > DAILY_LIMIT) {
      const remaining = DAILY_LIMIT - transferredToday;
      return message.reply(
        `❌ | Bạn đã vượt giới hạn chuyển coke trong ngày!` 
      );
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('✅Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('❎Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    const confirmMsg = await message.reply({
      content: `🔁 | Bạn muốn chuyển **${amount.toLocaleString()} coke** cho **${mention.username}**`,
      components: [row]
    });

    const filter = interaction =>
      ['confirm', 'cancel'].includes(interaction.customId) &&
      interaction.user.id === senderId;

    const collector = confirmMsg.channel.createMessageComponentCollector({
      filter,
      time: 15000,
      max: 1
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'confirm') {
        sender.coke -= amount;
        sender.dailyGive[dateKey] = transferredToday + amount;
        receiver.coke += amount;

        await sender.save();
        await receiver.save();

        await interaction.update({
          content:
            `✅ | Đã chuyển <:Economy_Cowoncy:1386429292883214397>**${amount.toLocaleString()} coke** cho **${mention.username}**!`,
          components: [] // ❌ bỏ nút sau khi xác nhận
        });

      } else {
        await interaction.update({
          content: '❌ | Đã huỷ giao dịch.',
          components: []
        });
        setTimeout(() => confirmMsg.delete().catch(() => {}), 7000); // xoá sau huỷ
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        confirmMsg.edit({
          content: '⏱ | Hết thời gian xác nhận. Giao dịch đã huỷ.',
          components: []
        }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 7000);
        });
      }
    });
  }
};
