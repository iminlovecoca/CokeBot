const BaseCommand = require('../../core/BaseCommand');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const config = require('../../data/config');
const path = require('path');
const User = require('../../models/User');

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getRankInfo(level) {
  if (level <= 10) return { key: 'common', name: 'Common' };
  if (level <= 20) return { key: 'rare', name: 'Rare' };
  if (level <= 30) return { key: 'epic', name: 'Epic' };
  if (level <= 40) return { key: 'legendary', name: 'Legendary' };
  if (level <= 50) return { key: 'mythic', name: 'Mythic' };
  if (level <= 60) return { key: 'ancient', name: 'Ancient' };
  return { key: 'divine', name: 'Divine' };
}

class RankCommand extends BaseCommand {
  constructor() {
    super({
      name: 'rank',
      aliases: ['level', 'lvl'],
      description: '🔰 Xem cấp bậc rank và level bằng hình ảnh Canvas.',
      usage: `${config.prefix}rank [@user]`,
      examples: [
        { intent: 'Xem thông tin level và rank của bạn', command: `${config.prefix}rank` },
        { intent: 'Xem level của người khác', command: `${config.prefix}rank @Khang` }
      ],
      category: 'user'
    });
  }

  async execute(message, args, client, locator) {
    const userService = locator.get('userService');
    const targetUser = message.mentions.users.first() || message.author;
    let user = await userService.getUser(targetUser.id);
    const xpNeed = userService.getUserXpNeeded(user.level);
    const xpPercent = Math.min(1, Math.max(0, user.xp / xpNeed));

    const globalRank = await User.countDocuments({
      $or: [
        { level: { $gt: user.level } },
        { level: user.level, xp: { $gt: user.xp } }
      ]
    }).catch(() => 0) + 1;

    const width = 750;
    const height = 240;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgPath = path.join(__dirname, '../../assets/backgrounds/profile-bg.png');
    try {
      const bg = await loadImage(bgPath);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#19082b');
      gradient.addColorStop(1, '#140624');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(18, 20, 26, 0.78)';
    roundRect(ctx, 15, 15, width - 30, height - 30, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const avatarX = 25;
    const avatarY = 25;
    const avatarSize = 190;
    const avatarRadius = 12;

    ctx.save();
    roundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
    ctx.clip();
    try {
      const avatarImg = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      ctx.fillStyle = '#333';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    ctx.save();
    roundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Draw Unified Rank Frame around Avatar Container
    const { drawRankFrame } = require('../../utils/rankFrameUtil');
    drawRankFrame(ctx, avatarX - 2, avatarY - 2, avatarSize + 4, avatarSize + 4, user.rpg?.battleRank || 'Unranked', { radius: avatarRadius + 2, borderWidth: 3.5 });

    const displayName = message.guild?.members.cache.get(targetUser.id)?.displayName || targetUser.displayName || targetUser.username;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Arial';
    ctx.fillText(displayName, 240, 65);

    const textWidth = ctx.measureText(displayName).width;
    const rankInfo = getRankInfo(user.level);
    const rankImgPath = path.join(__dirname, `../../assets/ranks/png/${rankInfo.key}.png`);
    try {
      const rankImg = await loadImage(rankImgPath);
      ctx.drawImage(rankImg, 240 + textWidth + 12, 38, 32, 32);
    } catch {}

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = 'italic 18px Arial';
    ctx.fillText(`Hạng toàn server: #${globalRank.toLocaleString()}`, 240, 95);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px Arial';
    ctx.fillText(`LVL ${user.level}`, 240, 172);
    ctx.restore();

    const rightStartX = 380;

    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Rank: #${globalRank.toLocaleString()}`, rightStartX, 148);

    const xpText = `XP: ${user.xp.toLocaleString()}/${xpNeed.toLocaleString()}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(xpText, 710, 148);
    ctx.textAlign = 'left';

    const barY = 162;
    const barW = 330;
    const barH = 18;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, rightStartX, barY, barW, barH, 9);
    ctx.fill();

    if (xpPercent > 0) {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, rightStartX, barY, Math.max(18, barW * xpPercent), barH, 9);
      ctx.fill();
    }
    ctx.restore();

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'level.png' });
    return message.reply({ files: [attachment] });
  }
}

module.exports = new RankCommand();
