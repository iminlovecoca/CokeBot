const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose')
const User = require('../../models/User');
const {
  getOrCreateUser, giveCmd, removeTransferalOlderThanNDays,
  removeReceiptOlderThanNDays, validateBeforeGiving
} = require('../../utils/userUtil')

module.exports = {
  name: 'give',
  description: 'Chuyển coke cho người khác (ghi lại lịch sử chuyển nhận)',

  async execute(message, args) {
    const mention = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!mention || isNaN(amount) || amount <= 0) {
      await message.reply('❌ | Dùng đúng cú pháp: `!give @user <số tiền>`');
      return
    }

    const senderId = message.author.id;
    const receiverId = mention.id;

    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    const dateKey = `${vnNow.getFullYear()}-${vnNow.getMonth() + 1}-${vnNow.getDate()}`
    const msg = await validateBeforeGiving(senderId, receiverId, amount, dateKey)
    if (msg) {
      await message.reply(msg)
      return
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setAuthor({
        name: `${message.member.displayName}, bạn sắp chuyển coke cho ${mention.displayName || mention.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setDescription(
        `Để xác nhận giao dịch này, bấm ${'✅'} **Xác nhận**.\n` +
        `Để huỷ bỏ, bấm ${'❎'} **Huỷ**.\n\n` +
        `⚠️ *Cấm giao dịch coke để đổi vật phẩm có giá trị thật như tiền, nitro và ngược lại. Nếu vi phạm sẽ bị cấm sử dụng bot.*\n\n` +
        `**<@${senderId}> sẽ chuyển cho <@${receiverId}>:**\n` +
        '```fix\n' + `${amount.toLocaleString()} coke\n` + '```'
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Xác nhận').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('cancel').setLabel('Huỷ').setStyle(ButtonStyle.Danger).setEmoji('❎')
    );

    const confirmMsg = await message.reply({ embeds: [embed], components: [row] });

    const collector = confirmMsg.createMessageComponentCollector({
      filter: i => i.user.id === senderId,
      time: 30000,
      max: 1
    });

    collector.on('collect', async interaction => {
      try {
        await interaction.deferUpdate();
        row.components.forEach(btn => btn.setDisabled(true));

        if (interaction.customId === 'confirm') {
          await removeTransferalOlderThanNDays(senderId, 30)     
          await removeReceiptOlderThanNDays(receiverId, 30)
          const msg = await giveCmd(senderId, receiverId, amount, vnNow, dateKey)

          if (msg) {
            embed.setColor(0x00cc66).setDescription(
              `✅ **${message.member.displayName}** đã chuyển **${amount.toLocaleString()} coke** cho **${mention.displayName || mention.username}** lúc **${vnNow.toLocaleTimeString('vi-VN')}**`
            );
          } else {
            embed.setColor(0xcc0000).setDescription('❌ | Giao dịch đã bị huỷ do người nhận đang thực hiện một giao dịch khác.');
          }
        } else {
          embed.setColor(0xcc0000).setDescription('❌ | Giao dịch đã bị huỷ.');
        }

        await confirmMsg.edit({ embeds: [embed], components: [row] });
      } catch (err) {
        console.error(err);
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        row.components.forEach(btn => btn.setDisabled(true));
        embed.setColor(0xffcc00).setDescription('⏱ | Giao dịch đã hết hạn xác nhận.');
        confirmMsg.edit({ embeds: [embed], components: [row] });
      }
    });
  }
};
