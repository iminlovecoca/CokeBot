const teaEmoji = '🍵'; 
const ownerId = process.env.OWNER_ID;
const User = require('../../models/User');
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown')
const config = require('../../data/config')

module.exports = {
  name: 'tea',
  description: 'Tặng hoặc tự thưởng trà',
  async execute(message, args) {
    const authorId = message.author.id;

    if (authorId !== ownerId) {
      const remainingCooldown = checkAndSetCooldown(authorId, 'tea', 300)
      if (remainingCooldown > 0) {
        return notifyCooldown(message, remainingCooldown)
      }
    }

    let authorUser = await User.findOne({ userId: authorId });
    if (!authorUser) {
      authorUser = new User({ userId: authorId, tea: 0 });
    }

    if (!args.length) {
      authorUser.tea += 1;
      await authorUser.save();

      if (authorId !== ownerId) setCooldown(authorId, 'tea', 300);

      return message.reply(
        `${teaEmoji} | Bạn vừa tự thưởng cho mình 1 tách **trà**! Giờ bạn có **${authorUser.tea} tách**.`
      );
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply(`${config.emoji.no} Bạn phải tag một người dùng hợp lệ!`);
    }

    if (userMention.id === authorId) {
      return message.reply(`${config.emoji.no} Bạn không thể tặng trà cho chính mình khi đã dùng tag!`);
    }

    if (authorId !== ownerId) {
      if (authorUser.tea <= 0) {
        return message.reply(`${config.emoji.no} Bạn không còn tách trà nào để tặng!`);
      }
      authorUser.tea -= 1;
      await authorUser.save();
    }

    let targetUser = await User.findOne({ userId: userMention.id });
    if (!targetUser) {
      targetUser = new User({ userId: userMention.id, luck: 0, tea: 0 });
    }
    targetUser.tea += 1;
    await targetUser.save();

    const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;
    const targetDisplayName = message.guild.members.cache.get(userMention.id)?.displayName || userMention.username;
    return message.channel.send(
      `${teaEmoji} **| ${authorDisplayName}** vừa tặng 1 tách trà cho **${targetDisplayName}**!\n` +
      `Bạn còn lại **${authorUser.tea} tách trà**.`
    );
  }
};
