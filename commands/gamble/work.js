const User = require('../../models/User');

const jobs = [
  'làm tài xế 🚗',
  'làm streamer 🎥',
  'đi đào than ⛏️',
  'giao hàng 📦',
  'viết code cho bot 🤖',
  'làm nông dân 🌾',
  'bán trà sữa 🧋',
  'sửa máy tính 💻',
  'quét rác công viên 🧹',
  'làm nhân viên văn phòng 🖨️',
];

module.exports = {
  name: 'work',
  description: 'Làm việc mỗi 3 giờ để nhận coke',

  async execute(message) {
    const userId = message.author.id;
    const user = await User.findOne({ userId }) || await User.create({ userId });

    const now = Date.now();
    const cooldown = 3 * 60 * 60 * 1000; // 3 giờ

    if (!user.lastWork) user.lastWork = 0;
    const remaining = cooldown - (now - user.lastWork);

    if (remaining > 0) {
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return message.reply(`⏱ | Bạn cần chờ **${h}h ${m}m ${s}s** nữa để làm việc lại.`);
    }

    const reward = Math.floor(Math.random() * (25000 - 5000 + 1)) + 5000;
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    user.coke += reward;
    user.lastWork = now;
    await user.save();

    return message.reply(`💼 Bạn vừa **${job}** và nhận được **${reward.toLocaleString()} coke**!`);
  }
};
