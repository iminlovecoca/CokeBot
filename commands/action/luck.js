const config = require('../../data/config');
const User = require('../../models/User');
const { checkAndSetCooldown } = require('../../utils/cooldown')
const COOLDOWN = 5 * 60;

async function getUserLuck(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({ userId, luck: 0 });
    await user.save();
  }
  return user;
}

module.exports = {
  name: 'pray',
  aliases: ['luck'],
  description: 'Cầu may cho bản thân hoặc người khác',
  usage: `${config.prefix}pray [@user]`,
  examples: [
    { intent: 'Cầu may cho chính mình', command: `${config.prefix}pray` },
    { intent: 'Cầu may cho người khác', command: `${config.prefix}pray @PlayerName` }
  ],
  async execute(message, args) {
    const authorId = message.author.id;

    const cd = checkAndSetCooldown(authorId, 'pray', COOLDOWN)
    if (cd > 0) {
      const minutes = Math.floor(cd / 60);
      const seconds = cd % 60;
      let timeString = '';
      if (minutes > 0) timeString += `${minutes} phút`;
      if (minutes > 0 && seconds > 0) timeString += ' ';
      if (seconds > 0) timeString += `${seconds} giây`;

      return message.reply(`⏱ **|** Vui lòng chờ **${timeString}** để sử dụng lại lệnh.`);
    }

    let target = message.mentions.users.first() || message.author;

    let authorUser = await getUserLuck(authorId);
    let targetUser = await getUserLuck(target.id);

    let reply;

    if (target.id === authorId) {
      authorUser.luck += 1;
      await authorUser.save();

      const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;

      reply = `🙏 **|** **${authorDisplayName}** đã cầu may cho chính mình!\n` +
              `<:blank:1403928807395819671> **|** Bạn hiện có **${authorUser.luck}** điểm may mắn.`;
    } else {
      authorUser.luck -= 1;
      targetUser.luck += 1;

      await authorUser.save();
      await targetUser.save();

      const { updateQuestProgress } = require("../../utils/questUtil");
      await updateQuestProgress(target.id, "pray", 1, message.channel);

      const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;
      const targetDisplayName = message.guild.members.cache.get(target.id)?.displayName || target.username;

      reply = `🙏 **|** **${authorDisplayName}** đã cầu may cho **${targetDisplayName}**!\n` +
              `<:blank:1403928807395819671> **|** Bạn hiện có **${authorUser.luck}** điểm may mắn.`;
    }

    message.channel.send(reply);
  }
};
