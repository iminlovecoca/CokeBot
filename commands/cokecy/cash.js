const BaseCommand = require('../../core/BaseCommand');
const { formatVNCurrency } = require('../../utils/format');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

class CashCommand extends BaseCommand {
  constructor() {
    super({
      name: 'cash',
      aliases: ['money', 'balance'],
      description: 'Xem số coke hiện có của bạn hoặc người khác',
      usage: `${config.prefix}cash [@user]`,
      examples: [
        { intent: 'Xem số dư của bạn', command: `${config.prefix}cash` },
        { intent: 'Xem số dư của người khác (Dành cho Admin)', command: `${config.prefix}cash @PlayerName` }
      ],
      cooldown: 3
    });
  }

  async execute(message, args) {
    const userId = message.author.id;
    let targetId = userId;
    let displayName = message.member?.displayName || message.author.displayName || message.author.username;

    if (args.length && message.mentions.users.size > 0) {
      const targetUser = message.mentions.users.first();
      const userService = message.client.services.get('userService');
      
      if (!userService.isDev(userId) && !userService.isAdmin(userId)) {
        throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền xem số coke của người khác.`);
      }
      targetId = targetUser.id;
      const targetMember = message.mentions.members?.first();
      displayName = targetMember?.displayName || targetUser.displayName || targetUser.username;
    }

    const userRepository = message.client.services.get('userRepository');
    const user = await userRepository.getOrCreate(targetId);
    
    await message.reply(`${config.emoji.money} **|** **${displayName}**, hiện có **__${formatVNCurrency(user.coke || 0)}__ coke**!`);
  }
}

module.exports = new CashCommand();