const BaseCommand = require('../../core/BaseCommand');
const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const config = require('../../data/config');
const path = require('path');
const User = require('../../models/User');
const { getEquippedItems, getEquippedPet } = require('../../utils/rpgUtil');
const { PET_SPECIES } = require('../../data/pets');

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

const sanitizeText = (str) => {
  if (!str) return '';
  return str.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '').trim();
};

const extractEmojiId = (str) => {
  if (!str) return null;
  const match = str.match(/<a?:[a-zA-Z0-9_]+:(\d+)>/);
  return match ? match[1] : null;
};

class ProfileCommand extends BaseCommand {
  constructor() {
    super({
      name: 'profile',
      aliases: ['p', 'userprofile'],
      description: 'Hiển thị thẻ hồ sơ người chơi bằng hình ảnh Canvas.',
      usage: `${config.prefix}profile [@user]`,
      examples: [
        { intent: 'Xem hồ sơ của bạn', command: `${config.prefix}profile` },
        { intent: 'Xem hồ sơ của người khác', command: `${config.prefix}profile @Khang` }
      ],
      category: 'user'
    });
  }

  async execute(message, args, client, locator) {
    const userService = locator.get('userService');
    const targetUser = message.mentions.users.first() || message.author;
    let userData = await userService.getUser(targetUser.id);
    const today = new Date().toISOString().split('T')[0];

    if (userData.lastXpDate !== today) {
      userData.dailyXp = 0;
      userData.lastXpDate = today;
    }

    if (userData.dailyXp < 3000) {
      const gain = Math.min(10, 3000 - userData.dailyXp);
      userData.xp += gain;
      userData.dailyXp += gain;

      while (userData.xp >= userService.getUserXpNeeded(userData.level)) {
        userData.xp -= userService.getUserXpNeeded(userData.level);
        userData.level++;
        userData.coke += 10000 + (userData.level - 1) * 5000;
      }

      await userData.save().catch(() => {});
    }

    const globalRank = await User.countDocuments({
      $or: [
        { level: { $gt: userData.level } },
        { level: userData.level, xp: { $gt: userData.xp } }
      ]
    }).catch(() => 0) + 1;

    const xpNeed = userService.getUserXpNeeded(userData.level);
    const xpPercent = Math.min(1, Math.max(0, userData.xp / xpNeed));

    const width = 800;
    const height = 520;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bgPath = path.join(__dirname, '../../assets/backgrounds/profile-bg.png');
    try {
      const bg = await loadImage(bgPath);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1e1e2f');
      gradient.addColorStop(1, '#0f0f1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(18, 20, 26, 0.72)';
    roundRect(ctx, 20, 20, width - 40, height - 40, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const avatarX = 45;
    const avatarY = 40;
    const avatarSize = 100;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    try {
      const avatarImg = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      ctx.fillStyle = '#444';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    const displayName = message.guild?.members.cache.get(targetUser.id)?.displayName || targetUser.displayName || targetUser.username;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(displayName, 165, 75);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'italic 18px Arial';
    ctx.fillText(`Hạng toàn server: #${globalRank.toLocaleString()}`, 165, 105);
    ctx.restore();

    const card1Y = 155;
    const card1H = 95;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    roundRect(ctx, 45, card1Y, 710, card1H, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '15px Arial';
    ctx.fillText('Level', 70, card1Y + 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(String(userData.level), 70, card1Y + 70);

    const rankInfo = getRankInfo(userData.level);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Rank: #${globalRank.toLocaleString()}`, 200, card1Y + 40);

    const rankImgPath = path.join(__dirname, `../../assets/ranks/png/${rankInfo.key}.png`);
    try {
      const rankImg = await loadImage(rankImgPath);
      ctx.drawImage(rankImg, 160, card1Y + 22, 28, 28);
    } catch {}

    const xpText = `XP: ${userData.xp.toLocaleString()}/${xpNeed.toLocaleString()}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(xpText, 725, card1Y + 40);
    ctx.textAlign = 'left';

    const barX = 200;
    const barY = card1Y + 56;
    const barW = 525;
    const barH = 16;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, barX, barY, barW, barH, 8);
    ctx.fill();

    if (xpPercent > 0) {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, barX, barY, Math.max(16, barW * xpPercent), barH, 8);
      ctx.fill();
    }
    ctx.restore();

    const card2Y = 265;
    const card2H = 95;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    roundRect(ctx, 45, card2Y, 710, card2H, 12);
    ctx.fill();

    try {
      const cokeEmojiUrl = 'https://cdn.discordapp.com/emojis/1509951335016173662.png';
      const cokeImg = await loadImage(cokeEmojiUrl).catch(() => null);
      if (cokeImg) {
        ctx.drawImage(cokeImg, 70, card2Y + 34, 28, 28);
      }
    } catch {}

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`${userData.coke.toLocaleString()} Coke`, 106, card2Y + 56);

    const equippedItems = getEquippedItems(userData);
    const weapon = equippedItems.weapon;
    const cleanWeaponName = sanitizeText(weapon?.name || weapon?.id) || 'Tay Không';
    const weaponEmojiId = extractEmojiId(weapon?.emoji || weapon?.icon);

    let weaponX = 340;
    if (weaponEmojiId) {
      try {
        const weaponImg = await loadImage(`https://cdn.discordapp.com/emojis/${weaponEmojiId}.png`).catch(() => null);
        if (weaponImg) {
          ctx.drawImage(weaponImg, 340, card2Y + 24, 24, 24);
          weaponX = 370;
        }
      } catch {}
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Vũ khí: ${cleanWeaponName}`, weaponX, card2Y + 42);

    const equippedPet = getEquippedPet(userData);
    let petX = 340;

    if (equippedPet) {
      const petSpecies = (PET_SPECIES || []).find((s) => s.key === equippedPet.key);
      const petEmojiStr = equippedPet.emoji || petSpecies?.emoji || '';
      const petEmojiId = extractEmojiId(petEmojiStr);

      if (petEmojiId) {
        try {
          const petImg = await loadImage(`https://cdn.discordapp.com/emojis/${petEmojiId}.png`).catch(() => null);
          if (petImg) {
            ctx.drawImage(petImg, 340, card2Y + 56, 24, 24);
            petX = 370;
          }
        } catch {}
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`Pet: (Lv.${equippedPet.level || 1})`, petX, card2Y + 73);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Pet: Chưa trang bị', 340, card2Y + 73);
    }
    ctx.restore();

    const card3Y = 375;
    const card3H = 110;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    roundRect(ctx, 45, card3Y, 710, card3H, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('About me', 70, card3Y + 35);

    const isKhang = targetUser.id === '1068840242273103902' ||
      targetUser.username.toLowerCase() === 'khang' ||
      displayName.toLowerCase() === 'khang' ||
      (config.permissions?.dev_ids || []).includes(targetUser.id);

    let spouseName = '';
    if (isKhang) {
      spouseName = 'Ngọc Ánh ❤️';
    } else if (userData.spouse) {
      spouseName = `${userData.spouse} ❤️`;
    }

    if (spouseName) {
      try {
        const ringEmojiUrl = 'https://cdn.discordapp.com/emojis/1417090203188723722.png';
        const ringImg = await loadImage(ringEmojiUrl).catch(() => null);
        const nameWidth = ctx.measureText(spouseName).width;
        const ringX = 735 - nameWidth - 28;

        if (ringImg) {
          ctx.drawImage(ringImg, ringX, card3Y + 16, 22, 22);
        }
      } catch {}

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(spouseName, 735, card3Y + 33);
      ctx.textAlign = 'left';
    }

    const bioText = userData.bio || "I'm just a plain human.";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '16px Arial';
    ctx.fillText(bioText, 70, card3Y + 75);
    ctx.restore();

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
    return message.reply({ files: [attachment] });
  }
}

module.exports = new ProfileCommand();
