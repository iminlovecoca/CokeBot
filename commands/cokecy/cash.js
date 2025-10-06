const User = require('../../models/User');
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown')
const { formatVNCurrency } = require('../../utils/format');
const config = require('../../data/config')

const allowedViewers = ['745950731638407210', '858603090289623100'];

module.exports = {
  name: 'cash',
  aliases: ['money', 'balance'],
  description: 'Xem số coke hiện có của bạn hoặc người khác',

  async execute(message, args) {
    const userId = message.author.id;
    const cooldownSeconds = 3;

    const remainingCooldown = checkAndSetCooldown(userId, 'cash', cooldownSeconds)
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown)
    }

    let targetId = userId;
    let displayName = message.member.displayName;

    if (args.length && message.mentions.users.size > 0) {
      const mention = message.mentions.users.first();
      if (allowedViewers.includes(userId)) {
        targetId = mention.id;
        const member = await message.guild.members.fetch(targetId).catch(() => null);
        displayName = member?.displayName || mention.username;
      } else {
        return message.reply('🚫 **|** Bạn không có quyền xem số coke của người khác.');
      }
    }

    let user = await User.findOne({ userId: targetId });
    if (!user) user = await User.create({ userId: targetId });

    const formatted = formatVNCurrency(user.coke);
    const emoji = config.emoji.money;

    await message.reply(`${emoji} **|** **${displayName}**, hiện có **${formatted} coke**.`);
  }
};
