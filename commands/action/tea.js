const BaseCommand = require('../../core/BaseCommand');
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

const teaEmoji = '🍵'; 
const ownerId = process.env.OWNER_ID;
const COOLDOWN = 300;

class TeaCommand extends BaseCommand {
  constructor() {
    super({
      name: 'tea',
      description: 'Tặng hoặc tự thưởng trà',
      usage: `${config.prefix}tea [@user]`,
      examples: [
        { intent: 'Tự thưởng trà cho mình', command: `${config.prefix}tea` },
        { intent: 'Thưởng trà cho người khác', command: `${config.prefix}tea @PlayerName` }
      ],
      cooldown: 0 // handled manually to allow owner bypass
    });
  }

  async execute(message, args) {
    const authorId = message.author.id;

    if (authorId !== ownerId) {
      const remainingCooldown = checkAndSetCooldown(authorId, 'tea', COOLDOWN);
      if (remainingCooldown > 0) {
        return notifyCooldown(message, remainingCooldown);
      }
    }

    const userRepository = message.client.services.get('userRepository');
    let authorUser = await userRepository.getOrCreate(authorId);
    
    if (authorUser.tea === undefined) authorUser.tea = 0;

    if (!args.length) {
      authorUser.tea += 1;
      await authorUser.save();

      return message.reply(
        `${teaEmoji} | Bạn vừa tự thưởng cho mình 1 tách **trà**! Giờ bạn có **${authorUser.tea} tách**.`
      );
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn phải tag một người dùng hợp lệ!`);
    }

    if (userMention.id === authorId) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không thể tặng trà cho chính mình khi đã dùng tag!`);
    }

    if (authorId !== ownerId) {
      if (authorUser.tea <= 0) {
        throw new UserFriendlyError(`${config.emoji.no} Bạn không còn tách trà nào để tặng!`);
      }
      authorUser.tea -= 1;
      await authorUser.save();
    }

    let targetUser = await userRepository.getOrCreate(userMention.id);
    if (targetUser.tea === undefined) targetUser.tea = 0;

    targetUser.tea += 1;
    await targetUser.save();

    const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;
    const targetDisplayName = message.guild.members.cache.get(userMention.id)?.displayName || userMention.username;
    
    await message.channel.send(
      `${teaEmoji} **| ${authorDisplayName}** vừa tặng 1 tách trà cho **${targetDisplayName}**!\n` +
      `Bạn còn lại **${authorUser.tea} tách trà**.`
    );
  }
}

module.exports = new TeaCommand();
