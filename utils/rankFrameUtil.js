/**
 * Clean & Modern Square (1:1) Dark Fantasy RPG Rank Frames (100% Pure Canvas 2D Vector)
 * 100% SQUARE FRAMES (HÌNH VUÔNG): Clean metallic borders, geometric bevels, sharp corner brackets, accurate colors.
 */

const RANK_TIERS = {
  unranked: { key: "unranked", name: "Unranked", isUnranked: true },
  common: {
    key: "common",
    name: "COMMON",
    subtitle: "Viền Bạc Thép",
    emoji: "<:common:1530878565489311826>",
    textColor: "#b5b9c7",
    c1: "#ffffff",
    c2: "#b5b9c7",
    c3: "#4a4e5d",
    gem: "#d2d7e5",
    glow: "rgba(181, 185, 199, 0.25)"
  },
  rare: {
    key: "rare",
    name: "RARE",
    subtitle: "Viền Vàng Kim",
    emoji: "<:rare:1530878574104547378>",
    textColor: "#ffd700",
    c1: "#fffbe0",
    c2: "#ffd700",
    c3: "#8a6500",
    gem: "#ffee75",
    glow: "rgba(255, 215, 0, 0.45)"
  },
  epic: {
    key: "epic",
    name: "EPIC",
    subtitle: "Viền Sapphire Lam",
    emoji: "<:epic:1530878567955566642>",
    textColor: "#00a8ff",
    c1: "#e0f6ff",
    c2: "#00a8ff",
    c3: "#003b80",
    gem: "#00ffff",
    glow: "rgba(0, 168, 255, 0.55)"
  },
  generation: {
    key: "generation",
    name: "GENERATION",
    subtitle: "Viền Băng Tinh Lấp Lánh",
    emoji: "<a:Generation:1563835095541092352>",
    textColor: "#7df9ff",
    c1: "#ffffff",
    c2: "#7df9ff",
    c3: "#0f4c75",
    gem: "#a5f2f3",
    glow: "rgba(125, 249, 255, 0.65)"
  },
  legendary: {
    key: "legendary",
    name: "LEGENDARY",
    subtitle: "Viền Tím Hoàng Gia",
    emoji: "<:legendary:1530878570858287205>",
    textColor: "#a55eea",
    c1: "#f6e8ff",
    c2: "#a55eea",
    c3: "#481570",
    gem: "#df80ff",
    glow: "rgba(165, 94, 234, 0.65)"
  },
  mythic: {
    key: "mythic",
    name: "MYTHIC",
    subtitle: "Viền Đỏ Huyết Nguyệt",
    emoji: "<a:mythic:1530878614843686912>",
    textColor: "#ff007f",
    c1: "#ffe6f2",
    c2: "#ff007f",
    c3: "#770039",
    gem: "#ff66b3",
    glow: "rgba(255, 0, 127, 0.75)"
  },
  ancient: {
    key: "ancient",
    name: "ANCIENT",
    subtitle: "Viền Hổ Phách Cổ Đại",
    emoji: "<a:ancient:1530878606656540814>",
    textColor: "#ff793f",
    c1: "#fff0e6",
    c2: "#ff793f",
    c3: "#802700",
    gem: "#ff944d",
    glow: "rgba(255, 121, 63, 0.75)"
  },
  divine: {
    key: "divine",
    name: "DIVINE",
    subtitle: "Viền Tinh Tú Tối Cao",
    emoji: "<a:divine:1530878610515165365>",
    textColor: "#00f5d4",
    c1: "#ffffff",
    c2: "#00f5d4",
    c3: "#005e52",
    goldMid: "#ffd700",
    goldLight: "#fff3a8",
    gem: "#ffffff",
    glow: "rgba(0, 245, 212, 0.85)"
  },
  secret: {
    key: "secret",
    name: "SECRET",
    subtitle: "Viền Hư Không Ẩn Mật",
    emoji: "<a:Secret:1563835098355339285>",
    textColor: "#1e1b2e",
    c1: "#9ca3af",
    c2: "#1f2937",
    c3: "#09090d",
    goldMid: "#6b7280",
    goldLight: "#d1d5db",
    gem: "#374151",
    glow: "rgba(17, 24, 39, 0.9)"
  }
};

function getRankConfig(rankTierInput) {
  if (!rankTierInput) return RANK_TIERS.unranked;
  const key = String(rankTierInput).toLowerCase().trim();
  return RANK_TIERS[key] || RANK_TIERS.unranked;
}

/**
 * Draw a sleek 3D faceted diamond jewel pin
 */
function drawDiamondPin(ctx, cx, cy, r, gemColor, highlightColor = "#ffffff") {
  ctx.save();

  // Top Light Facet
  ctx.fillStyle = highlightColor;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();

  // Bottom Shadow Facet
  ctx.fillStyle = gemColor;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.closePath();
  ctx.fill();

  // Crisp White Border
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Clean & Sleek Square Rank Frame (1:1 Ratio, Zero Wings, Pure Elegant Geometry)
 */
function drawRankFrame(ctx, x, y, width, height, rankTierInput, options = {}) {
  const cfg = getRankConfig(rankTierInput);
  if (!cfg || cfg.isUnranked) return;

  const tier = cfg.key;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const topY = y;
  const botY = y + height;
  const rightX = x + width;

  const tierLevels = {
    common: 1,
    rare: 2,
    epic: 3,
    generation: 4,
    legendary: 5,
    mythic: 6,
    ancient: 7,
    divine: 8,
    secret: 9
  };
  const level = tierLevels[tier] || 1;

  ctx.save();

  // 1. Subtle Outer Glow (Epic to Divine)
  if (level >= 3) {
    ctx.shadowColor = cfg.glow;
    ctx.shadowBlur = level * 3;
  }

  // 2. Main Outer Frame with Clean Chamfered Square Corners
  const bThickness = 2.5 + level * 0.7;
  const cornerCut = 4 + level * 1.2;

  const grad = ctx.createLinearGradient(x, topY, rightX, botY);
  grad.addColorStop(0, cfg.c1);
  grad.addColorStop(0.35, cfg.c2);
  grad.addColorStop(1, cfg.c3);

  ctx.strokeStyle = grad;
  ctx.lineWidth = bThickness;

  ctx.beginPath();
  ctx.moveTo(x + cornerCut, topY);
  ctx.lineTo(rightX - cornerCut, topY);
  ctx.lineTo(rightX, topY + cornerCut);
  ctx.lineTo(rightX, botY - cornerCut);
  ctx.lineTo(rightX - cornerCut, botY);
  ctx.lineTo(x + cornerCut, botY);
  ctx.lineTo(x, botY - cornerCut);
  ctx.lineTo(x, topY + cornerCut);
  ctx.closePath();
  ctx.stroke();

  ctx.shadowBlur = 0; // Reset glow

  // 3. Inner Secondary Accent Border (Rare to Divine)
  if (level >= 2) {
    const inset = bThickness + 2;
    const inCut = Math.max(2, cornerCut - 2);

    ctx.strokeStyle = tier === "divine" ? cfg.goldMid : "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(x + inset + inCut, topY + inset);
    ctx.lineTo(rightX - inset - inCut, topY + inset);
    ctx.lineTo(rightX - inset, topY + inset + inCut);
    ctx.lineTo(rightX - inset, botY - inset - inCut);
    ctx.lineTo(rightX - inset - inCut, botY - inset);
    ctx.lineTo(x + inset + inCut, botY - inset);
    ctx.lineTo(x + inset, botY - inset - inCut);
    ctx.lineTo(x + inset, topY + inset + inCut);
    ctx.closePath();
    ctx.stroke();
  }

  // 4. Clean Geometric L-Corner Brackets (Epic to Divine)
  if (level >= 3) {
    const armLen = 10 + level * 1.5;
    ctx.strokeStyle = tier === "divine" ? cfg.goldLight : cfg.c1;
    ctx.lineWidth = 2;

    // Top-Left Corner Bracket
    ctx.beginPath();
    ctx.moveTo(x + armLen, topY);
    ctx.lineTo(x, topY);
    ctx.lineTo(x, topY + armLen);
    ctx.stroke();

    // Top-Right Corner Bracket
    ctx.beginPath();
    ctx.moveTo(rightX - armLen, topY);
    ctx.lineTo(rightX, topY);
    ctx.lineTo(rightX, topY + armLen);
    ctx.stroke();

    // Bottom-Left Corner Bracket
    ctx.beginPath();
    ctx.moveTo(x + armLen, botY);
    ctx.lineTo(x, botY);
    ctx.lineTo(x, botY - armLen);
    ctx.stroke();

    // Bottom-Right Corner Bracket
    ctx.beginPath();
    ctx.moveTo(rightX - armLen, botY);
    ctx.lineTo(rightX, botY);
    ctx.lineTo(rightX, botY - armLen);
    ctx.stroke();
  }

  // 5. Sleek Diamond Pins on Top & Bottom
  const pinR = 3.5 + level * 0.9;

  // Top Center Diamond Pin
  drawDiamondPin(ctx, cx, topY, pinR, cfg.gem, cfg.c1);

  // Bottom Center Diamond Pin (Rare to Divine)
  if (level >= 2) {
    drawDiamondPin(ctx, cx, botY, pinR * 0.8, cfg.gem, cfg.c1);
  }

  // 4 Corner Diamond Pins (Legendary to Divine)
  if (level >= 4) {
    const cPinR = pinR * 0.65;
    drawDiamondPin(ctx, x, topY, cPinR, cfg.gem, cfg.c1);
    drawDiamondPin(ctx, rightX, topY, cPinR, cfg.gem, cfg.c1);
    drawDiamondPin(ctx, x, botY, cPinR, cfg.gem, cfg.c1);
    drawDiamondPin(ctx, rightX, botY, cPinR, cfg.gem, cfg.c1);
  }

  // 6. Divine Starlight Pin (Divine only)
  if (level === 7) {
    ctx.save();
    ctx.shadowColor = cfg.glow;
    ctx.shadowBlur = 10;

    const starY = topY - 14;
    const sLen = 6;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, starY - sLen);
    ctx.lineTo(cx, starY + sLen);
    ctx.moveTo(cx - sLen, starY);
    ctx.lineTo(cx + sLen, starY);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, starY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

module.exports = {
  RANK_TIERS,
  getRankConfig,
  drawRankFrame
};
