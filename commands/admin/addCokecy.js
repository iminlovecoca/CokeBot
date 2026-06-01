const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const User = require("../../models/User");

const ALLOWED_IDS = [process.env.OWNER_ID];

module.exports = {
  name: "addcoke",
  description: "Thêm coke cho người dùng hoặc tất cả (chỉ chủ bot)",

  async execute(message, args) {
    const authorId = message.author.id;
    if (!ALLOWED_IDS.includes(authorId)) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    const target = args[0];
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply(
        `❌ Cú pháp:\n\`${config.prefix}addcoke @user <số tiền>\` hoặc \`${config.prefix}addcoke all <số tiền>\``,
      );
    }

    let isAll = target.toLowerCase() === "all";
    let mention = null;
    if (!isAll) {
      mention =
        message.mentions.users.first() ||
        (await message.client.users.fetch(target).catch(() => null));
      if (!mention) return message.reply("❌ Không tìm thấy user.");
    }

    const embed = new EmbedBuilder()
      .setColor("#3498db")
      .setTitle("💳 Xác nhận giao dịch")
      .setDescription(
        isAll
          ? `${message.author}, bạn sắp cộng thêm **${amount.toLocaleString()} coke** cho **toàn bộ user**.\n\n` +
              `✅ Bấm **Xác nhận** để tiếp tục\n❎ Bấm **Hủy** để dừng lại`
          : `${message.author}, bạn sắp cộng thêm **${amount.toLocaleString()} coke** cho ${mention}.\n\n` +
              `✅ Bấm **Xác nhận** để tiếp tục\n❎ Bấm **Hủy** để dừng lại`,
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_add")
        .setLabel("✅ Xác nhận")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel_add")
        .setLabel("❎ Hủy")
        .setStyle(ButtonStyle.Danger),
    );

    const msg = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 15000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "confirm_add") {
        if (isAll) {
          await User.updateMany({}, { $inc: { coke: amount } });
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Thành công")
                .setDescription(
                  `Đã cộng thêm **${amount.toLocaleString()} coke** cho toàn bộ user.`,
                ),
            ],
            components: [],
          });
        } else {
          let user = await User.findOne({ userId: mention.id });
          if (!user) user = await User.create({ userId: mention.id });

          user.coke += amount;
          await user.save();

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Thành công")
                .setDescription(
                  `Đã cộng **${amount.toLocaleString()} coke** cho ${mention}.\n` +
                    `Số dư mới: **${user.coke.toLocaleString()} coke**`,
                ),
            ],
            components: [],
          });
        }
      } else if (interaction.customId === "cancel_add") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("❎ Đã hủy")
              .setDescription("Giao dịch cộng coke đã bị hủy."),
          ],
          components: [],
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("Grey")
              .setTitle("⌛ Hết hạn")
              .setDescription("Không có phản hồi, giao dịch đã bị hủy."),
          ],
          components: [],
        });
      }
    });
  },
};
