const config = require("../../data/config");
const { shuffleQueue, getQueue } = require("../../utils/musicPlayer");

module.exports = {
  name: "shuffle",
  aliases: ["mix"],
  description: "Xáo trộn hàng đợi nhạc hiện tại.",
  usage: `${config.prefix}shuffle`,
  examples: [{ intent: "Xáo trộn queue", command: `${config.prefix}shuffle` }],
  async execute(message) {
    const queue = getQueue(message.client, message.guild.id);
    if (!queue) {
      return message.reply("Hiện không có hàng đợi nhạc nào.");
    }

    shuffleQueue(message.client, message.guild.id);
    await message.reply(`🔀 Đã shuffle ${queue.songs.length} bài trong queue.`);
  },
};
