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
          label: '🎮 Đoán từ',
          description: 'Luật chơi và hướng dẫn các lệnh đoán từ',
          value: 'doantu'
        },
        {
          label: '🎰 Bài bạc Coke',
          description: 'Hướng dẫn các game như slots, tài xỉu, xì dách, roulette',
          value: 'minigame'
        },
        {
          label: '📚 Từ điển & Báo cáo',
          description: 'Lệnh report, ...',
          value: 'dictionary'
        },
        {
          label: '🔎 Tra cứu',
          description: 'Tra cứu bxh, profile, hướng dẫn giao dịch, ...',
          value: 'help'
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
                '👑 Thắng sẽ được thưởng **`25,000 coke`**!'
              ].join('\n'));
            break;

          case 'doantu':
            embed = new EmbedBuilder()
              .setTitle('🎮 Hướng dẫn Đoán từ')
              .setColor(0x00BFFF)
              .setDescription([
                '`!gw` – Bắt đầu game',
                '',
                '**Luật:** Cụm từ 2-4 tiếng, ghép thành từ có nghĩa từ các chữ cái được cung cấp',
                '👑 Thắng sẽ được thưởng **`2,500-10,000 coke`** tuỳ theo độ khó!'
              ].join('\n'));
            break;

          case 'minigame':
            embed = new EmbedBuilder()
              .setTitle('🎰 Bài bạc Coke')
              .setColor(0xFFA500)
              .setDescription([
                '`!daily` – Nhận coke mỗi ngày',
                '`!work` – Thăm ngàn',
                '`!s <số tiền> or <all>` – Quay máy xèng',
                '`!bj <số tiền> or <all>` – Chơi xì dách',
                '`!tx <t/x> <số tiền> or <all>` – Tài xỉu',
                '`!r <red/black> or <0 - 36> + <số tiền> or <all>` – Chơi roulette',
              ].join('\n'));
            break;

          case 'dictionary':
            embed = new EmbedBuilder()
              .setTitle('📚 Từ Điển & Báo Cáo')
              .setColor(0x9966FF)
              .setDescription([
                '`/report <từ>` – Báo cáo từ sai',
                '`/approve <từ>` – Gửi từ mới bạn muốn thêm',
                '',
                '📌 Từ sẽ được duyệt bởi admin và thêm vào hệ thống nếu hợp lệ.'
              ].join('\n'));
            break;

          case 'help':
            embed = new EmbedBuilder()
              .setTitle('🔎 Tra cứu')
              .setColor(0xFCF403)
              .setDescription([
                '`!top cash <10> <20> ...` – Xem xếp hạng coke',
                '`!toplvl <10> <20> ...` – Xem xếp hạng lvl',
                '`!profile` – Xem hồ sơ gồm cấp và tiền',
                '`!limit` - Xem giới hạn chuyển/nhận coke',
                '`!cash` – Xem số coke hiện có',
                '`!bank` – Xem số coke hiện có trong bank',
                '`!give <@user> <số tiền>` – Chuyển coke cho người user khác',
              ].join('\n'));
            break;

          case 'tips':
            embed = new EmbedBuilder()
              .setTitle('💡 Mẹo & Thưởng Coke')
              .setColor(0x33CC33)
              .setDescription([
                '• Mỗi ngày vào `!daily` để nhận coke',
                '• Thăm ngàn 3h/lần với lệnh `!work` để nhận coke',
                '• Chat nhiều hoặc chơi minigame để lên cấp và nhận thưởng **coke**',
                '• Tham gia nối từ để nhận **`25,000 coke`** nếu thắng',
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
