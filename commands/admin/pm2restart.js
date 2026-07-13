const { exec } = require('child_process');
const { isDev } = require('../../utils/userUtil');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');
const BaseCommand = require('../../core/BaseCommand');

class Pm2RestartCommand extends BaseCommand {
  constructor() {
    super({
      name: 'pm2restart',
      aliases: ['restart', 'pm2r'],
      description: 'Khởi động lại bot qua PM2 trên VPS',
      usage: `${config.prefix}pm2restart [tên_app]`,
      category: 'admin',
      cooldown: 0
    });
  }

  async execute(message, args = []) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`);
    }

    const appName = args[0] || 'CokeBot';
    const sentMessage = await message.reply(`⏳ Đang khởi động lại ứng dụng **${appName}** bằng PM2...`).catch(() => null);

    exec(`pm2 restart ${appName}`, (error, stdout, stderr) => {
      let output = '';
      if (error) {
        output += `❌ **Lỗi:**\n\`\`\`bash\n${error.message}\n\`\`\``;
      }
      if (stderr) {
        output += `⚠️ **Cảnh báo (stderr):**\n\`\`\`bash\n${stderr}\n\`\`\``;
      }
      if (stdout) {
        output += `📋 **Kết quả (stdout):**\n\`\`\`bash\n${stdout}\n\`\`\``;
      }

      if (!output) {
        output = `✅ Tiến hành khởi động lại **${appName}** hoàn tất (không có phản hồi).`;
      }

      if (output.length > 2000) {
        output = output.substring(0, 1900) + '\n... (Đầu ra bị cắt bớt vì quá dài)';
      }

      if (sentMessage) {
        sentMessage.edit(output).catch(() => message.channel.send(output).catch(() => null));
      } else {
        message.channel.send(output).catch(() => null);
      }
    });
  }
}

module.exports = new Pm2RestartCommand();
