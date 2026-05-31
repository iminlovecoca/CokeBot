const config = require("../../data/config");
const {
  replayCurrentSong,
  replayQueue,
  getQueue,
} = require("../../utils/musicPlayer");

module.exports = {
  name: "replay",
  aliases: ["repeat"],
  description: "Phát lại bài hiện tại hoặc toàn bộ queue.",
  usage: `${config.prefix}replay [song|queue]`,
  examples: [
    { intent: "Re-play bài hiện tại", command: `${config.prefix}replay` },
    {
      intent: "Re-play toàn bộ queue",
      command: `${config.prefix}replay queue`,
    },
  ],
  async execute(message, args) {
    const mode = (args[0] || "song").toLowerCase();
    const queue = getQueue(message.client, message.guild.id);
    if (!queue) {
      return message.reply("Hiện không có hàng đợi nhạc nào.");
    }

    if (mode === "queue" || mode === "all") {
      await replayQueue(message.client, message.guild.id);
      return message.reply("🔁 Đã replay toàn bộ queue từ đầu.");
    }

    await replayCurrentSong(message.client, message.guild.id);
    await message.reply("🔁 Đã replay bài hiện tại.");
  },
};
