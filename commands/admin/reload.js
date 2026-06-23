const path = require("path");
const fs = require("fs");
const { isDev } = require("../../utils/userUtil");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");

module.exports = {
  name: "reload",
  aliases: ["rld", "reld"],
  description: "Tải lại (Hot-reload) một lệnh hoặc tệp cấu hình mà không cần khởi động lại bot.",
  usage: `${config.prefix}reload <tên_lệnh|config>`,
  examples: [
    { intent: "Tải lại tệp cấu hình config.js", command: `${config.prefix}reload config` },
    { intent: "Tải lại mã nguồn lệnh boss", command: `${config.prefix}reload boss` }
  ],

  async execute(message, args) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có quyền sử dụng lệnh này!`,
      );
    }

    if (args.length < 1) {
      throw new UserFriendlyError(
        `${config.emoji.no} Cú pháp không hợp lệ. Sử dụng: \`${this.usage}\``,
      );
    }

    const target = args[0].toLowerCase();
    const client = message.client;

    if (target === "config") {
      try {
        const configPath = path.resolve(__dirname, "../../data/config.js");
        
        if (require.cache[configPath]) {
          delete require.cache[configPath];
        }
        
        // Thử require lại để kiểm tra cú pháp và nạp lại vào bộ nhớ đệm cache
        require("../../data/config");

        return message.reply(`${config.emoji.yes} **|** Đã xóa cache của \`data/config.js\` thành công. Các lệnh được reload sau đây sẽ áp dụng cấu hình mới.`);
      } catch (err) {
        return message.reply(`${config.emoji.no} **|** Lỗi khi reload config: \`${err.message}\``);
      }
    }

    // Tìm lệnh trong client.commands hoặc client.noituCommands
    let cmd = client.commands.get(target) || [...client.commands.values()].find(c => c.aliases && c.aliases.includes(target));
    let isNoitu = false;

    if (!cmd) {
      cmd = client.noituCommands.get(target) || [...client.noituCommands.values()].find(c => c.aliases && c.aliases.includes(target));
      isNoitu = true;
    }

    if (!cmd) {
      throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy lệnh \`${target}\`!`);
    }

    const filePath = cmd.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy tệp tin của lệnh này trên hệ thống!`);
    }

    try {
      // Xóa cache của config trước nếu tồn tại, để lệnh mới nạp sẽ đọc config mới
      const configPath = path.resolve(__dirname, "../../data/config.js");
      if (require.cache[configPath]) {
        delete require.cache[configPath];
      }

      // Xóa cache của chính lệnh đó
      if (require.cache[require.resolve(filePath)]) {
        delete require.cache[require.resolve(filePath)];
      }

      // Load lại lệnh mới
      const newCmd = require(filePath);
      newCmd.filePath = filePath;
      
      // Gán category
      const relativePath = path.relative(path.resolve(__dirname, "../"), filePath);
      const pathParts = relativePath.split(path.sep);
      newCmd.category = pathParts.length > 1 ? pathParts[0].toLowerCase() : "general";

      if (isNoitu) {
        client.noituCommands.set(newCmd.name, newCmd);
      } else {
        client.commands.set(newCmd.name, newCmd);
      }

      return message.reply(`${config.emoji.yes} **|** Đã reload thành công lệnh \`${newCmd.name}\` từ đĩa!`);
    } catch (err) {
      return message.reply(`${config.emoji.no} **|** Lỗi khi reload lệnh \`${target}\`: \`${err.message}\``);
    }
  }
};
