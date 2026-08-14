const { createCanvas, loadImage } = require("canvas");
const path = require("path");

/**
 * Draw a rounded rectangle path on canvas context
 */
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

/**
 * Draw fallback cash bill icon if emoji image fails to load
 */
function drawDefaultCashIcon(ctx, x, y, size = 32) {
  ctx.save();
  ctx.fillStyle = "#3fa9f5";
  ctx.fillRect(x, y, size, size * 0.7);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, size - 4, size * 0.7 - 4);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(size * 0.4)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", x + size / 2, y + (size * 0.7) / 2);
  ctx.restore();
}

/**
 * Get rank image key and rank name based on level
 */
function getRankInfo(level) {
  if (level <= 10) return { key: "common", name: "Common" };
  if (level <= 20) return { key: "rare", name: "Rare" };
  if (level <= 30) return { key: "epic", name: "Epic" };
  if (level <= 40) return { key: "legendary", name: "Legendary" };
  if (level <= 50) return { key: "mythic", name: "Mythic" };
  if (level <= 60) return { key: "ancient", name: "Ancient" };
  return { key: "divine", name: "Divine" };
}

/**
 * Generate OwO-style Level Up Canvas Image Buffer
 * 
 * @param {Object} options
 * @param {number} options.newLevel - The new level reached
 * @param {number} options.totalReward - Total coke money awarded
 * @param {string} options.avatarUrl - User avatar image URL
 * @param {string} options.title - User title or rank name
 * @returns {Promise<Buffer>} PNG Image buffer
 */
async function createLevelUpCanvas({ newLevel = 1, totalReward = 0, avatarUrl = "", title = "" }) {
  const width = 550;
  const height = 180;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Outer rounded card clip
  const radius = 16;
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.clip();

  // 2. Render Cosmic Space / Galaxy Background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#19082b");
  gradient.addColorStop(0.5, "#2b0f4a");
  gradient.addColorStop(1, "#140624");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle cosmic magenta/purple glow
  const glowGradient = ctx.createRadialGradient(
    width / 2, height / 2, 10,
    width / 2, height / 2, width / 1.2
  );
  glowGradient.addColorStop(0, "rgba(162, 53, 194, 0.35)");
  glowGradient.addColorStop(0.6, "rgba(80, 20, 110, 0.15)");
  glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw procedural stars for depth
  ctx.fillStyle = "#ffffff";
  const stars = [
    { x: 30, y: 25, r: 1, opacity: 0.8 },
    { x: 120, y: 160, r: 1.5, opacity: 0.6 },
    { x: 220, y: 35, r: 1, opacity: 0.9 },
    { x: 280, y: 155, r: 1.2, opacity: 0.7 },
    { x: 340, y: 20, r: 0.8, opacity: 0.5 },
    { x: 420, y: 165, r: 1.5, opacity: 0.8 },
    { x: 510, y: 40, r: 1, opacity: 0.9 },
    { x: 490, y: 130, r: 1.2, opacity: 0.6 },
    { x: 190, y: 90, r: 0.8, opacity: 0.4 },
    { x: 390, y: 110, r: 1.8, opacity: 0.7 },
  ];
  for (const s of stars) {
    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Card Outer Border
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, width - 2, height - 2, radius);
  ctx.stroke();
  ctx.restore();

  // 3. Render User Avatar (Left Column)
  const avatarX = 15;
  const avatarY = 15;
  const avatarSize = 150;

  ctx.save();
  roundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 8);
  ctx.clip();

  try {
    if (avatarUrl) {
      const avatarImg = await loadImage(avatarUrl);
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = "#333";
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
  } catch (err) {
    ctx.fillStyle = "#4a2574";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }
  ctx.restore();

  // Avatar Border Frame
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 8);
  ctx.stroke();
  ctx.restore();

  // 4. Middle Column: LEVEL UP! & New Level Number
  const middleCenterX = 248;

  ctx.save();
  ctx.fillStyle = "#ded6fa";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LEVEL UP!", middleCenterX, 55);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 68px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(newLevel), middleCenterX, 115);
  ctx.restore();

  // 5. Vertical Divider Line
  const dividerX = 330;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dividerX, 22);
  ctx.lineTo(dividerX, 158);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 6. Right Column: Rewards & Rank Display
  const rewardX = 352;
  const iconSize = 32;

  // Row 1: Coke Money Reward
  const row1Y = 62;
  try {
    const moneyEmojiUrl = "https://cdn.discordapp.com/emojis/1509951335016173662.png";
    const moneyIcon = await loadImage(moneyEmojiUrl);
    ctx.drawImage(moneyIcon, rewardX, row1Y - iconSize / 2, iconSize, iconSize);
  } catch (e) {
    drawDefaultCashIcon(ctx, rewardX, row1Y - 11, iconSize);
  }

  const rewardTextX = rewardX + iconSize + 10;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`+${totalReward.toLocaleString()}`, rewardTextX, row1Y);
  ctx.restore();

  // Row 2: Rank Icon & Rank Name
  const row2Y = 118;
  const rankInfo = getRankInfo(newLevel);
  const displayRankName = title || rankInfo.name;

  try {
    const rankImgPath = path.join(__dirname, "../assets/ranks/png", `${rankInfo.key}.png`);
    const rankImg = await loadImage(rankImgPath);
    ctx.drawImage(rankImg, rewardX, row2Y - iconSize / 2, iconSize, iconSize);
  } catch (e) {
    ctx.save();
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 20px Arial";
    ctx.fillText("🔰", rewardX, row2Y);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(displayRankName, rewardTextX, row2Y);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

module.exports = {
  createLevelUpCanvas,
};
