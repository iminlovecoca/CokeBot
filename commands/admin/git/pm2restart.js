const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isDev } = require("../../../utils/userUtil");
const { UserFriendlyError } = require("../../../utils/errors");
const config = require("../../../data/config");
const BaseCommand = require("../../../core/BaseCommand");

/**
 * Dynamically resolves the absolute path to pm2 binary on Linux / Windows.
 * Solves the "/bin/sh: 1: pm2: not found" error when executing in non-interactive shell.
 */
function getPm2Command() {
  const nodeDir = path.dirname(process.execPath);

  // 1. Check right beside the running node binary (NVM global bin or system bin)
  const candidates = [
    path.join(nodeDir, 'pm2'),
    path.join(nodeDir, 'pm2.cmd'),
    path.join(nodeDir, 'pm2.ps1'),
    '/usr/local/bin/pm2',
    '/usr/bin/pm2',
    path.join(process.cwd(), 'node_modules', '.bin', 'pm2'),
    path.join(process.cwd(), 'node_modules', '.bin', 'pm2.cmd'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `"${candidate}"`;
    }
  }

  // 2. Check NVM versions directory
  const home = process.env.HOME || (process.env.HOMEDRIVE && process.env.HOMEPATH ? `${process.env.HOMEDRIVE}${process.env.HOMEPATH}` : null);
  if (home) {
    const nvmDir = path.join(home, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvmDir)) {
      try {
        const versions = fs.readdirSync(nvmDir);
        for (const v of versions) {
          const pm2Path = path.join(nvmDir, v, 'bin', 'pm2');
          if (fs.existsSync(pm2Path)) {
            return `"${pm2Path}"`;
          }
        }
      } catch {}
    }

    const npmGlobal = path.join(home, '.npm-global', 'bin', 'pm2');
    if (fs.existsSync(npmGlobal)) {
      return `"${npmGlobal}"`;
    }
  }

  // 3. Fallback to system command
  return 'pm2';
}

/**
 * Builds an enhanced environment PATH including Node and standard Linux bin directories.
 */
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
    const pm2Bin = getPm2Command();
    const env = getExecutionEnv();

    const sentMessage = await message.reply(`⏳ Đang khởi động lại ứng dụng **${appName}** bằng PM2...`).catch(() => null);

    exec(`${pm2Bin} restart ${appName}`, { env }, (error, stdout, stderr) => {
      let output = '';
      if (error) {
        output += `❌ **Lỗi:**\n\`\`\`bash\n${error.message}\n\`\`\``;
        output += `\n💡 *Gợi ý: Nếu tên app không phải \`${appName}\`, thử gõ \`${config.prefix}pm2restart all\` hoặc \`${config.prefix}pm2restart 0\`*`;
      }
      if (stderr) {
        output += `\n⚠️ **Cảnh báo (stderr):**\n\`\`\`bash\n${stderr}\n\`\`\``;
      }
      if (stdout) {
        output += `\n📋 **Kết quả (stdout):**\n\`\`\`bash\n${stdout}\n\`\`\``;
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
