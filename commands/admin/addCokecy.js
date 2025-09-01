const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');

const ALLOWED_IDS = [
  process.env.OWNER_ID,
];

module.exports = {
  name: 'addcoke',
  description: 'Thêm coke cho người dùng (chỉ chủ bot)',

  async execute(message, args) {
    const authorId = message.author.id;
    if (!ALLOWED_IDS.includes(authorId)) {
      return message.reply('❌ Bạn không có quyền dùng lệnh này!');
    }

    const mention = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!mention || isNaN(amount) || amount <= 0) {
      return message.reply('❌ Cú pháp: `!m @user <số tiền>`');
    }

    const embed = new EmbedBuilder()
      .setColor('#ffcc00')
      .setTitle('💳 Xác nhận giao dịch')
      .setDescription(
        `${message.author}, bạn sắp thêm **${amount.toLocaleString()} coke** cho ${mention}\n\n` +
        `✅ Bấm **Xác nhận** để tiếp tục\n` +
        `❎ Bấm **Hủy** để dừng lại`
      )
      .setFooter({ text: 'Lưu ý: Chỉ Owner mới có thể xác nhận' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_add')
        .setLabel('✅ Xác nhận')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel_add')
        .setLabel('❎ Hủy')
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 15000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'confirm_add') {
        let user = await User.findOne({ userId: mention.id });
        if (!user) user = await User.create({ userId: mention.id });

        user.coke += amount;
        await user.save();

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Thành công')
              .setDescription(
                `Đã cộng **${amount.toLocaleString()} coke** cho ${mention}.\n` +
                `Số dư mới: **${user.coke.toLocaleString()} coke**`
              )
          ],
          components: []
        });
      } else if (interaction.customId === 'cancel_add') {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❎ Đã hủy')
              .setDescription(`Giao dịch thêm coke cho ${mention} đã bị hủy.`)
          ],
          components: []
        });
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Grey')
              .setTitle('⌛ Hết hạn')
              .setDescription(`Không có phản hồi, giao dịch đã bị hủy.`)
          ],
          components: []
        });
      }
    });
  }
};
