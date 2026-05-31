const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { getQueue, formatQueue } = require("../../utils/musicPlayer");

module.exports = {
  name: "queue",
  aliases: ["q", "playlist"],
  description: "Xem hàng đợi phát nhạc hiện tại.",
  usage: `${config.prefix}queue`,
  async execute(message) {
    const queue = getQueue(message.client, message.guild.id);
    if (!queue) {
      return message.reply("Hiện không có hàng đợi nhạc nào.");
    }

    const { nowPlaying, upcomingText } = formatQueue(queue);
    const embed = new EmbedBuilder()
      .setColor("#1DB954")
      .setTitle("🎵 Hàng đợi nhạc")
      .setDescription(nowPlaying)
      .addFields({ name: "Bài tiếp theo", value: upcomingText });

    await message.reply({ embeds: [embed] });
  },
};
