const User = require('../../models/User');
const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');
const { formatVNCurrency } = require('../../utils/format');

const allowedViewers = ['745950731638407210', '858603090289623100'];

module.exports = {
  name: 'cash',
  async execute(message, args) {
    const userId = message.author.id;
    const cooldownSeconds = 3;

    const remaining = getRemainingCooldown(userId, 'cash');
    if (remaining > 0) {
      const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining}** giây`);
      let count = remaining;
      const interval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          msg.delete().catch(() => {});
        } else {
          msg.edit(`⏱ | Vui lòng chờ **${count}** giây`);
        }
      }, 1000);
      return;
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
        return message.reply('🚫 | Bạn không có quyền xem số coke của người khác.');
      }
    }

    let user = await User.findOne({ userId: targetId });
    if (!user) user = await User.create({ userId: targetId });

    const formatted = formatVNCurrency(user.coke);
    const emoji = '<:money2:1403773842832359505>';

    await message.reply(`${emoji} | **${displayName}**, hiện có **${formatted} coke**.`);

    setCooldown(userId, 'cash', cooldownSeconds);
  }
};
