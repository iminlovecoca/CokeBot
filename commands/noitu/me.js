const { EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../data/config");

module.exports = {
  name: "me",
  description: "Xem hồ sơ nối từ của bạn",
  usage: `${config.prefix} noitu me`,
  async execute(message) {
    const user = await User.findOne({ userId: message.author.id }).lean();
    const stats = user?.noituStats?.[message.guild.id] || {};
    const attempts = stats.total || 0;
    const correct = stats.true || 0;
    const wins = stats.win || 0;
    const accuracy =
      attempts > 0 ? ((correct / attempts) * 100).toFixed(2) : "0.00";

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(
        `Thành tích nối từ - ${message.member?.displayName || message.author.username}`,
      )
      .setDescription("Hồ sơ nối từ")
      .addFields(
        { name: "Thành tích thắng", value: `\`${wins}\``, inline: true },
        { name: "Trả lời đúng", value: `\`${correct}\``, inline: true },
        { name: "Tổng lượt thử", value: `\`${attempts}\``, inline: true },
        { name: "Tỉ lệ đúng", value: `\`${accuracy}%\``, inline: true },
      );

    return message.reply({ embeds: [embed] });
  },
};
