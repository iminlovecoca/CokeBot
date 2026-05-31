const config = require("../../data/config");
const { skipQueue } = require("../../utils/musicPlayer");

module.exports = {
  name: "skip",
  aliases: ["next"],
  description: "Bỏ qua bài hát hiện tại.",
  usage: `${config.prefix}skip`,
  async execute(message) {
    await skipQueue(message.client, message.guild.id);
    await message.reply("⏭️ Đã bỏ qua bài hiện tại.");
  },
};
