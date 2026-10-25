/**
 * CokeBot Custom Bespoke Gem Emojis Generator
 * Generates custom geometric crystal gems matching CokeBot art direction with rank-based recoloring
 * and animated GIFs for special ranks (Generation, Legendary, Mythic, Ancient, Divine, Secret).
 *
 * Bespoke Shapes:
 * 1. Hunting Gem (💎): Arrowhead / Prismatic Spear Shard (Tinh Thể Mũi Giáo Săn)
 * 2. Empowering Gem (🔮): Hexagonal Arcane Matrix Core (Lõi Ma Lực Lục Giác)
 * 3. Lucky Gem (💖): 4-Leaf Faceted Clover Jewel (Ngọc Cỏ 4 Lá May Mắn)
 * 4. Special Gem (⭐): 8-Point Celestial Compass Starburst (Thần Tinh Bát Giác Thiên Giới)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CANVAS_SIZE = 128;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'emojis', 'gems');
const ARTIFACT_DIR = 'C:/Users/khang/.gemini/antigravity/brain/e1573dd0-adcd-4dc8-99fb-f3fe38332066/gems_emojis';

[OUT_DIR, ARTIFACT_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

/**
 * Draw 4-pointed Sparkle Star (✨)
 */
function drawSparkleStar(ctx, cx, cy, size, alpha = 1, color = '#ffffff') {
  if (size <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;

  const s = Math.max(1, Math.round(size));
  ctx.fillRect(cx - s * 2, cy - Math.max(1, s / 3), s * 4, Math.max(1, s * 0.66));
  ctx.fillRect(cx - Math.max(1, s / 3), cy - s * 2, Math.max(1, s * 0.66), s * 4);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - Math.max(1, s / 2), cy - Math.max(1, s / 2), Math.max(1, s), Math.max(1, s));
  ctx.restore();
}

/**
 * Helpers for vector polygon drawing
 */
function fillPoly(ctx, points, fillStyle) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokePoly(ctx, points, strokeStyle, lineWidth = 2) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/**
 * 💎 SHAPE 1: HUNTING GEM - Arrowhead / Prismatic Spear Shard
 * Sharp, predatory crystal arrowhead with distinct facets and central spine
 */
function drawHuntingShape(ctx, cx, cy, radius, palette) {
  const { dark, shadow, base, mid, light, highlight, border } = palette;
  const w = radius * 0.90;
  const h = radius * 1.15;

  const topPeak = [cx, cy - h];
  const topL = [cx - w * 0.42, cy - h * 0.62];
  const topR = [cx + w * 0.42, cy - h * 0.62];
  const wingL = [cx - w, cy - h * 0.05];
  const wingR = [cx + w, cy - h * 0.05];
  const notchL = [cx - w * 0.42, cy + h * 0.35];
  const notchR = [cx + w * 0.42, cy + h * 0.35];
  const botTip = [cx, cy + h];

  const centerNode = [cx, cy + h * 0.06];
  const topNode = [cx, cy - h * 0.48];

  const outerBorder = [topPeak, topR, wingR, notchR, botTip, notchL, wingL, topL];
  strokePoly(ctx, outerBorder, border, 6);

  // Facets with lighting model (light from top-left)
  fillPoly(ctx, [topPeak, topL, topNode], highlight);
  fillPoly(ctx, [topPeak, topR, topNode], light);
  fillPoly(ctx, [topL, wingL, centerNode, topNode], light);
  fillPoly(ctx, [topR, wingR, centerNode, topNode], mid);
  fillPoly(ctx, [wingL, notchL, centerNode], base);
  fillPoly(ctx, [wingR, notchR, centerNode], shadow);
  fillPoly(ctx, [centerNode, notchL, botTip], mid);
  fillPoly(ctx, [centerNode, notchR, botTip], dark);

  // Facet seam lines
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  [
    [topPeak, topNode],
    [topNode, centerNode],
    [centerNode, botTip],
    [topNode, topL],
    [topNode, topR],
    [centerNode, wingL],
    [centerNode, wingR],
    [centerNode, notchL],
    [centerNode, notchR]
  ].forEach(([p1, p2]) => {
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  });

  // Specular gleam on top-left facet
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(topPeak[0], topPeak[1]);
  ctx.lineTo(topL[0] + 4, topL[1] + 4);
  ctx.lineTo(topNode[0] - 2, topNode[1]);
  ctx.closePath();
  ctx.fill();
}

/**
 * 🔮 SHAPE 2: EMPOWERING GEM - Hexagonal Arcane Matrix Core
 * 6-sided beveled crystal matrix surrounding an inner floating power core
 */
function drawEmpoweringShape(ctx, cx, cy, radius, palette) {
  const { dark, shadow, base, mid, light, highlight, border } = palette;
  const rOuter = radius * 1.05;
  const rInner = radius * 0.46;

  const hexOuter = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * Math.PI / 180;
    hexOuter.push([cx + rOuter * Math.cos(angle), cy + rOuter * Math.sin(angle)]);
  }

  const coreTop = [cx, cy - rInner * 1.15];
  const coreRight = [cx + rInner * 0.95, cy];
  const coreBottom = [cx, cy + rInner * 1.15];
  const coreLeft = [cx - rInner * 0.95, cy];
  const corePoints = [coreTop, coreRight, coreBottom, coreLeft];

  strokePoly(ctx, hexOuter, border, 6);

  const facetColors = [light, mid, shadow, dark, base, highlight];
  for (let i = 0; i < 6; i++) {
    const nextI = (i + 1) % 6;
    const innerP1 = corePoints[i % 4];
    const innerP2 = corePoints[(i + 1) % 4];
    fillPoly(ctx, [hexOuter[i], hexOuter[nextI], innerP2, innerP1], facetColors[i]);
  }

  fillPoly(ctx, [coreTop, coreLeft, [cx, cy]], highlight);
  fillPoly(ctx, [coreTop, coreRight, [cx, cy]], light);
  fillPoly(ctx, [coreBottom, coreLeft, [cx, cy]], mid);
  fillPoly(ctx, [coreBottom, coreRight, [cx, cy]], shadow);

  ctx.strokeStyle = border;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(hexOuter[i][0], hexOuter[i][1]);
    ctx.lineTo(corePoints[i % 4][0], corePoints[i % 4][1]);
    ctx.stroke();
  }
  strokePoly(ctx, corePoints, border, 2.2);

  ctx.beginPath();
  ctx.moveTo(coreLeft[0], coreLeft[1]);
  ctx.lineTo(coreRight[0], coreRight[1]);
  ctx.moveTo(coreTop[0], coreTop[1]);
  ctx.lineTo(coreBottom[0], coreBottom[1]);
  ctx.stroke();

  // White core flare
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(cx - rInner * 0.25, cy - rInner * 0.35, 4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 🍀 SHAPE 3: LUCKY GEM - 4-Leaf Faceted Clover Jewel
 * 4 faceted crystal lobes forming an iconic fortune clover with central diamond jewel
 */
function drawLuckyShape(ctx, cx, cy, radius, palette) {
  const { dark, shadow, base, mid, light, highlight, border } = palette;
  const lobeR = radius * 0.44;
  const dist = radius * 0.52;

  const centers = [
    { x: cx, y: cy - dist, angle: 0 },
    { x: cx + dist, y: cy, angle: 90 },
    { x: cx, y: cy + dist, angle: 180 },
    { x: cx - dist, y: cy, angle: 270 }
  ];

  centers.forEach((c, idx) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle * Math.PI / 180);

    ctx.beginPath();
    ctx.arc(-lobeR * 0.45, -lobeR * 0.45, lobeR * 0.5, Math.PI * 0.75, Math.PI * 1.75);
    ctx.arc(lobeR * 0.45, -lobeR * 0.45, lobeR * 0.5, Math.PI * 1.25, Math.PI * 2.25);
    ctx.lineTo(0, lobeR * 0.65);
    ctx.closePath();

    ctx.strokeStyle = border;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -lobeR * 0.2);
    ctx.arc(-lobeR * 0.45, -lobeR * 0.45, lobeR * 0.5, Math.PI * 0.75, Math.PI * 1.75);
    ctx.lineTo(0, -lobeR * 0.85);
    ctx.lineTo(0, lobeR * 0.65);
    ctx.closePath();
    ctx.fillStyle = idx === 0 ? highlight : (idx === 3 ? light : base);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -lobeR * 0.2);
    ctx.arc(lobeR * 0.45, -lobeR * 0.45, lobeR * 0.5, Math.PI * 1.25, Math.PI * 2.25);
    ctx.lineTo(0, lobeR * 0.65);
    ctx.closePath();
    ctx.fillStyle = idx === 0 ? light : (idx === 1 ? mid : (idx === 2 ? shadow : base));
    ctx.fill();

    ctx.strokeStyle = border;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -lobeR * 0.85);
    ctx.lineTo(0, lobeR * 0.65);
    ctx.stroke();

    ctx.restore();
  });

  const cdR = radius * 0.32;
  const cPoints = [
    [cx, cy - cdR],
    [cx + cdR, cy],
    [cx, cy + cdR],
    [cx - cdR, cy]
  ];
  strokePoly(ctx, cPoints, border, 4);
  fillPoly(ctx, [[cx, cy - cdR], [cx - cdR, cy], [cx, cy]], highlight);
  fillPoly(ctx, [[cx, cy - cdR], [cx + cdR, cy], [cx, cy]], light);
  fillPoly(ctx, [[cx, cy + cdR], [cx - cdR, cy], [cx, cy]], mid);
  fillPoly(ctx, [[cx, cy + cdR], [cx + cdR, cy], [cx, cy]], shadow);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
}

/**
 * ⭐ SHAPE 4: SPECIAL GEM - 8-Point Celestial Compass Starburst
 * 8-ray royal celestial star crystal with 16 facets and radiant central core
 */
function drawSpecialShape(ctx, cx, cy, radius, palette) {
  const { dark, shadow, base, mid, light, highlight, border } = palette;
  const rCard = radius * 1.12;
  const rDiag = radius * 0.70;
  const rInner = radius * 0.35;

  const points = [];
  for (let i = 0; i < 8; i++) {
    const tipAngle = (i * 45 - 90) * Math.PI / 180;
    const rTip = (i % 2 === 0) ? rCard : rDiag;
    points.push([cx + rTip * Math.cos(tipAngle), cy + rTip * Math.sin(tipAngle)]);

    const valleyAngle = (i * 45 - 90 + 22.5) * Math.PI / 180;
    points.push([cx + rInner * Math.cos(valleyAngle), cy + rInner * Math.sin(valleyAngle)]);
  }

  strokePoly(ctx, points, border, 6);

  for (let i = 0; i < 16; i++) {
    const nextI = (i + 1) % 16;
    const p1 = points[i];
    const p2 = points[nextI];

    const angleDeg = (i * 22.5) % 360;
    let facetColor;
    if (angleDeg < 45 || angleDeg > 315) facetColor = highlight;
    else if (angleDeg < 90) facetColor = light;
    else if (angleDeg < 160) facetColor = mid;
    else if (angleDeg < 225) facetColor = shadow;
    else if (angleDeg < 270) facetColor = dark;
    else facetColor = base;

    fillPoly(ctx, [p1, p2, [cx, cy]], facetColor);
  }

  ctx.strokeStyle = border;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(points[i][0], points[i][1]);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }

  const rCore = radius * 0.28;
  const corePts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90 + 22.5) * Math.PI / 180;
    corePts.push([cx + rCore * Math.cos(a), cy + rCore * Math.sin(a)]);
  }
  strokePoly(ctx, corePts, border, 3);
  fillPoly(ctx, corePts, highlight);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 3, cy - 3, 6, 6);
  ctx.fillRect(cx - 7, cy - 1, 14, 2);
  ctx.fillRect(cx - 1, cy - 7, 2, 14);
}

const SHAPE_DRAWERS = {
  hunting: drawHuntingShape,
  empowering: drawEmpoweringShape,
  lucky: drawLuckyShape,
  special: drawSpecialShape
};

/**
 * 10 Rank Color Palettes (Tier C, U, R, E, G, L, M, A, D, S)
 */
const RANK_PALETTES = {
  common: {
    border: '#1c2833',
    dark: '#546e7a',
    shadow: '#78909c',
    base: '#90a4ae',
    mid: '#b0bec5',
    light: '#cfd8dc',
    highlight: '#ffffff'
  },
  uncommon: {
    border: '#003300',
    dark: '#1b5e20',
    shadow: '#2e7d32',
    base: '#388e3c',
    mid: '#4caf50',
    light: '#81c784',
    highlight: '#c8e6c9'
  },
  rare: {
    border: '#001a33',
    dark: '#01579b',
    shadow: '#0277bd',
    base: '#0288d1',
    mid: '#03a9f4',
    light: '#4fc3f7',
    highlight: '#b3e5fc'
  },
  epic: {
    border: '#2a0845',
    dark: '#4a148c',
    shadow: '#6a1b9a',
    base: '#7b1fa2',
    mid: '#8e24aa',
    light: '#ba68c8',
    highlight: '#f3e5f5'
  },
  generation: {
    border: '#00251a',
    dark: '#004d40',
    shadow: '#00695c',
    base: '#00897b',
    mid: '#00bcd4',
    light: '#80deea',
    highlight: '#e0f7fa'
  },
  legendary: {
    border: '#4a2600',
    dark: '#e65100',
    shadow: '#ef6c00',
    base: '#f57c00',
    mid: '#ff9800',
    light: '#ffb74d',
    highlight: '#fff9c4'
  },
  mythic: {
    border: '#3e001f',
    dark: '#880e4f',
    shadow: '#b71c1c',
    base: '#c62828',
    mid: '#e53935',
    light: '#ff8a80',
    highlight: '#ffebee'
  },
  ancient: {
    border: '#001a14',
    dark: '#00332c',
    shadow: '#004d40',
    base: '#00695c',
    mid: '#00897b',
    light: '#4db6ac',
    highlight: '#b2dfdb'
  },
  divine: {
    border: '#3e2723',
    dark: '#bf360c',
    shadow: '#e65100',
    base: '#f57f17',
    mid: '#fbc02d',
    light: '#fff59d',
    highlight: '#ffffff'
  },
  secret: {
    border: '#12005e',
    dark: '#311b92',
    shadow: '#4a148c',
    base: '#651fff',
    mid: '#7c4dff',
    light: '#e040fb',
    highlight: '#f3e5f5'
  }
};

/**
 * ❄️ GENERATION EFFECT (Tier G - Mint & Ice-Cyan Cyber Sweep)
 */
function applyGenerationEffect(ctx, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -30 + progress * (width + 60);
  const grad = ctx.createLinearGradient(sheenPos - 22, sheenPos - 22, sheenPos + 22, sheenPos + 22);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(180, 255, 255, 0.75)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const particles = [
    { x: width * 0.28, yBase: height * 0.82, phase: 0.0, color: '#00f2fe' },
    { x: width * 0.72, yBase: height * 0.78, phase: 0.33, color: '#69f0ae' },
    { x: width * 0.50, yBase: height * 0.65, phase: 0.66, color: '#ffffff' }
  ];

  particles.forEach(p => {
    const t = (progress + p.phase) % 1;
    const currY = p.yBase - t * (height * 0.5);
    const alpha = Math.sin(t * Math.PI);
    const size = 1.5 + Math.sin(t * Math.PI) * 2.5;
    drawSparkleStar(ctx, p.x, currY, size, alpha, p.color);
  });
}

/**
 * 🌟 LEGENDARY EFFECT (Tier L - Solar Amber Gleam & Star Dust)
 */
function applyLegendaryEffect(ctx, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -30 + progress * (width + 60);
  const grad = ctx.createLinearGradient(sheenPos - 24, sheenPos - 24, sheenPos + 24, sheenPos + 24);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 245, 180, 0.8)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const sparks = [
    { x: width * 0.25, yBase: height * 0.82, phase: 0.1, color: '#ffb74d' },
    { x: width * 0.75, yBase: height * 0.80, phase: 0.45, color: '#fff59d' },
    { x: width * 0.50, yBase: height * 0.50, phase: 0.8, color: '#ffffff' }
  ];

  sparks.forEach(p => {
    const t = (progress + p.phase) % 1;
    const currY = p.yBase - t * (height * 0.45);
    const alpha = Math.sin(t * Math.PI);
    const size = 1.5 + Math.sin(t * Math.PI) * 3;
    drawSparkleStar(ctx, p.x, currY, size, alpha, p.color);
  });
}

/**
 * 🌸 MYTHIC EFFECT (Tier M - Ruby Flame Sheen & Pink Diamond Dust)
 */
function applyMythicEffect(ctx, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -25 + progress * (width + 50);
  const grad = ctx.createLinearGradient(sheenPos - 20, sheenPos - 20, sheenPos + 20, sheenPos + 20);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 180, 200, 0.7)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const sparkles = [
    { x: width * 0.30, yBase: height * 0.85, phase: 0.1, color: '#ff4081' },
    { x: width * 0.70, yBase: height * 0.85, phase: 0.4, color: '#ff5252' },
    { x: width * 0.50, yBase: height * 0.45, phase: 0.7, color: '#ffffff' }
  ];

  sparkles.forEach(p => {
    const t = (progress + p.phase) % 1;
    const currY = p.yBase - t * (height * 0.45);
    const alpha = Math.sin(t * Math.PI);
    const size = 1.5 + Math.sin(t * Math.PI) * 2.5;
    drawSparkleStar(ctx, p.x, currY, size, alpha, p.color);
  });
}

/**
 * 🔥 ANCIENT EFFECT (Tier A - Teal Energy Surge & Flame Embers)
 */
function applyAncientEffect(ctx, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const surgeY = height * 0.95 - progress * (height * 0.9);
  const grad = ctx.createLinearGradient(0, surgeY - 18, 0, surgeY + 18);
  grad.addColorStop(0, 'rgba(255, 215, 64, 0)');
  grad.addColorStop(0.5, 'rgba(255, 215, 64, 0.65)');
  grad.addColorStop(1, 'rgba(255, 215, 64, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const embers = [
    { x: width * 0.30, yBase: height * 0.85, drift: 8, phase: 0.0, color: '#ff9800' },
    { x: width * 0.70, yBase: height * 0.85, drift: -8, phase: 0.33, color: '#ffd54f' },
    { x: width * 0.50, yBase: height * 0.75, drift: 4, phase: 0.66, color: '#ff5722' }
  ];

  embers.forEach(e => {
    const t = (progress + e.phase) % 1;
    const currY = e.yBase - t * (height * 0.55);
    const currX = e.x + Math.sin(t * Math.PI * 2) * e.drift;
    const alpha = Math.sin(t * Math.PI);
    drawSparkleStar(ctx, currX, currY, 2.5, alpha, e.color);
  });
}

/**
 * 💎 DIVINE EFFECT (Tier D - Rotating Celestial Ray Cross & Supernova Flare)
 */
function applyDivineEffect(ctx, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;
  const cx = width * 0.5, cy = height * 0.5;

  const starPulse = Math.sin(progress * Math.PI * 2);
  const rayLen = 16 + starPulse * 8;
  const alpha = 0.65 + Math.sin(progress * Math.PI * 2) * 0.3;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);
  ctx.rotate(progress * Math.PI * 2);
  ctx.fillStyle = `rgba(255, 240, 150, ${alpha * 0.8})`;
  ctx.fillRect(-rayLen, -1.5, rayLen * 2, 3);
  ctx.fillRect(-1.5, -rayLen, 3, rayLen * 2);

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
  ctx.fillRect(-rayLen * 0.65, -1, rayLen * 1.3, 2);
  ctx.fillRect(-1, -rayLen * 0.65, 2, rayLen * 1.3);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -25 + progress * (width + 50);
  const grad = ctx.createLinearGradient(sheenPos - 22, sheenPos - 22, sheenPos + 22, sheenPos + 22);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 250, 180, 0.75)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const corners = [
    { x: width * 0.22, y: height * 0.22, phase: 0.0 },
    { x: width * 0.78, y: height * 0.22, phase: 0.33 },
    { x: width * 0.50, y: height * 0.82, phase: 0.66 }
  ];
  corners.forEach(p => {
    const cycle = (progress + p.phase) % 1;
    if (cycle < 0.45) {
      const prog = cycle / 0.45;
      const size = Math.sin(prog * Math.PI) * 3.5;
      const a = Math.sin(prog * Math.PI);
      drawSparkleStar(ctx, p.x, p.y, size, a, '#fff8b3');
    }
  });
}

/**
 * 🌌 SECRET EFFECT (Tier S - Cosmic Void Galaxy Wave & Nebula Motes)
 */
function applySecretEffect(ctx, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -30 + progress * (width + 60);
  const grad = ctx.createLinearGradient(sheenPos - 25, sheenPos - 25, sheenPos + 25, sheenPos + 25);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.3, 'rgba(230, 80, 255, 0.65)');
  grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.65)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const stars = [
    { x: width * 0.22, yBase: height * 0.80, phase: 0.0, color: '#e040fb' },
    { x: width * 0.78, yBase: height * 0.75, phase: 0.25, color: '#00e5ff' },
    { x: width * 0.45, yBase: height * 0.60, phase: 0.50, color: '#ffffff' },
    { x: width * 0.65, yBase: height * 0.88, phase: 0.75, color: '#b388ff' }
  ];

  stars.forEach(p => {
    const t = (progress + p.phase) % 1;
    const currY = p.yBase - t * (height * 0.5);
    const alpha = Math.sin(t * Math.PI);
    const size = 1.5 + Math.sin(t * Math.PI) * 2.8;
    drawSparkleStar(ctx, p.x, currY, size, alpha, p.color);
  });
}

const ANIMATION_EFFECTS = {
  generation: applyGenerationEffect,
  legendary: applyLegendaryEffect,
  mythic: applyMythicEffect,
  ancient: applyAncientEffect,
  divine: applyDivineEffect,
  secret: applySecretEffect
};

/**
 * Generate animated GIF via FFmpeg
 */
async function generateGif(drawShapeFn, animFn, outputFile, totalFrames = 16, fps = 15) {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'bgra',
    '-s', `${CANVAS_SIZE}x${CANVAS_SIZE}`,
    '-r', `${fps}`,
    '-i', '-',
    '-vf', 'split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=1:transparency_color=000000[p];[s1][p]paletteuse=alpha_threshold=128:dither=none',
    '-gifflags', '-offsetting',
    '-loop', '0',
    outputFile
  ]);

  for (let i = 0; i < totalFrames; i++) {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawShapeFn(ctx);
    if (animFn) {
      animFn(ctx, i, totalFrames);
    }
    const buffer = canvas.toBuffer('raw');
    ffmpeg.stdin.write(buffer);
  }

  ffmpeg.stdin.end();

  return new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg error code ${code}`));
    });
  });
}

/**
 * Generate All Gem Visual Assets
 */
async function main() {
  console.log('🚀 Generating CokeBot custom bespoke gem emojis (unique shapes + rank colors + GIF effects)...');

  const { GEMS_DATA } = require('../data/gems');

  let generatedCount = 0;
  let gifCount = 0;

  for (const gem of GEMS_DATA) {
    const type = gem.type;
    const tierKey = gem.tier.toLowerCase();
    const id = gem.id;

    const drawer = SHAPE_DRAWERS[type];
    const palette = RANK_PALETTES[tierKey] || RANK_PALETTES.common;

    if (!drawer) {
      console.warn(`Unknown drawer for gem type: ${type}`);
      continue;
    }

    // 1. Generate Static PNG (128x128)
    const pngFilename = `gem_${id}_${type}_${tierKey}.png`;
    const outPngPath = path.join(OUT_DIR, pngFilename);
    const artPngPath = path.join(ARTIFACT_DIR, pngFilename);

    const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const ctx = canvas.getContext('2d');
    drawer(ctx, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 46, palette);

    const pngBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outPngPath, pngBuffer);
    fs.writeFileSync(artPngPath, pngBuffer);
    generatedCount++;

    // 2. Generate Animated GIF if this rank has animation effect
    const animEffect = ANIMATION_EFFECTS[tierKey];
    if (animEffect) {
      const gifFilename = `gem_${id}_${type}_${tierKey}.gif`;
      const outGifPath = path.join(OUT_DIR, gifFilename);
      const artGifPath = path.join(ARTIFACT_DIR, gifFilename);

      const drawBase = (c) => drawer(c, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 46, palette);
      await generateGif(drawBase, animEffect, outGifPath, 16, 15);
      fs.copyFileSync(outGifPath, artGifPath);
      gifCount++;
      console.log(`  ✨ [${gem.tier}] ${gem.name} -> PNG & GIF generated (${id})`);
    } else {
      console.log(`  ✅ [${gem.tier}] ${gem.name} -> PNG generated (${id})`);
    }
  }

  // 3. Generate Complete Showcase Matrix Image
  console.log('\n📊 Generating Complete Showcase Matrix Image (gem_showcase_all.png)...');
  const showRanks = ['common', 'rare', 'epic', 'generation', 'legendary', 'mythic', 'ancient', 'divine', 'secret'];
  const showTypes = ['hunting', 'empowering', 'lucky', 'special'];
  const typeHeaders = ['Hunting Shard', 'Empowering Core', 'Lucky Clover', 'Celestial Star'];

  const CELL_W = 140;
  const CELL_H = 140;
  const HEADER_H = 50;
  const LABEL_W = 140;

  const matrixW = LABEL_W + CELL_W * showTypes.length;
  const matrixH = HEADER_H + CELL_H * showRanks.length;

  const showCanvas = createCanvas(matrixW, matrixH);
  const showCtx = showCanvas.getContext('2d');

  // Dark sleek Discord-style background
  showCtx.fillStyle = '#1e1f22';
  showCtx.fillRect(0, 0, matrixW, matrixH);

  // Column Headers
  showCtx.font = 'bold 15px sans-serif';
  showCtx.textAlign = 'center';
  showCtx.textBaseline = 'middle';
  showCtx.fillStyle = '#ffffff';

  showTypes.forEach((t, i) => {
    const x = LABEL_W + i * CELL_W + CELL_W / 2;
    showCtx.fillText(typeHeaders[i], x, HEADER_H / 2);
  });

  // Rows
  showRanks.forEach((rank, rIdx) => {
    const yRow = HEADER_H + rIdx * CELL_H;
    const p = RANK_PALETTES[rank];

    // Alternating row background
    if (rIdx % 2 === 1) {
      showCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      showCtx.fillRect(0, yRow, matrixW, CELL_H);
    }

    // Rank Label
    showCtx.font = 'bold 16px sans-serif';
    showCtx.textAlign = 'right';
    showCtx.fillStyle = p.highlight === '#ffffff' ? p.mid : p.highlight;
    showCtx.fillText(rank.toUpperCase(), LABEL_W - 20, yRow + CELL_H / 2);

    // Draw Gems in each cell
    showTypes.forEach((t, cIdx) => {
      const cx = LABEL_W + cIdx * CELL_W + CELL_W / 2;
      const cy = yRow + CELL_H / 2;
      const drawer = SHAPE_DRAWERS[t];
      drawer(showCtx, cx, cy, 44, p);
    });
  });

  const showcaseOut = path.join(OUT_DIR, 'gem_showcase_all.png');
  const showcaseBuffer = showCanvas.toBuffer('image/png');
  fs.writeFileSync(showcaseOut, showcaseBuffer);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'gem_showcase_all.png'), showcaseBuffer);

  console.log(`\n🎉 DONE! Generated ${generatedCount} static PNGs, ${gifCount} animated GIFs, and showcase image.`);
  console.log(`📁 Assets written to: ${OUT_DIR}`);
  console.log(`📁 Artifacts written to: ${ARTIFACT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
