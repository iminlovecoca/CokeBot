// commands/help.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Hiển thị hướng dẫn sử dụng bot với menu chọn',
  async execute(message) {
    const embedMain = new EmbedBuilder()
      .setTitle('📖 Hướng Dẫn Bot Coke')
      .setDescription('Chọn một danh mục bên dưới để xem chi tiết các lệnh!')
      .setColor(0x00CC99);

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_menu')
      .setPlaceholder('📚 Chọn danh mục...')
      .addOptions([
        {
          label: '🎮 Nối Từ',
          description: 'Luật chơi và hướng dẫn các lệnh nối từ',
          value: 'noitu'
        },
        {
          label: '🎰 Mini Game Coke',
          description: 'Hướng dẫn các game như slots, tài xỉu, xì dách, bầu cua',
          value: 'minigame'
        },
        {
          label: '📚 Từ điển & Báo cáo',
          description: 'Lệnh report,...',
          value: 'dictionary'
        },
        {
          label: '💡 Mẹo & Thưởng',
          description: 'Mẹo kiếm coke nhanh và cách nhận thưởng',
          value: 'tips'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const msg = await message.channel.send({
      embeds: [embedMain],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'help_menu') {
        let embed;

        switch (interaction.values[0]) {
          case 'noitu':
            embed = new EmbedBuilder()
              .setTitle('🎮 Hướng dẫn Nối Từ')
              .setColor(0x00BFFF)
              .setDescription([
                '`!start` – Bắt đầu game',
                '`!stop` – Dừng game',
                '',
                '**Luật:** Cụm từ 2 tiếng, từ mới bắt đầu bằng tiếng cuối của từ trước',
                'Không được trả lời 2 lần liên tiếp',
                '👑 Thắng sẽ được thưởng `**50,000 coke**`!'
              ].join('\n'));
            break;

          case 'minigame':
            embed = new EmbedBuilder()
              .setTitle('🎰 Mini Game Kiếm Coke')
              .setColor(0xFFA500)
              .setDescription([
                '`!daily` – Nhận coke mỗi ngày',
                '`!top cash <10> <20> ...` – Để xem xếp hạng coke',
                '`!profile` – Xem hồ sơ gồm cấp và tiền',
                '`!cash` – Xem số coke hiện có',
                '`!slots <số tiền> or <all>` – Quay máy xèng',
                '`!bj <số tiền> or <all>` – Chơi xì dách',
                '`!taixiu <tài/xỉu> <số tiền> or <all>` – Tài xỉu',
                '`!bc` – Để chơi bầu cua',
              ].join('\n'));
            break;

          case 'dictionary':
            embed = new EmbedBuilder()
              .setTitle('📚 Từ Điển & Báo Cáo')
              .setColor(0x9966FF)
              .setDescription([
                '`/report <từ>` – Báo cáo từ sai',
                // '`/approve <từ>` – Gửi từ mới bạn muốn thêm',
                '',
                '📌 Từ sẽ được duyệt bởi admin và thêm vào hệ thống nếu hợp lệ.'
              ].join('\n'));
            break;

          case 'tips':
            embed = new EmbedBuilder()
              .setTitle('💡 Mẹo & Thưởng Coke')
              .setColor(0x33CC33)
              .setDescription([
                '• Mỗi ngày vào `!daily` để nhận coke',
                '• Chat nhiều hoặc chơi minigame để lên cấp và nhận thưởng **coke**',
                '• Tham gia nối từ để nhận `**50,000 coke**` nếu thắng',
                '• Dùng coke để chơi bài bạc...',
              ].join('\n'));
            break;
        }

        await interaction.update({
          embeds: [embed],
          components: [row]
        });
      }
    });
  }
};
