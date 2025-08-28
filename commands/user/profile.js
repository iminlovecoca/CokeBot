const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const User = require('../../models/User');

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

function getRankEmoji(level) {
  if (level <= 10) return 'Common';
  if (level <= 20) return 'Uncommon';
  if (level <= 30) return 'Rare';
  if (level <= 40) return 'Epic';
  if (level <= 50) return 'Mysthic';
  if (level <= 60) return 'Legendary';
  return 'Ancient';
}

module.exports = {
  name: 'profile',
  description: 'Hiển thị hồ sơ người chơi bằng hình ảnh',

  async execute(message) {
    const user = message.author;
    let userData = await User.findOne({ userId: user.id });
    if (!userData) {
      userData = await User.create({ userId: user.id, level: 1, xp: 0, coke: 0 });
    }

    const today = new Date().toISOString().split('T')[0];
    if (userData.lastXpDate !== today) {
      userData.dailyXp = 0;
      userData.lastXpDate = today;
    }

    if (userData.dailyXp < 3000) {
      const gain = Math.min(10, 3000 - userData.dailyXp);
      userData.xp += gain;
      userData.dailyXp += gain;

      while (userData.xp >= getXpNeeded(userData.level)) {
        userData.xp -= getXpNeeded(userData.level);
        userData.level++;
        userData.coke += 10000 + (userData.level - 1) * 5000;
      }

      await userData.save();
    }

    const xpNeed = getXpNeeded(userData.level);
    const xpPercent = userData.xp / xpNeed;

    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    const bgPath = path.join(__dirname, '../assets/backgrounds/bg1.png');
    const bg = await loadImage(bgPath);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    const boxWidth = 600;
    const boxHeight = 160;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = 45;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.moveTo(boxX + 20, boxY);
    ctx.lineTo(boxX + boxWidth - 20, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + 20);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - 20);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - 20, boxY + boxHeight);
    ctx.lineTo(boxX + 20, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - 20);
    ctx.lineTo(boxX, boxY + 20);
    ctx.quadraticCurveTo(boxX, boxY, boxX + 20, boxY);
    ctx.closePath();
    ctx.fill();

    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(boxX + 70, boxY + boxHeight / 2, 50, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, boxX + 20, boxY + boxHeight / 2 - 50, 100, 100);
    ctx.restore();

    const textStartX = boxX + 140;
    let currentY = boxY + 45;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(message.member?.displayName || user.username, textStartX, currentY);


    const barY = currentY + 10;
    const barLength = 300;
    ctx.fillStyle = '#888';
    ctx.fillRect(textStartX, barY, barLength, 10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(textStartX, barY, barLength * xpPercent, 10);

    const xpText = `${userData.xp}/${xpNeed} XP`;
    ctx.font = 'bold 14px Arial';
    const xpTextWidth = ctx.measureText(xpText).width;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(xpText, textStartX + barLength + 10, barY + 9);

    currentY += 45;
    ctx.font = '18px Arial';
    ctx.fillText(`🏆 Level: ${userData.level}`, textStartX, currentY);

    currentY += 25;
    ctx.fillText(`🔰 Rank: ${getRankEmoji(userData.level)}`, textStartX, currentY);

    currentY += 25;
    ctx.fillText(`💰 Coke: ${userData.coke.toLocaleString()}`, textStartX, currentY);

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
    return message.reply({ files: [attachment] });
  }
};
