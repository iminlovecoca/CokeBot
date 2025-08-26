const User = require('../../models/User');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const prices = {
  1: 20000000000,
  3: 40000000000,
  7: 80000000000
};

module.exports = {
  name: 'buy',
  description: '🛒 Mua vật phẩm trong shop',
  async execute(message, args) {
    const userId = message.author.id;
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({ userId });
    }

    if (args.length < 2) {
      return message.reply("❌ | Cú pháp: `!buy vip <1|3|7>`");
    }

    const item = args[0].toLowerCase();
    if (item !== "vip") {
      return message.reply("❌ | Hiện tại chỉ có thể mua **VIP**.");
    }

    const days = parseInt(args[1], 10);
    if (![1, 3, 7].includes(days)) {
      return message.reply("❌ | Chỉ có gói VIP **1, 3 hoặc 7 ngày**.");
    }

    const cost = prices[days];
    if (user.coke < cost) {
      return message.reply(`❌ | Bạn không đủ coke! Cần **${cost.toLocaleString()} coke**.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("Xác nhận mua VIP")
      .setDescription(
        `Bạn có chắc muốn mua **VIP ${days} ngày** với giá **${cost.toLocaleString()} coke**?\n\n` +
        `✅ Nhấn **Xác nhận** để mua.\n❎ Nhấn **Huỷ** để thoát.`
      )
      .setFooter({ text: "Thao tác sẽ hết hạn sau 30 giây." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_buy")
        .setLabel("✅ Xác nhận")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel_buy")
        .setLabel("❎ Huỷ")
        .setStyle(ButtonStyle.Danger)
    );

    const confirmMsg = await message.reply({ embeds: [embed], components: [row] });

    const collector = confirmMsg.createMessageComponentCollector({
      time: 30000,
      filter: i => i.user.id === userId
    });

    collector.on("collect", async interaction => {
      if (interaction.customId === "cancel_buy") {
        await interaction.update({
          content: "❌ | Bạn đã huỷ giao dịch.",
          embeds: [],
          components: []
        });
        collector.stop();
        return;
      }

      if (interaction.customId === "confirm_buy") {
        user.coke -= cost;

        const now = new Date();
        if (user.vipUntil && user.vipUntil > now) {
          user.vipUntil = new Date(user.vipUntil.getTime() + days * 24 * 60 * 60 * 1000);
        } else {
          user.vipUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        }

        user.vipLevel = 1;
        await user.save();

        const expireVN = user.vipUntil.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

        await interaction.update({
          content:
            `✅ | Bạn đã mua thành công **VIP ${days} ngày**!\n` +
            `⏳ VIP của bạn sẽ hết hạn vào: **${expireVN}**`,
          embeds: [],
          components: []
        });
        collector.stop();
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        confirmMsg.edit({
          content: "⏱ | Hết thời gian xác nhận, giao dịch bị huỷ.",
          embeds: [],
          components: []
        }).catch(() => {});
      }
    });
  }
};
