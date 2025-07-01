const { createCanvas, loadImage, registerFont } = require('canvas');
const User = require('../models/User');
const { AttachmentBuilder } = require('discord.js');
const axios = require('axios');

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

module.exports = {
  name: 'profile',
  async execute(message) {
    const userId = message.author.id;
    let user = await User.findOne({ userId });
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
        user.coke += 1000; // Thưởng lên cấp
      }

      await user.save();
    }

    const width = 600, height = 150;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background 
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, width, height);

    // Draw avatar
    const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 });
    const avatar = await loadImage(await axios.get(avatarURL, { responseType: 'arraybuffer' }).then(res => res.data));
    ctx.drawImage(avatar, 25, 25, 100, 100);

    // Text styles
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(message.author.username, 140, 35);

    ctx.font = '18px Arial';
    ctx.fillText('Coke user', 140, 60);

    // Rank and XP
    const xpNeed = getXpNeeded(user.level);
    const xpPercent = user.xp / xpNeed;
    ctx.font = '16px Arial';
    ctx.fillText(`Rank: #${(user.rank || 1).toLocaleString()} XP: ${user.xp.toLocaleString()}/${xpNeed.toLocaleString()}`, 140, 90);

    // XP Bar
    ctx.fillStyle = '#555';
    ctx.fillRect(140, 100, 300, 10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(140, 100, 300 * xpPercent, 10);

    // Level
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`LVL ${user.level}`, 140, 135);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
    message.reply({ files: [attachment] });
  }
};
