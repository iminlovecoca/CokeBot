const RANK_TIERS = {
  unranked: {
    key: "unranked",
    name: "Unranked",
    emoji: "",
    borderColor1: "transparent",
    borderColor2: "transparent",
    gemColor: "transparent",
    glowColor: "transparent",
    isUnranked: true
  },
  common: {
    key: "common",
    name: "Common",
    emoji: "<:common:1530878565489311826>",
    borderColor1: "#b5b9c7",
    borderColor2: "#626778",
    gemColor: "#e0e3ed",
    glowColor: "rgba(181, 185, 199, 0.4)"
  },
  rare: {
    key: "rare",
    name: "Rare",
    emoji: "<:rare:1530878574104547378>",
    borderColor1: "#3fa9f5",
    borderColor2: "#155da1",
    gemColor: "#8cd3ff",
    glowColor: "rgba(63, 169, 245, 0.5)"
  },
  epic: {
    key: "epic",
    name: "Epic",
    emoji: "<:epic:1530878567955566642>",
    borderColor1: "#b845dc",
    borderColor2: "#5c1b72",
    gemColor: "#e694ff",
    glowColor: "rgba(184, 69, 220, 0.5)"
  },
  legendary: {
    key: "legendary",
    name: "Legendary",
    emoji: "<:legendary:1530878570858287205>",
    borderColor1: "#ffd700",
    borderColor2: "#9e7700",
    gemColor: "#fff5a0",
    glowColor: "rgba(255, 215, 0, 0.55)"
  },
  mythic: {
    key: "mythic",
    name: "Mythic",
    emoji: "<a:mythic:1530878614843686912>",
    borderColor1: "#ff2a6d",
    borderColor2: "#8a0029",
    gemColor: "#ff8dae",
    glowColor: "rgba(255, 42, 109, 0.6)"
  },
  ancient: {
    key: "ancient",
    name: "Ancient",
    emoji: "<a:ancient:1530878606656540814>",
    borderColor1: "#00f2fe",
    borderColor2: "#006d75",
    gemColor: "#70ffff",
    glowColor: "rgba(0, 242, 254, 0.6)"
  },
  divine: {
    key: "divine",
    name: "Divine",
    emoji: "<a:divine:1530878610515165365>",
    borderColor1: "#ffffff",
    borderColor2: "#ffd700",
    gemColor: "#ffffff",
    glowColor: "rgba(255, 255, 255, 0.75)"
  }
};

function getRankConfig(rankTierInput) {
  if (!rankTierInput) return RANK_TIERS.unranked;
  const key = String(rankTierInput).toLowerCase().trim();
  return RANK_TIERS[key] || RANK_TIERS.unranked;
}

function roundRectPath(ctx, x, y, width, height, radius) {
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
 * Draws a unified metallic Rank Frame around any bounding box (x, y, w, h).
 * If rankTierInput is "Unranked" or missing, returns immediately without drawing a frame.
 */
function drawRankFrame(ctx, x, y, width, height, rankTierInput, options = {}) {
  const config = getRankConfig(rankTierInput);
  if (!config || config.isUnranked) return;

  const { radius = 10, borderWidth = 3.5, showGems = true } = options;

  ctx.save();

  // 1. Outer Glow
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 12;

  // 2. Main Outer Metallic Frame
  const strokeGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  strokeGrad.addColorStop(0, config.borderColor1);
  strokeGrad.addColorStop(0.5, config.borderColor2);
  strokeGrad.addColorStop(1, config.borderColor1);

  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = borderWidth;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();

  ctx.shadowBlur = 0; // Reset shadow glow

  // 3. Inner Accent Border Line
  const innerMargin = borderWidth + 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + innerMargin, y + innerMargin, width - innerMargin * 2, height - innerMargin * 2, Math.max(2, radius - 2));
  ctx.stroke();

  // 4. Metallic Corner Brackets (4 corners)
  const bracketSize = Math.min(width, height) * 0.18;
  ctx.fillStyle = config.borderColor1;

  // Top-Left Corner Bracket
  ctx.beginPath();
  ctx.moveTo(x - 1, y + bracketSize);
  ctx.lineTo(x - 1, y - 1);
  ctx.lineTo(x + bracketSize, y - 1);
  ctx.lineTo(x + bracketSize * 0.5, y + 2);
  ctx.lineTo(x + 2, y + bracketSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Top-Right Corner Bracket
  ctx.beginPath();
  ctx.moveTo(x + width + 1, y + bracketSize);
  ctx.lineTo(x + width + 1, y - 1);
  ctx.lineTo(x + width - bracketSize, y - 1);
  ctx.lineTo(x + width - bracketSize * 0.5, y + 2);
  ctx.lineTo(x + width - 2, y + bracketSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Bottom-Left Corner Bracket
  ctx.beginPath();
  ctx.moveTo(x - 1, y + height - bracketSize);
  ctx.lineTo(x - 1, y + height + 1);
  ctx.lineTo(x + bracketSize, y + height + 1);
  ctx.lineTo(x + bracketSize * 0.5, y + height - 2);
  ctx.lineTo(x + 2, y + height - bracketSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // Bottom-Right Corner Bracket
  ctx.beginPath();
  ctx.moveTo(x + width + 1, y + height - bracketSize);
  ctx.lineTo(x + width + 1, y + height + 1);
  ctx.lineTo(x + width - bracketSize, y + height + 1);
  ctx.lineTo(x + width - bracketSize * 0.5, y + height - 2);
  ctx.lineTo(x + width - 2, y + height - bracketSize * 0.5);
  ctx.closePath();
  ctx.fill();

  // 5. Center Diamond Gem Accent (Top & Bottom center)
  if (showGems) {
    const gemRadius = Math.min(width, height) * 0.06;
    const topCenterX = x + width / 2;
    const topCenterY = y;

    ctx.fillStyle = config.gemColor;
    ctx.beginPath();
    ctx.moveTo(topCenterX, topCenterY - gemRadius * 1.2);
    ctx.lineTo(topCenterX + gemRadius, topCenterY);
    ctx.lineTo(topCenterX, topCenterY + gemRadius * 1.2);
    ctx.lineTo(topCenterX - gemRadius, topCenterY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

module.exports = {
  RANK_TIERS,
  getRankConfig,
  drawRankFrame
};
