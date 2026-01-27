const danisaEmoji = '<:danisa:1404057793920635043>';
const ownerId = process.env.OWNER_ID;
const User = require('../../models/User');
const { checkAndSetCooldown } = require('../../utils/cooldown')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')
const COOLDOWN = 300;

module.exports = {
  name: 'cookie',
  description: 'Tặng hoặc tự thưởng bánh Danisa',
  async execute(message, args) {
    const authorId = message.author.id;

    if (authorId !== ownerId) {
      const cd = checkAndSetCooldown(authorId, 'cookie', COOLDOWN)
      if (cd > 0) {
        const minutes = Math.floor(cd / 60);
        const seconds = cd % 60;
        let timeString = '';
        if (minutes > 0) timeString += `${minutes} phút`;
        if (minutes > 0 && seconds > 0) timeString += ' ';
        if (seconds > 0) timeString += `${seconds} giây`;
        throw new UserFriendlyError(`⏱ | Bạn phải chờ **${timeString}** để dùng lại lệnh.`);
      }
    }

    let authorUser = await User.findOne({ userId: authorId });
    if (!authorUser) {
      authorUser = new User({ userId: authorId, cookie: 0 });
      await authorUser.save();
    }

    if (!args.length) {
      authorUser.cookie += 1;
      await authorUser.save();

      if (authorId !== ownerId) checkAndSetCooldown(authorId, 'cookie', COOLDOWN);

      return message.reply(
        `${danisaEmoji} **|** Bạn vừa tự thưởng cho mình 1 hộp bánh **Danisa**! Giờ bạn có **${authorUser.cookie} hộp.**`
      );
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn phải tag một người dùng hợp lệ!`);
    }

    if (userMention.id === authorId) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không thể tặng bánh **Danisa** cho chính mình!`);
    }

    if (authorId !== ownerId) {
      if (authorUser.cookie <= 0) {
        throw new UserFriendlyError(`${config.emoji.no} Bạn không còn hộp **Danisa** nào để tặng!`);
      }
      authorUser.cookie -= 1;
      await authorUser.save();
    }

    let targetUser = await User.findOne({ userId: userMention.id });
    if (!targetUser) {
      targetUser = new User({ userId: userMention.id, luck: 0, cookie: 0 });
      await targetUser.save();
    }

    targetUser.cookie += 1;
    await targetUser.save();

    const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;
    const targetDisplayName = message.guild.members.cache.get(userMention.id)?.displayName || userMention.username;
    await message.channel.send(
      `${danisaEmoji} **| ${authorDisplayName}** vừa tặng 1 hộp **Danisa** cho **${targetDisplayName}**!\n` +
      `📦 Bạn còn lại **${authorUser.cookie} hộp**.`
    );
  }
};
