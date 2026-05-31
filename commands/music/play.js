const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { addSongToQueue } = require("../../utils/musicPlayer");

module.exports = {
  name: "play",
  aliases: ["p"],
  description: "Phát nhạc từ YouTube bằng link hoặc từ khóa tìm kiếm.",
  usage: `${config.prefix}play [link YouTube hoặc tên bài hát]`,
  examples: [
    {
      intent: "Phát bằng từ khóa",
      command: `${config.prefix}play em cua ngay hom qua`,
    },
    {
      intent: "Phát bằng link YouTube",
      command: `${config.prefix}play https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
    },
  ],
  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) {
      return message.reply(
        `Hãy dùng: \`${config.prefix}play [link/tên bài hát]\``,
      );
    }

    const sent = await message.channel.send("🔎 Đang tìm bài hát...");
    try {
      const { song } = await addSongToQueue(message.client, message, query);
      const embed = new EmbedBuilder()
        .setColor("#1DB954")
        .setTitle("✅ Đã thêm vào hàng đợi")
        .setDescription(`**[${song.title}](${song.url})**`)
        .addFields(
          { name: "Kênh", value: song.channelName || "YouTube", inline: true },
          { name: "Thời lượng", value: song.duration || "LIVE", inline: true },
          { name: "Yêu cầu bởi", value: song.requestedBy, inline: true },
        );

      if (song.thumbnail) {
        embed.setThumbnail(song.thumbnail);
      }

      await sent.edit({ content: null, embeds: [embed] });
    } catch (error) {
      await sent.delete().catch(() => {});
      throw error;
    }
  },
};
