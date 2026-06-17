const { isDev } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "restart",
  aliases: ["rs", "reboot"],
  description: "Khởi động lại tiến trình Bot (PM2 sẽ tự động bật lại).",
  category: "admin",
  usage: `${config.prefix}restart`,
  examples: [
    { intent: "Khởi động lại bot Coke", command: `${config.prefix}restart` }
  ],

  async execute(message) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền sử dụng lệnh này!`,
      );
    }

    await message.reply(`${config.emoji.yes} **|** Đang tiến hành tắt tiến trình Bot... PM2 sẽ tự động khởi động lại bot ngay lập tức!`);
    
    // Đợi 1 giây để gửi xong tin nhắn rồi tắt bot
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
