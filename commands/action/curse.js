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
  name: 'curse',
  aliases: ['unluck'],
  description: 'Nguyền rủa người khác hoặc chính mình, giảm điểm Luck',
  usage: `${config.prefix}curse [@user]`,
  examples: [
    { intent: 'Tự nguyền rủa mình', command: `${config.prefix}curse` },
    { intent: 'Nguyền rủa người khác', command: `${config.prefix}curse @PlayerName` }
  ],
  async execute(message, args) {
    const authorId = message.author.id;

    const cd = checkAndSetCooldown(authorId, 'curse', COOLDOWN)
    if (cd > 0) {
      const minutes = Math.floor(cd / 60);
      const seconds = cd % 60;
      let timeString = '';
      if (minutes > 0) timeString += `${minutes} phút`;
      if (minutes > 0 && seconds > 0) timeString += ' ';
      if (seconds > 0) timeString += `${seconds} giây`;

      return message.reply(`⏱ | Vui lòng chờ **${timeString}** để sử dụng lại lệnh.`);
    }

    let target = message.mentions.users.first() || message.author;

    let authorUser = await getUserLuck(authorId);
    let targetUser = await getUserLuck(target.id);

    let reply;

    if (target.id === authorId) {
      targetUser.luck -= 1;
      await targetUser.save();

      const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;

      reply = `👻 **|** **${authorDisplayName}** đã tự nguyền rủa chính mình!\n` +
              `<:blank:1403928807395819671> **|** Bạn hiện có **${targetUser.luck}** điểm may mắn.`;
    } else {
      targetUser.luck -= 1;
      authorUser.luck += 1;

      await targetUser.save();
      await authorUser.save();

      const { updateQuestProgress } = require("../../utils/questUtil");
      await updateQuestProgress(target.id, "curse", 1, message.channel);

      const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;
      const targetDisplayName = message.guild.members.cache.get(target.id)?.displayName || target.username;

      reply = `👻 **|** **${authorDisplayName}** đã nguyền rủa **${targetDisplayName}**!\n` +
              `<:blank:1403928807395819671> **|** Bạn hiện có **${authorUser.luck}** điểm may mắn.`;
    }

    message.channel.send(reply);
  }
};
