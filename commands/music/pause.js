const config = require("../../data/config");
const { pauseQueue } = require("../../utils/musicPlayer");

module.exports = {
  name: "pause",
  aliases: ["hold"],
  description: "Tạm dừng bài nhạc đang phát.",
  usage: `${config.prefix}pause`,
  async execute(message) {
    pauseQueue(message.client, message.guild.id);
    await message.reply("⏸️ Đã tạm dừng nhạc.");
  },
};
