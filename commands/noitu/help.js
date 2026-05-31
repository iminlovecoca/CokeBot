const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");

module.exports = {
  name: "help",
  aliases: ["guide", "info"],
  description: "Hướng dẫn sử dụng tính năng nối từ chung với Coke",
  usage: `${config.prefix} noitu help`,
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Nối từ trong Coke")
      .setDescription(
        "Module nối từ này chạy chung process với bot Coke, dùng chung tài khoản và bảng xếp hạng.",
      )
      .addFields(
        {
          name: "Cài kênh chơi",
          value: `\`${config.prefix} noitu set-channel #kenh\``,
          inline: true,
        },
        {
          name: "Bắt đầu ván",
          value: `\`${config.prefix} noitu start\``,
          inline: true,
        },
        {
          name: "Dừng hoặc làm mới ván",
          value: `\`${config.prefix} noitu stop\``,
          inline: true,
        },
        {
          name: "Xem thống kê",
          value: `\`${config.prefix} noitu stats\``,
          inline: true,
        },
        {
          name: "Xem rank",
          value: `\`${config.prefix} noitu rank\``,
          inline: true,
        },
        {
          name: "Xem hồ sơ",
          value: `\`${config.prefix} noitu me\``,
          inline: true,
        },
        {
          name: "Xem thông tin server",
          value: `\`${config.prefix} noitu server\``,
          inline: true,
        },
        {
          name: "Lệnh Coke",
          value: `Dùng \`${config.prefix}help\` để xem toàn bộ lệnh của bot chính.`,
          inline: false,
        },
      );

    await message.reply({ embeds: [embed] });
  },
};
