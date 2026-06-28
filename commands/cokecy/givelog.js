const BaseCommand = require('../../core/BaseCommand');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

class GiveLogCommand extends BaseCommand {
  constructor() {
    super({
      name: 'givelog',
      description: '📜 Xem lịch sử chuyển và nhận coke trong 30 ngày gần nhất',
      usage: `${config.prefix}givelog [@user]`,
      cooldown: 5
    });
  }

  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const userService = message.client.services.get('userService');
    
    if (target.id !== message.author.id && !userService.isDev(message.author.id) && !userService.isAdmin(message.author.id)) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn chỉ có thể xem lịch sử của chính mình.`);
    }

    const userRepository = message.client.services.get('userRepository');
    const user = await userRepository.getOrCreate(target.id);
    
    const transferLog = (user.transferHistory || []).filter(t => {
      const date = new Date(t.date);
      return Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).slice(-20).reverse();

    const receiveLog = (user.receiveHistory || []).filter(r => {
      const date = new Date(r.date);
      return Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).slice(-20).reverse();

    const formatLine = (name, amt, date) =>
      `${name} | ${amt.toLocaleString()} | ${date.toLocaleString('vi-VN')}`;

    let text = `\`\`\`md\n< Giao dịch gần đây của ${target.username} >\n`;

    text += '\n[🔁 Chuyển tiền]:\n';
    if (transferLog.length === 0) text += 'Không có.\n';
    else {
      for (const t of transferLog) {
        const userTo = await message.client.users.fetch(t.to).catch(() => null);
        text += formatLine(userTo?.username || 'Ẩn danh', t.amount, new Date(t.date)) + '\n';
      }
    }

    text += '\n[💰 Nhận tiền]:\n';
    if (receiveLog.length === 0) text += 'Không có.\n';
    else {
      for (const r of receiveLog) {
        const userFrom = await message.client.users.fetch(r.from).catch(() => null);
        text += formatLine(userFrom?.username || 'Ẩn danh', r.amount, new Date(r.date)) + '\n';
      }
    }

    text += '```';

    return message.channel.send(text);
  }
}

module.exports = new GiveLogCommand();
