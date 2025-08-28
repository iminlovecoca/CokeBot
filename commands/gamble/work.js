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
  'đào vàng trong hang núi 🪙',
  'bán hàng online 📱',
  'chạy Grab giao đồ ăn 🍔',
  'đi săn kho báu 🏴‍☠️',
  'chơi nhạc ở quán bar 🎶',
  'đi bán vé số 🎟️',
  'làm kỹ sư xây dựng 🏗️',
  'đào coin trong phòng server ⛓️',
  'bán cà phê vỉa hè ☕',
  'đi diễn hài kịch 🎭',
  'bán kem dạo 🍦',
  'làm shipper 🛵',
  'sửa xe máy 🛠️',
  'chăn bò 🐄',
  'trồng cây cảnh 🌱',
  'dạy học thêm 📚',
  'viết content ✍️',
  'làm MC sự kiện 🎤',
  'đi làm bảo vệ 🛡️',
  'nhặt ve chai ♻️',
  'đi câu cá 🎣',
  'bán hoa ngoài chợ 🌸',
  'làm đầu bếp 🍳',
  'pha chế bartender 🍹',
  'quản lý quán net 🎮',
  'làm thợ may 👕',
  'đi chụp ảnh thuê 📸',
  'thợ xăm hình 💉',
  'bán pháo hoa đêm giao thừa 🎆',
  'làm phi công ✈️',
  'đi săn rồng 🐉',
  'khai thác dầu 🛢️',
  'làm bác sĩ 👨‍⚕️',
  'làm nhà ảo thuật 🎩',
  'làm ca sĩ sân khấu 🎤',
  'làm cầu thủ bóng đá ⚽',
  'bán vàng mã 🪦',
];

module.exports = {
  name: 'work',
  aliases: ['blackjack', '21'],
  description: 'Làm việc mỗi 3 giờ để nhận coke',

  async execute(message) {
    const userId = message.author.id;
    const user = await User.findOne({ userId }) || await User.create({ userId });

    const now = Date.now();
    const cooldown = 3 * 60 * 60 * 1000; 

    if (!user.lastWork) user.lastWork = 0;
    const remaining = cooldown - (now - user.lastWork);

    if (remaining > 0) {
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return message.reply(`⏱ | Bạn cần chờ **${h}h ${m}m ${s}s** nữa để làm việc lại.`);
    }

    const reward = Math.floor(Math.random() * (26000 - 5000 + 1)) + 5000;
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    user.coke += reward;
    user.lastWork = now;
    await user.save();

    return message.reply(`💼 Bạn vừa **${job}** và nhận được **${reward.toLocaleString()} coke**!`);
  }
};
