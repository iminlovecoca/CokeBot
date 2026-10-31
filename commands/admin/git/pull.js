const { exec } = require('child_process');
const path = require('path');
const { isDev } = require("../../../utils/userUtil");
const { UserFriendlyError } = require("../../../utils/errors");
const config = require("../../../data/config");
const BaseCommand = require("../../../core/BaseCommand");

function getExecutionEnv() {
  const nodeDir = path.dirname(process.execPath);
  const home = process.env.HOME || '';
  const delimiter = process.platform === 'win32' ? ';' : ':';

  const paths = [
    nodeDir,
    process.env.PATH,
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    home ? path.join(home, '.nvm', 'versions', 'node') : null,
    home ? path.join(home, '.npm-global', 'bin') : null,
  ].filter(Boolean);

  return {
    ...process.env,
    PATH: paths.join(delimiter),
  };
}

class PullCommand extends BaseCommand {
  constructor() {
    super({
      name: 'pull',
      aliases: ['gitpull', 'gpull'],
      description: 'Cập nhật (pull) code mới nhất từ kho lưu trữ Git trên VPS',
      usage: `${config.prefix}pull`,
      category: 'admin',
      cooldown: 0
    });
  }

  async execute(message) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`);
    }

    const sentMessage = await message.reply('⏳ Đang tiến hành `git pull`...').catch(() => null);
    const env = getExecutionEnv();

    exec('git pull', { env }, (error, stdout, stderr) => {
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
        output = '✅ Tiến hành `git pull` hoàn tất (không có phản hồi).';
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

module.exports = new PullCommand();
