const User = require('../models/User');

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

module.exports = {
  name: 'profile',
  async execute(message) {
    const userId = message.author.id;
    let user = await User.findOne({ userId });

    // Nếu chưa có user thì tạo mới
    if (!user) {
      user = await User.create({ userId, level: 1, xp: 0, coke: 0 });
    }

    // Cập nhật XP khi người chơi chat (mỗi tin nhắn +10 XP, giới hạn 3000/ngày)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (user.lastXpDate !== today) {
      user.dailyXp = 0;
      user.lastXpDate = today;
    }

    if (user.dailyXp < 3000) {
      const gain = Math.min(10, 3000 - user.dailyXp);
      user.xp += gain;
      user.dailyXp += gain;

      // Kiểm tra lên cấp
      while (user.xp >= getXpNeeded(user.level)) {
        user.xp -= getXpNeeded(user.level);
        user.level++;
        user.coke += 1000; // Thưởng khi lên cấp
      }

      await user.save();
    }

    const xpNeed = getXpNeeded(user.level);
    const xpPercent = Math.floor((user.xp / xpNeed) * 100);

    const reply = `
👤 **${message.author.username}** — Profile
📈 Level: **${user.level}**
✨ XP: **${user.xp}/${xpNeed}** (${xpPercent}%)
💰 Coke: **${user.coke.toLocaleString()}**
🏅 Rank: #${user.rank || 1}
    `;
    message.reply(reply);
  }
};
