const config = require("../../data/config");
const { destroyQueue, getQueue } = require("../../utils/musicPlayer");

module.exports = {
  name: "stop",
  aliases: ["leave", "dc"],
  description: "Dừng phát nhạc và rời voice channel.",
  usage: `${config.prefix}stop`,
  async execute(message) {
    const queue = getQueue(message.client, message.guild.id);
    if (!queue) {
      return message.reply("Hiện không có nhạc nào đang phát.");
    }

    destroyQueue(message.client, message.guild.id);
    await message.reply("⏹️ Đã dừng nhạc và rời voice channel.");
  },
};
