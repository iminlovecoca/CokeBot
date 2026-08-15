const RANK_TIERS = {
  unranked: { key: "unranked", name: "Unranked", isUnranked: true },
  common: {
    key: "common",
    name: "Common",
    emoji: "<:common:1530878565489311826>",
    c1: "#e3e7f2",
    c2: "#b5b9c7",
    c3: "#4a4e5d",
    gem: "#7393b3",
    glow: "rgba(181, 185, 199, 0.35)"
  },
  rare: {
    key: "rare",
    name: "Rare",
    emoji: "<:rare:1530878574104547378>",
    c1: "#fff4b0",
    c2: "#ffd700",
    c3: "#8a6500",
    gem: "#ffee75",
    glow: "rgba(255, 215, 0, 0.55)"
  },
  epic: {
    key: "epic",
    name: "Epic",
    emoji: "<:epic:1530878567955566642>",
    c1: "#b3e5ff",
    c2: "#00a8ff",
    c3: "#003b80",
    gem: "#00ffff",
    glow: "rgba(0, 168, 255, 0.65)"
  },
  legendary: {
    key: "legendary",
    name: "Legendary",
    emoji: "<:legendary:1530878570858287205>",
    c1: "#f2c6ff",
    c2: "#a55eea",
    c3: "#481570",
    gem: "#df80ff",
    glow: "rgba(165, 94, 234, 0.75)"
  },
  mythic: {
    key: "mythic",
    name: "Mythic",
    emoji: "<a:mythic:1530878614843686912>",
    c1: "#ffb8db",
    c2: "#ff007f",
    c3: "#770039",
    gem: "#ff66b3",
    glow: "rgba(255, 0, 127, 0.85)"
  },
  ancient: {
    key: "ancient",
    name: "Ancient",
    emoji: "<a:ancient:1530878606656540814>",
    c1: "#ffd6c2",
    c2: "#ff793f",
    c3: "#802700",
    gem: "#ff944d",
    accentGem: "#2ecc71",
    glow: "rgba(255, 121, 63, 0.85)"
  },
  divine: {
    key: "divine",
    name: "Divine",
    emoji: "<a:divine:1530878610515165365>",
    c1: "#e6ffff",
    c2: "#00f5d4",
    c3: "#006658",
    cGold: "#ffd700",
    gem: "#ffffff",
    glow: "rgba(0, 245, 212, 0.95)"
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
 * Draws a 3D Faceted Diamond Gem on Canvas with light/dark reflection facets
 */
function draw3DDiamondGem(ctx, cx, cy, rx, ry, mainColor, topHighlightColor = "#ffffff") {
  ctx.save();

  // Top Light Facet
  ctx.fillStyle = topHighlightColor;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.fill();

  // Bottom Shadow Facet
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.closePath();
  ctx.fill();

  // Outer Border Line
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Pure Canvas 2D Vector Renderer generating 100% exact 3D Metallic Wings & Frame Armors.
 */
function drawRankFrame(ctx, x, y, width, height, rankTierInput, options = {}) {
  const config = getRankConfig(rankTierInput);
  if (!config || config.isUnranked) return;

  const { radius = 10 } = options;
  const tierKey = config.key;
  const c1 = config.c1;
  const c2 = config.c2;
  const c3 = config.c3;

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const topY = y;
  const bottomY = y + height;

  ctx.save();

  // === 1. DRAW LOWER SIDE WINGS & CREST ARMORS (UNDERNEATH THE MAIN FRAME) ===

  // --- RARE: Gold Layered Feathered Armor Wings ---
  if (tierKey === "rare") {
    ctx.fillStyle = c2;
    ctx.strokeStyle = c3;
    ctx.lineWidth = 1.5;

    // Left Gold Wings
    const lWings = [
      { x1: x + 2, y1: bottomY - 10, x2: x - 22, y2: centerY + 25, x3: x - 5, y3: centerY + 5 },
      { x1: x + 2, y1: centerY + 15, x2: x - 28, y2: centerY - 5, x3: x - 5, y3: centerY - 25 },
      { x1: x + 2, y1: centerY - 15, x2: x - 24, y2: centerY - 35, x3: x + 2, y3: centerY - 45 }
    ];
    for (const w of lWings) {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.lineTo(w.x3, w.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Right Gold Wings
    const rWings = [
      { x1: x + width - 2, y1: bottomY - 10, x2: x + width + 22, y2: centerY + 25, x3: x + width + 5, y3: centerY + 5 },
      { x1: x + width - 2, y1: centerY + 15, x2: x + width + 28, y2: centerY - 5, x3: x + width + 5, y3: centerY - 25 },
      { x1: x + width - 2, y1: centerY - 15, x2: x + width + 24, y2: centerY - 35, x3: x + width - 2, y3: centerY - 45 }
    ];
    for (const w of rWings) {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.lineTo(w.x3, w.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // --- EPIC: Sapphire Blue Crystalline Feathered Wings ---
  else if (tierKey === "epic") {
    ctx.fillStyle = c2;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;

    // Left Sapphire Feather Spikes
    const lFeathers = [
      { x1: x + 2, y1: bottomY - 5, x2: x - 32, y2: centerY + 30, x3: x - 8, y3: centerY + 10 },
      { x1: x + 2, y1: centerY + 20, x2: x - 38, y2: centerY - 10, x3: x - 8, y3: centerY - 30 },
      { x1: x + 2, y1: centerY - 10, x2: x - 30, y2: centerY - 45, x3: x + 2, y3: centerY - 55 }
    ];
    for (const f of lFeathers) {
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.lineTo(f.x3, f.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Right Sapphire Feather Spikes
    const rFeathers = [
      { x1: x + width - 2, y1: bottomY - 5, x2: x + width + 32, y2: centerY + 30, x3: x + width + 8, y3: centerY + 10 },
      { x1: x + width - 2, y1: centerY + 20, x2: x + width + 38, y2: centerY - 10, x3: x + width + 8, y3: centerY - 30 },
      { x1: x + width - 2, y1: centerY - 10, x2: x + width + 30, y2: centerY - 45, x3: x + width - 2, y3: centerY - 55 }
    ];
    for (const f of rFeathers) {
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.lineTo(f.x3, f.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // --- LEGENDARY: Purple Dragon / Bat Leather Wings ---
  else if (tierKey === "legendary") {
    ctx.fillStyle = c2;
    ctx.strokeStyle = c3;
    ctx.lineWidth = 2;

    // Left Dragon Bat Wing Webbing
    ctx.beginPath();
    ctx.moveTo(x + 2, bottomY - 15);
    ctx.quadraticCurveTo(x - 45, centerY + 15, x - 38, topY - 35);
    ctx.quadraticCurveTo(x - 20, centerY - 20, x + 2, topY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Dragon Bat Wing Webbing
    ctx.beginPath();
    ctx.moveTo(x + width - 2, bottomY - 15);
    ctx.quadraticCurveTo(x + width + 45, centerY + 15, x + width + 38, topY - 35);
    ctx.quadraticCurveTo(x + width + 20, centerY - 20, x + width - 2, topY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing Rib Spikes (Left & Right)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, bottomY - 15);
    ctx.lineTo(x - 38, topY - 35);
    ctx.moveTo(x + width - 2, bottomY - 15);
    ctx.lineTo(x + width + 38, topY - 35);
    ctx.stroke();
  }

  // --- MYTHIC: Crimson Demonic Spiked Crystal Flame Wings ---
  else if (tierKey === "mythic") {
    ctx.fillStyle = c2;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;

    // Left Demonic Spikes
    const lSpikes = [
      { x1: x + 2, y1: bottomY - 5, x2: x - 42, y2: centerY + 25, x3: x - 10, y3: centerY + 5 },
      { x1: x + 2, y1: centerY + 15, x2: x - 52, y2: centerY - 15, x3: x - 12, y3: centerY - 35 },
      { x1: x + 2, y1: centerY - 15, x2: x - 40, y2: topY - 45, x3: x + 2, y3: topY - 15 }
    ];
    for (const s of lSpikes) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.lineTo(s.x3, s.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Right Demonic Spikes
    const rSpikes = [
      { x1: x + width - 2, y1: bottomY - 5, x2: x + width + 42, y2: centerY + 25, x3: x + width + 10, y3: centerY + 5 },
      { x1: x + width - 2, y1: centerY + 15, x2: x + width + 52, y2: centerY - 15, x3: x + width + 12, y3: centerY - 35 },
      { x1: x + width - 2, y1: centerY - 15, x2: x + width + 40, y2: topY - 45, x3: x + width - 2, y3: topY - 15 }
    ];
    for (const s of rSpikes) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.lineTo(s.x3, s.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // --- ANCIENT: Amber Ancient Rune Armor Wings & Green Emerald Accents ---
  else if (tierKey === "ancient") {
    ctx.fillStyle = c2;
    ctx.strokeStyle = config.accentGem; // Green Emerald Line Accent
    ctx.lineWidth = 2.2;

    // Left Rune Wings
    const lRunes = [
      { x1: x + 2, y1: bottomY - 5, x2: x - 48, y2: centerY + 20, x3: x - 12, y3: centerY },
      { x1: x + 2, y1: centerY + 10, x2: x - 58, y2: centerY - 20, x3: x - 14, y3: centerY - 40 },
      { x1: x + 2, y1: centerY - 20, x2: x - 45, y2: topY - 50, x3: x + 2, y3: topY - 20 }
    ];
    for (const r of lRunes) {
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.lineTo(r.x3, r.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Right Rune Wings
    const rRunes = [
      { x1: x + width - 2, y1: bottomY - 5, x2: x + width + 48, y2: centerY + 20, x3: x + width + 12, y3: centerY },
      { x1: x + width - 2, y1: centerY + 10, x2: x + width + 58, y2: centerY - 20, x3: x + width + 14, y3: centerY - 40 },
      { x1: x + width - 2, y1: centerY - 20, x2: x + width + 45, y2: topY - 50, x3: x + width - 2, y3: topY - 20 }
    ];
    for (const r of rRunes) {
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.lineTo(r.x3, r.y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // --- DIVINE: CHALLENGER-STYLE ULTIMATE CELESTIAL WINGS (Dual Tone Gold & Cyan) ---
  else if (tierKey === "divine") {
    // Golden Armor Wing Base
    ctx.fillStyle = config.cGold;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(x + 2, bottomY - 5);
    ctx.lineTo(x - 65, centerY + 15);
    ctx.lineTo(x - 55, topY - 60);
    ctx.lineTo(x - 20, topY - 20);
    ctx.lineTo(x + 2, topY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + width - 2, bottomY - 5);
    ctx.lineTo(x + width + 65, centerY + 15);
    ctx.lineTo(x + width + 55, topY - 60);
    ctx.lineTo(x + width + 20, topY - 20);
    ctx.lineTo(x + width - 2, topY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Cyan Celestial Crystal Inlay
    ctx.fillStyle = c2;
    const lFeathers = [
      { x1: x + 2, y1: bottomY - 10, x2: x - 45, y2: centerY + 20, x3: x - 10, y3: centerY + 2 },
      { x1: x + 2, y1: centerY + 10, x2: x - 52, y2: centerY - 15, x3: x - 12, y3: centerY - 30 },
      { x1: x + 2, y1: centerY - 15, x2: x - 42, y2: topY - 40, x3: x + 2, y3: topY - 10 }
    ];
    for (const f of lFeathers) {
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.lineTo(f.x3, f.y3);
      ctx.closePath();
      ctx.fill();
    }

    const rFeathers = [
      { x1: x + width - 2, y1: bottomY - 10, x2: x + width + 45, y2: centerY + 20, x3: x + width + 10, y3: centerY + 2 },
      { x1: x + width - 2, y1: centerY + 10, x2: x + width + 52, y2: centerY - 15, x3: x + width + 12, y3: centerY - 30 },
      { x1: x + width - 2, y1: centerY - 15, x2: x + width + 42, y2: topY - 40, x3: x + width - 2, y3: topY - 10 }
    ];
    for (const f of rFeathers) {
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.lineTo(f.x3, f.y3);
      ctx.closePath();
      ctx.fill();
    }
  }

  // === 2. DRAW MAIN 3D METALLIC RECTANGULAR BOX BORDER ===
  const bWidth = tierKey === "divine" ? 6 : tierKey === "mythic" || tierKey === "ancient" ? 5.5 : tierKey === "legendary" || tierKey === "epic" ? 4.5 : 3.5;

  ctx.shadowColor = config.glow;
  ctx.shadowBlur = tierKey === "divine" ? 25 : tierKey === "mythic" ? 20 : 12;

  // Outer Highlight Gradient Stroke
  const strokeGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  strokeGrad.addColorStop(0, c1);
  strokeGrad.addColorStop(0.5, c2);
  strokeGrad.addColorStop(1, c3);

  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = bWidth;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();

  ctx.shadowBlur = 0; // Reset shadow glow

  // Inner Secondary Accent Border Line
  ctx.strokeStyle = tierKey === "divine" ? "#ffd700" : "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x + bWidth + 1, y + bWidth + 1, width - (bWidth + 1) * 2, height - (bWidth + 1) * 2, Math.max(2, radius - 2));
  ctx.stroke();

  // === 3. DRAW 4 CORNER METALLIC SOCKET BRACKETS & 3D DIAMOND JEWELS ===
  const gemRadiusX = Math.min(width, height) * 0.06;
  const gemRadiusY = Math.min(width, height) * 0.08;

  // Top Center Crown Gem
  draw3DDiamondGem(ctx, centerX, topY, gemRadiusX * 1.3, gemRadiusY * 1.3, config.gem, c1);

  // Bottom Center Gem
  draw3DDiamondGem(ctx, centerX, bottomY, gemRadiusX * 1.1, gemRadiusY * 1.1, config.gem, c1);

  // 4 Corner Diamond Jewels for Epic, Legendary, Mythic, Ancient, Divine
  if (tierKey !== "common" && tierKey !== "rare") {
    draw3DDiamondGem(ctx, x, y, gemRadiusX, gemRadiusY, config.gem, c1);
    draw3DDiamondGem(ctx, x + width, y, gemRadiusX, gemRadiusY, config.gem, c1);
    draw3DDiamondGem(ctx, x, y + height, gemRadiusX, gemRadiusY, config.gem, c1);
    draw3DDiamondGem(ctx, x + width, y + height, gemRadiusX, gemRadiusY, config.gem, c1);
  }

  // === 4. DIVINE CELESTIAL STARBURST CROWN ===
  if (tierKey === "divine") {
    // 8-Pointed Celestial Diamond Starburst at top center
    drawStar(ctx, centerX, topY - 14, 8, 16, 7, "#ffffff", "#00f5d4");
    drawStar(ctx, centerX, bottomY + 14, 8, 14, 6, "#ffffff", "#ffd700");
  }

  ctx.restore();
}

module.exports = {
  RANK_TIERS,
  getRankConfig,
  drawRankFrame
};
