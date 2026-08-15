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
    borderColor2: "#525765",
    gemColor: "#e0e3ed",
    glowColor: "rgba(181, 185, 199, 0.4)"
  },
  rare: {
    key: "rare",
    name: "Rare",
    emoji: "<:rare:1530878574104547378>",
    borderColor1: "#ffd700",
    borderColor2: "#b8860b",
    gemColor: "#fff5a0",
    glowColor: "rgba(255, 215, 0, 0.6)"
  },
  epic: {
    key: "epic",
    name: "Epic",
    emoji: "<:epic:1530878567955566642>",
    borderColor1: "#00a8ff",
    borderColor2: "#0058b3",
    gemColor: "#8cd3ff",
    glowColor: "rgba(0, 168, 255, 0.7)"
  },
  legendary: {
    key: "legendary",
    name: "Legendary",
    emoji: "<:legendary:1530878570858287205>",
    borderColor1: "#a55eea",
    borderColor2: "#5c1b72",
    gemColor: "#e694ff",
    glowColor: "rgba(165, 94, 234, 0.75)"
  },
  mythic: {
    key: "mythic",
    name: "Mythic",
    emoji: "<a:mythic:1530878614843686912>",
    borderColor1: "#ff007f",
    borderColor2: "#880044",
    gemColor: "#ff80bf",
    glowColor: "rgba(255, 0, 127, 0.85)"
  },
  ancient: {
    key: "ancient",
    name: "Ancient",
    emoji: "<a:ancient:1530878606656540814>",
    borderColor1: "#ff793f",
    borderColor2: "#a63000",
    gemColor: "#ffb380",
    glowColor: "rgba(255, 121, 63, 0.85)"
  },
  divine: {
    key: "divine",
    name: "Divine",
    emoji: "<a:divine:1530878610515165365>",
    borderColor1: "#00f5d4",
    borderColor2: "#ffd700",
    gemColor: "#ffffff",
    glowColor: "rgba(0, 245, 212, 0.95)"
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

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fillColor, strokeColor = "#ffffff") {
  let rot = (Math.PI / 2) * 3;
  let step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws Bold 3D Metallic Wings & Crest Armors (LoL Style) around bounding box (x, y, w, h)
 */
function drawRankFrame(ctx, x, y, width, height, rankTierInput, options = {}) {
  const config = getRankConfig(rankTierInput);
  if (!config || config.isUnranked) return;

  const { radius = 10 } = options;
  const tierKey = config.key;

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const topY = y;
  const bottomY = y + height;

  ctx.save();

  // === 1. DRAW BACKEND CREST WINGS (Underneath the main box) ===

  // --- RARE: Gold Side Wings & Bottom Crest ---
  if (tierKey === "rare") {
    ctx.fillStyle = config.borderColor1;
    ctx.strokeStyle = config.borderColor2;
    ctx.lineWidth = 1.5;

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(x + 5, centerY);
    ctx.quadraticCurveTo(x - 22, centerY - 25, x - 18, centerY - 45);
    ctx.quadraticCurveTo(x - 12, centerY - 20, x + 5, centerY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(x + width - 5, centerY);
    ctx.quadraticCurveTo(x + width + 22, centerY - 25, x + width + 18, centerY - 45);
    ctx.quadraticCurveTo(x + width + 12, centerY - 20, x + width - 5, centerY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom Gold V-Crest
    ctx.beginPath();
    ctx.moveTo(centerX - 35, bottomY - 5);
    ctx.lineTo(centerX, bottomY + 22);
    ctx.lineTo(centerX + 35, bottomY - 5);
    ctx.lineTo(centerX + 20, bottomY + 5);
    ctx.lineTo(centerX, bottomY + 12);
    ctx.lineTo(centerX - 20, bottomY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- EPIC: Sapphire Blue Upward Crystal Wings ---
  else if (tierKey === "epic") {
    ctx.fillStyle = config.borderColor1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;

    // Left Giant Wing
    ctx.beginPath();
    ctx.moveTo(x + 5, bottomY - 15);
    ctx.quadraticCurveTo(x - 35, centerY, x - 28, topY - 30);
    ctx.quadraticCurveTo(x - 15, centerY - 10, x + 5, topY + 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Giant Wing
    ctx.beginPath();
    ctx.moveTo(x + width - 5, bottomY - 15);
    ctx.quadraticCurveTo(x + width + 35, centerY, x + width + 28, topY - 30);
    ctx.quadraticCurveTo(x + width + 15, centerY - 10, x + width - 5, topY + 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom Crystal Crest
    ctx.beginPath();
    ctx.moveTo(centerX - 40, bottomY - 2);
    ctx.lineTo(centerX, bottomY + 28);
    ctx.lineTo(centerX + 40, bottomY - 2);
    ctx.lineTo(centerX, bottomY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- LEGENDARY: Purple Dragon Horn Wings ---
  else if (tierKey === "legendary") {
    ctx.fillStyle = config.borderColor1;
    ctx.strokeStyle = config.borderColor2;
    ctx.lineWidth = 2;

    // Left Sweeping Dragon Horn
    ctx.beginPath();
    ctx.moveTo(x, bottomY - 10);
    ctx.quadraticCurveTo(x - 45, centerY + 10, x - 38, topY - 45);
    ctx.quadraticCurveTo(x - 20, topY - 10, x + 2, topY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Sweeping Dragon Horn
    ctx.beginPath();
    ctx.moveTo(x + width, bottomY - 10);
    ctx.quadraticCurveTo(x + width + 45, centerY + 10, x + width + 38, topY - 45);
    ctx.quadraticCurveTo(x + width + 20, topY - 10, x + width - 2, topY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom Horn Crest
    ctx.beginPath();
    ctx.moveTo(centerX - 50, bottomY);
    ctx.quadraticCurveTo(centerX - 25, bottomY + 32, centerX, bottomY + 26);
    ctx.quadraticCurveTo(centerX + 25, bottomY + 32, centerX + 50, bottomY);
    ctx.lineTo(centerX, bottomY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- MYTHIC: Crimson Spiked Flame Wings ---
  else if (tierKey === "mythic") {
    ctx.fillStyle = config.borderColor1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Left Crimson Flame Horn
    ctx.beginPath();
    ctx.moveTo(x - 5, bottomY);
    ctx.lineTo(x - 55, centerY);
    ctx.lineTo(x - 45, topY - 55);
    ctx.lineTo(x - 22, topY - 15);
    ctx.lineTo(x + 2, topY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Crimson Flame Horn
    ctx.beginPath();
    ctx.moveTo(x + width + 5, bottomY);
    ctx.lineTo(x + width + 55, centerY);
    ctx.lineTo(x + width + 45, topY - 55);
    ctx.lineTo(x + width + 22, topY - 15);
    ctx.lineTo(x + width - 2, topY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom Lava Core Crest
    ctx.beginPath();
    ctx.moveTo(centerX - 60, bottomY);
    ctx.lineTo(centerX, bottomY + 36);
    ctx.lineTo(centerX + 60, bottomY);
    ctx.lineTo(centerX + 30, bottomY + 16);
    ctx.lineTo(centerX, bottomY + 22);
    ctx.lineTo(centerX - 30, bottomY + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- ANCIENT: Amber Ancient Rune Armor Wings ---
  else if (tierKey === "ancient") {
    ctx.fillStyle = config.borderColor1;
    ctx.strokeStyle = "#2ecc71"; // Green rune accent stroke
    ctx.lineWidth = 2.5;

    // Left Ancient Wing
    ctx.beginPath();
    ctx.moveTo(x - 5, bottomY + 5);
    ctx.lineTo(x - 65, centerY + 10);
    ctx.lineTo(x - 52, topY - 60);
    ctx.lineTo(x - 25, topY - 20);
    ctx.lineTo(x + 2, topY + 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Ancient Wing
    ctx.beginPath();
    ctx.moveTo(x + width + 5, bottomY + 5);
    ctx.lineTo(x + width + 65, centerY + 10);
    ctx.lineTo(x + width + 52, topY - 60);
    ctx.lineTo(x + width + 25, topY - 20);
    ctx.lineTo(x + width - 2, topY + 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom Rune Shield Crest
    ctx.beginPath();
    ctx.moveTo(centerX - 65, bottomY + 2);
    ctx.lineTo(centerX, bottomY + 40);
    ctx.lineTo(centerX + 65, bottomY + 2);
    ctx.lineTo(centerX, bottomY + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- DIVINE: CHALLENGER-STYLE ULTIMATE CELESTIAL WINGS (Cyan & Gold Dual Tone) ---
  else if (tierKey === "divine") {
    // Outer Golden Armor Wing Base
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;

    // Left Gold Wing Base
    ctx.beginPath();
    ctx.moveTo(x - 8, bottomY + 8);
    ctx.lineTo(x - 80, centerY + 15);
    ctx.lineTo(x - 65, topY - 70);
    ctx.lineTo(x - 30, topY - 25);
    ctx.lineTo(x + 2, topY + 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Gold Wing Base
    ctx.beginPath();
    ctx.moveTo(x + width + 8, bottomY + 8);
    ctx.lineTo(x + width + 80, centerY + 15);
    ctx.lineTo(x + width + 65, topY - 70);
    ctx.lineTo(x + width + 30, topY - 25);
    ctx.lineTo(x + width - 2, topY + 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Cyan Celestial Wing Inlay
    ctx.fillStyle = "#00f5d4";
    ctx.beginPath();
    ctx.moveTo(x - 5, bottomY);
    ctx.lineTo(x - 60, centerY + 10);
    ctx.lineTo(x - 48, topY - 50);
    ctx.lineTo(x - 20, topY - 15);
    ctx.lineTo(x + 2, topY + 25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + width + 5, bottomY);
    ctx.lineTo(x + width + 60, centerY + 10);
    ctx.lineTo(x + width + 48, topY - 50);
    ctx.lineTo(x + width + 20, topY - 15);
    ctx.lineTo(x + width - 2, topY + 25);
    ctx.closePath();
    ctx.fill();

    // Bottom Challenger Crown Wings
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.moveTo(centerX - 75, bottomY + 5);
    ctx.lineTo(centerX, bottomY + 48);
    ctx.lineTo(centerX + 75, bottomY + 5);
    ctx.lineTo(centerX + 40, bottomY + 20);
    ctx.lineTo(centerX, bottomY + 30);
    ctx.lineTo(centerX - 40, bottomY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // === 2. MAIN METALLIC BOX BORDER ===
  const bWidth = tierKey === "divine" ? 6 : tierKey === "mythic" || tierKey === "ancient" ? 5 : tierKey === "legendary" || tierKey === "epic" ? 4.5 : 3.5;

  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = tierKey === "divine" ? 25 : tierKey === "mythic" ? 20 : 12;

  const strokeGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  strokeGrad.addColorStop(0, config.borderColor1);
  strokeGrad.addColorStop(0.5, config.borderColor2);
  strokeGrad.addColorStop(1, config.borderColor1);

  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = bWidth;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();

  ctx.shadowBlur = 0; // Reset shadow glow

  // Inner Accent Line
  ctx.strokeStyle = tierKey === "divine" ? "#ffd700" : "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x + bWidth + 1, y + bWidth + 1, width - (bWidth + 1) * 2, height - (bWidth + 1) * 2, Math.max(2, radius - 2));
  ctx.stroke();

  // === 3. TOP CROWN EMBLEMS & GEM STEEPLES ===
  if (tierKey === "common") {
    drawStar(ctx, centerX, topY, 4, 6, 3, "#e0e3ed");
  } else if (tierKey === "rare") {
    drawStar(ctx, centerX, topY - 10, 4, 8, 4, "#ffffff", "#ffd700");
  } else if (tierKey === "epic") {
    drawStar(ctx, centerX, topY - 14, 4, 10, 5, "#8cd3ff", "#ffffff");
  } else if (tierKey === "legendary") {
    drawStar(ctx, centerX, topY - 18, 6, 13, 6, "#e694ff", "#ffffff");
  } else if (tierKey === "mythic") {
    drawStar(ctx, centerX, topY - 22, 8, 16, 7, "#ff80bf", "#ffffff");
  } else if (tierKey === "ancient") {
    drawStar(ctx, centerX, topY - 24, 8, 18, 8, "#ffb380", "#2ecc71");
  } else if (tierKey === "divine") {
    drawStar(ctx, centerX, topY - 30, 8, 22, 10, "#ffffff", "#00f5d4");
  }

  ctx.restore();
}

module.exports = {
  RANK_TIERS,
  getRankConfig,
  drawRankFrame
};
