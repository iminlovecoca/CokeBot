const User = require('../models/User');
const { setCooldown, getRemainingCooldown } = require('../utils/cooldown');
const { formatCurrency } = require('../utils/format');

module.exports = {
  name: 'cash',
  async execute(message) {
    const userId = message.author.id;
    const name = message.author.username;
    const cooldownSeconds = 3;

    const remaining = getRemainingCooldown(userId, 'cash');
    if (remaining > 0) {
      const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining}** giây`);
      let count = remaining;
      const interval = setInterval(async () => {
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

    let user = await User.findOne({ userId });
    if (!user) user = await User.create({ userId });

    const formatted = formatCurrency(user.coke);
    const emoji = '<:Economy_Cowoncy:1386429292883214397>';

    await message.reply(`${emoji} | **${name}**, bạn hiện có **${formatted} coke**.`);

    setCooldown(userId, 'cash', cooldownSeconds);
  }
};
