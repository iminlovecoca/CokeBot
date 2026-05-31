const config = require("../../data/config");
const { resumeQueue } = require("../../utils/musicPlayer");

module.exports = {
  name: "resume",
  aliases: ["unpause"],
  description: "Tiếp tục phát bài nhạc đang tạm dừng.",
  usage: `${config.prefix}resume`,
  async execute(message) {
    resumeQueue(message.client, message.guild.id);
    await message.reply("▶️ Đã tiếp tục phát nhạc.");
  },
};
