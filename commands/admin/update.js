const { exec } = require("child_process");
const { isDev } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "update",
  aliases: ["pull", "up"],
  description: "Kéo mã nguồn mới nhất từ GitHub và tự động khởi động lại bot.",
  category: "admin",
  usage: `${config.prefix}update`,
  examples: [
    { intent: "Cập nhật bot từ GitHub", command: `${config.prefix}update` }
  ],

  async execute(message) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền sử dụng lệnh này!`,
      );
    }

    const replyMsg = await message.reply("🔄 **|** Đang kéo mã nguồn mới nhất từ GitHub...");

    exec("git pull", async (error, stdout, stderr) => {
      if (error) {
        return replyMsg.edit(`${config.emoji.no} **|** Lỗi khi chạy lệnh \`git pull\`:\n\`\`\`bash\n${error.message}\n\`\`\``);
      }

      let logMessage = stdout || "";
      if (stderr) {
        logMessage += `\nStderr:\n${stderr}`;
      }

      await replyMsg.edit(
        `${config.emoji.yes} **|** Đã chạy \`git pull\` thành công:\n\`\`\`text\n${logMessage.substring(0, 1500)}\n\`\`\`\n🔄 Đang khởi động lại bot...`
      );

      // Đợi 2 giây để tin nhắn được cập nhật xong rồi exit để PM2 restart bot
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    });
  }
};
