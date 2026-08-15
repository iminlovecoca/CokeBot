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

const CLASS_NAMES = {
  warrior: 'Chiến Sĩ (Warrior)',
  archer: 'Cung Thủ (Archer)',
  mage: 'Pháp Sư (Mage)',
  assassin: 'Sát Thủ (Assassin)',
  paladin: 'Hiệp Sĩ (Paladin)',
  wretch: 'Kẻ Bần Cùng (Wretch)'
};

const sanitizeText = (str) => {
  if (!str) return '';
  return str
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2B50}-\u{2B55}]|[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractEmojiId = (str) => {
  if (!str) return null;
  const match = str.match(/<a?:[a-zA-Z0-9_]+:(\d+)>/);
  return match ? match[1] : null;
};

function drawGoldenRingIcon(ctx, x, y, size = 20) {
  ctx.save();
  const radius = size / 2 - 2;
  const centerX = x + size / 2;
  const centerY = y + size / 2 + 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const gemX = centerX;
  const gemY = centerY - radius;
  ctx.beginPath();
  ctx.moveTo(gemX, gemY - 4);
  ctx.lineTo(gemX + 4, gemY);
  ctx.lineTo(gemX, gemY + 4);
  ctx.lineTo(gemX - 4, gemY);
  ctx.closePath();
  ctx.fillStyle = '#70a1ff';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawClassIcon(ctx, x, y, size = 18) {
  ctx.save();
  ctx.fillStyle = '#70a1ff';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawWeaponIcon(ctx, x, y, size = 18) {
  ctx.save();
  ctx.strokeStyle = '#ff4757';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x + 3, y + size - 3);
  ctx.lineTo(x + size - 3, y + 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size - 3, y + size - 3);
  ctx.lineTo(x + 3, y + 3);
  ctx.stroke();

  ctx.restore();
}

function drawPetPawIcon(ctx, x, y, size = 18) {
  ctx.save();
  ctx.fillStyle = '#ff7979';
  const cx = x + size / 2;
  const cy = y + size / 2 + 1;

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  const toes = [
    { dx: -0.32, dy: -0.32 },
    { dx: 0, dy: -0.42 },
    { dx: 0.32, dy: -0.32 }
  ];
  for (const t of toes) {
    ctx.beginPath();
    ctx.arc(cx + t.dx * size, cy + t.dy * size, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

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

    const card1Y = 145;
    const card1H = 90;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    roundRect(ctx, 45, card1Y, 710, card1H, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '15px Arial';
    ctx.fillText('Level', 70, card1Y + 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(String(userData.level), 70, card1Y + 68);

    const rankInfo = getRankInfo(userData.level);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Rank: #${globalRank.toLocaleString()}`, 200, card1Y + 38);

    const rankImgPath = path.join(__dirname, `../../assets/ranks/png/${rankInfo.key}.png`);
    try {
      const rankImg = await loadImage(rankImgPath);
      ctx.drawImage(rankImg, 160, card1Y + 20, 28, 28);
    } catch {}

    const xpText = `XP: ${userData.xp.toLocaleString()}/${xpNeed.toLocaleString()}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(xpText, 725, card1Y + 38);
    ctx.textAlign = 'left';

    const barX = 200;
    const barY = card1Y + 54;
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

    const card2Y = 248;
    const card2H = 110;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    roundRect(ctx, 45, card2Y, 710, card2H, 12);
    ctx.fill();

    try {
      const cokeEmojiUrl = 'https://cdn.discordapp.com/emojis/1509951335016173662.png';
      const cokeImg = await loadImage(cokeEmojiUrl).catch(() => null);
      if (cokeImg) {
        ctx.drawImage(cokeImg, 70, card2Y + 41, 28, 28);
      }
    } catch {}

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`${userData.coke.toLocaleString()} Coke`, 106, card2Y + 63);

    const iconX = 335;
    const textX = 362;

    const userClassKey = (userData.rpg?.classKey || '').toLowerCase();
    const classNameText = CLASS_NAMES[userClassKey] || 'Chưa chọn Class';
    drawClassIcon(ctx, iconX, card2Y + 16, 18);
    ctx.fillStyle = '#70a1ff';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(`Class: ${classNameText}`, textX, card2Y + 31);

    const equippedItems = getEquippedItems(userData);
    const weapon = equippedItems.weapon;
    const rawWeaponName = weapon ? (weapon.name || weapon.id) : '';
    const cleanWeaponName = sanitizeText(rawWeaponName) || 'Tay Không';
    const enhanceText = weapon?.enhance ? ` +${weapon.enhance}` : '';
    const fullWeaponDisplay = `Vũ khí: ${cleanWeaponName}${enhanceText}`;

    const weaponEmojiId = extractEmojiId(weapon?.emoji || weapon?.icon);
    let drewWeaponIcon = false;
    if (weaponEmojiId) {
      try {
        const weaponImg = await loadImage(`https://cdn.discordapp.com/emojis/${weaponEmojiId}.png`).catch(() => null);
        if (weaponImg) {
          ctx.drawImage(weaponImg, iconX, card2Y + 44, 18, 18);
          drewWeaponIcon = true;
        }
      } catch {}
    }
    if (!drewWeaponIcon) {
      drawWeaponIcon(ctx, iconX, card2Y + 44, 18);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(fullWeaponDisplay, textX, card2Y + 59);

    const equippedPet = getEquippedPet(userData);
    let drewPetIcon = false;

    if (equippedPet) {
      const petSpecies = (PET_SPECIES || []).find(
        (s) => s.key === equippedPet.key || s.key === equippedPet.speciesKey
      );
      const petEmojiStr = equippedPet.emoji || petSpecies?.emoji || '';
      const petEmojiId = extractEmojiId(petEmojiStr);

      if (petEmojiId) {
        try {
          const petImg = await loadImage(`https://cdn.discordapp.com/emojis/${petEmojiId}.png`).catch(() => null);
          if (petImg) {
            ctx.drawImage(petImg, iconX, card2Y + 72, 18, 18);
            drewPetIcon = true;
          }
        } catch {}
      }

      if (!drewPetIcon) {
        drawPetPawIcon(ctx, iconX, card2Y + 72, 18);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Arial';
      ctx.fillText(`Pet: (Lv.${equippedPet.level || 1})`, textX, card2Y + 87);
    } else {
      drawPetPawIcon(ctx, iconX, card2Y + 72, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Arial';
      ctx.fillText('Pet: Chưa trang bị', textX, card2Y + 87);
    }
    ctx.restore();

    const card3Y = 372;
    const card3H = 110;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    roundRect(ctx, 45, card3Y, 710, card3H, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('About me', 70, card3Y + 35);

    const isKhang = targetUser.id === '1068840242273103902';

    let spouseName = '';
    if (isKhang) {
      spouseName = 'Ngọc Ánh ♥';
    } else if (userData.spouse) {
      spouseName = `${userData.spouse} ♥`;
    }

    if (spouseName) {
      ctx.font = 'bold 18px Arial';
      const nameWidth = ctx.measureText(spouseName).width;
      const ringX = 735 - nameWidth - 28;

      drawGoldenRingIcon(ctx, ringX, card3Y + 16, 20);

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
