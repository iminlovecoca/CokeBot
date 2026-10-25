/**
 * CokeBot AI-Generated Pixel Crystal Gem Emojis Pipeline
 *
 * Integrates AI-generated crystal gems with a tasteful retro pixel art vibe:
 * - Hunting Gems: Sharp borderless AI Diamond Crystals (💎)
 * - Empowering Gems: Sharp borderless AI Octagon Crystals (🔮)
 * - Lucky Gems: Sharp borderless AI Heart Crystals (💖)
 * - Special Gems: Sharp borderless AI Triangle Crystals (🔺)
 *
 * Pixel Art Touch:
 * - Quantized to crisp 36px native pixel grid with nearest-neighbor integer scaling to 128x128.
 * - Zero black outlines: edges transition directly into crisp stepped pixel facets.
 * - Colors strictly adhering to CokeBot's 9 rank tiers.
 * - Animated GIFs with pixel sparkle stars and glowing sheen sweeps for special ranks.
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CANVAS_SIZE = 128;
const BRAIN_DIR = 'C:/Users/khang/.gemini/antigravity/brain/e1573dd0-adcd-4dc8-99fb-f3fe38332066';
const OUT_DIR = path.join(__dirname, '..', 'assets', 'emojis', 'gems');
const ARTIFACT_DIR = 'C:/Users/khang/.gemini/antigravity/brain/e1573dd0-adcd-4dc8-99fb-f3fe38332066/gems_emojis';

[OUT_DIR, ARTIFACT_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const AI_SHEETS = {
  hunting: path.join(BRAIN_DIR, 'ai_sheet_hunting_gems_v2_1792942044519.jpg'),
  empowering: path.join(BRAIN_DIR, 'ai_sheet_empowering_gems_v2_1792942070810.jpg'),
  lucky: path.join(BRAIN_DIR, 'ai_sheet_lucky_gems_v2_1792942096006.jpg'),
  special: path.join(BRAIN_DIR, 'ai_sheet_special_gems_v2_1792944547406.jpg'),
};

const GEM_SPECS = [
  {
    type: 'hunting',
    name: 'Hunting Gem',
    shape: 'Diamond (💎)',
    sheetKey: 'hunting',
    ids: { common: '51', rare: '53', epic: '54', generation: '58', legendary: '56', mythic: '55', ancient: '57', divine: '59', secret: '60' }
  },
  {
    type: 'empowering',
    name: 'Empowering Gem',
    shape: 'Octagon (🔮)',
    sheetKey: 'empowering',
    ids: { common: '65', rare: '67', epic: '68', generation: '85', legendary: '70', mythic: '69', ancient: '71', divine: '87', secret: '89' }
  },
  {
    type: 'lucky',
    name: 'Lucky Gem',
    shape: 'Heart (💖)',
    sheetKey: 'lucky',
    ids: { common: '72', rare: '74', epic: '75', generation: '86', legendary: '77', mythic: '76', ancient: '78', divine: '88', secret: '90' }
  },
  {
    type: 'special',
    name: 'Special Gem',
    shape: 'Triangle (🔺)',
    sheetKey: 'special',
    ids: { common: '79', rare: '81', epic: '82', generation: '91', legendary: '84', mythic: '83', ancient: '92', divine: '93', secret: '94' }
  }
];

const RANKS = ['common', 'rare', 'epic', 'generation', 'legendary', 'mythic', 'ancient', 'divine', 'secret'];

/**
 * 4-Pointed Retro Pixel Sparkle Star (✨)
 */
function drawSparkleStar(ctx, cx, cy, size, alpha = 1, color = '#ffffff') {
  if (size <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;

  const s = Math.max(1, Math.round(size));
  ctx.fillRect(Math.round(cx - s * 2), Math.round(cy - Math.max(1, s / 3)), Math.round(s * 4), Math.max(2, Math.round(s * 0.66)));
  ctx.fillRect(Math.round(cx - Math.max(1, s / 3)), Math.round(cy - s * 2), Math.max(2, Math.round(s * 0.66)), Math.round(s * 4));

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(cx - Math.max(1, s / 2)), Math.round(cy - Math.max(1, s / 2)), Math.max(2, Math.round(s)), Math.max(2, Math.round(s)));
  ctx.restore();
}

/**
 * Extract cell from 3x3 sheet, remove background/borders, and render with crisp tasteful pixel art stepping
 */
function extractPixelGemCell(sheetImg, row, col, pixelRes = 64, isSecret = false) {
  const cellW = sheetImg.width / 3;
  const cellH = sheetImg.height / 3;

  const rawCanvas = createCanvas(cellW, cellH);
  const rawCtx = rawCanvas.getContext('2d');
  rawCtx.drawImage(sheetImg, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);

  const imgData = rawCtx.getImageData(0, 0, cellW, cellH);
  const data = imgData.data;

  // Outer border flood-fill:
  // For Secret gems (dark obsidian/void crystals), bgThreshold = 8 stops cleanly at the outer boundary
  // and completely protects internal dark charcoal facets from being hollowed out.
  // For other ranks (Common to Divine bright crystals), bgThreshold = 22 strips any dark compression fringe.
  const bgThreshold = isSecret ? 8 : 22;
  const bg = new Uint8Array(cellW * cellH);
  const queue = [];

  for (let x = 0; x < cellW; x++) {
    let t = x * 4;
    if (Math.max(data[t], data[t + 1], data[t + 2]) < bgThreshold) { bg[x] = 1; queue.push(x); }
    let b = ((cellH - 1) * cellW + x) * 4;
    if (Math.max(data[b], data[b + 1], data[b + 2]) < bgThreshold) { bg[(cellH - 1) * cellW + x] = 1; queue.push((cellH - 1) * cellW + x); }
  }

  for (let y = 0; y < cellH; y++) {
    let l = (y * cellW) * 4;
    if (!bg[y * cellW] && Math.max(data[l], data[l + 1], data[l + 2]) < bgThreshold) { bg[y * cellW] = 1; queue.push(y * cellW); }
    let r = (y * cellW + (cellW - 1)) * 4;
    if (!bg[y * cellW + (cellW - 1)] && Math.max(data[r], data[r + 1], data[r + 2]) < bgThreshold) { bg[y * cellW + (cellW - 1)] = 1; queue.push(y * cellW + (cellW - 1)); }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % cellW;
    const cy = Math.floor(curr / cellW);

    const neighbors = [
      cy > 0 ? curr - cellW : -1,
      cy < cellH - 1 ? curr + cellW : -1,
      cx > 0 ? curr - 1 : -1,
      cx < cellW - 1 ? curr + 1 : -1
    ];

    for (let i = 0; i < 4; i++) {
      const n = neighbors[i];
      if (n !== -1 && bg[n] === 0) {
        const nIdx = n * 4;
        const maxC = Math.max(data[nIdx], data[nIdx + 1], data[nIdx + 2]);
        if (maxC < bgThreshold) {
          bg[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  let minX = cellW, minY = cellH, maxX = 0, maxY = 0;
  for (let i = 0; i < cellW * cellH; i++) {
    const pIdx = i * 4;
    if (bg[i] === 1) {
      data[pIdx + 3] = 0;
    } else {
      data[pIdx + 3] = 255;
      const px = i % cellW;
      const py = Math.floor(i / cellW);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  rawCtx.putImageData(imgData, 0, 0);

  // 1. Crop to bounding box
  const cropW = Math.max(4, maxX - minX + 1);
  const cropH = Math.max(4, maxY - minY + 1);

  // 2. Downsample to refined pixel grid (~64px for tasteful retro RPG pixel vibe without extreme blockiness)
  const scale = Math.min(pixelRes / cropW, pixelRes / cropH);
  const smallW = Math.max(4, Math.round(cropW * scale));
  const smallH = Math.max(4, Math.round(cropH * scale));

  const smallCanvas = createCanvas(smallW, smallH);
  const smallCtx = smallCanvas.getContext('2d');
  smallCtx.drawImage(rawCanvas, minX, minY, cropW, cropH, 0, 0, smallW, smallH);

  // Clean alpha on small pixel canvas
  const smallData = smallCtx.getImageData(0, 0, smallW, smallH);
  const sData = smallData.data;
  for (let i = 0; i < sData.length; i += 4) {
    if (sData[i + 3] < 30) sData[i + 3] = 0;
    else if (sData[i + 3] > 80) sData[i + 3] = 255;
  }
  smallCtx.putImageData(smallData, 0, 0);

  // 3. Upscale to ~104px body inside 128x128 with nearest neighbor for sharp pixel facet definition
  const TARGET_BODY = 104;
  const bodyScale = TARGET_BODY / Math.max(smallW, smallH);
  const finalW = Math.round(smallW * bodyScale);
  const finalH = Math.round(smallH * bodyScale);

  const finalCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for retro pixel art vibe

  const destX = Math.round((CANVAS_SIZE - finalW) / 2);
  const destY = Math.round((CANVAS_SIZE - finalH) / 2);

  finalCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, destX, destY, finalW, finalH);

  return finalCanvas;
}

/**
 * ❄️ GENERATION EFFECT (Cyber Ice-Mint Sheen & Pixel Frost Motes)
 */
function applyGenerationEffect(ctx, baseImg, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -30 + progress * (width + 60);
  const grad = ctx.createLinearGradient(sheenPos - 22, sheenPos - 22, sheenPos + 22, sheenPos + 22);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(200, 255, 255, 0.75)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const particles = [
    { x: width * 0.28, yBase: height * 0.82, phase: 0.0, color: '#7df9ff' },
    { x: width * 0.72, yBase: height * 0.78, phase: 0.33, color: '#a7f3d0' },
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
 * 👑 LEGENDARY EFFECT (Royal Purple Arcane Sheen & Violet Pixel Stardust)
 */
function applyLegendaryEffect(ctx, baseImg, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -30 + progress * (width + 60);
  const grad = ctx.createLinearGradient(sheenPos - 24, sheenPos - 24, sheenPos + 24, sheenPos + 24);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(220, 175, 255, 0.78)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const sparks = [
    { x: width * 0.26, yBase: height * 0.82, phase: 0.1, color: '#c487fa' },
    { x: width * 0.74, yBase: height * 0.80, phase: 0.45, color: '#e9c3ff' },
    { x: width * 0.50, yBase: height * 0.50, phase: 0.8, color: '#ffffff' }
  ];

  sparks.forEach(p => {
    const t = (progress + p.phase) % 1;
    const currY = p.yBase - t * (height * 0.45);
    const alpha = Math.sin(t * Math.PI);
    const size = 1.5 + Math.sin(t * Math.PI) * 2.8;
    drawSparkleStar(ctx, p.x, currY, size, alpha, p.color);
  });
}

/**
 * 🌸 MYTHIC EFFECT (Hot Magenta Sheen & Pink Diamond Pixel Dust)
 */
function applyMythicEffect(ctx, baseImg, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -25 + progress * (width + 50);
  const grad = ctx.createLinearGradient(sheenPos - 20, sheenPos - 20, sheenPos + 20, sheenPos + 20);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 180, 225, 0.75)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const sparkles = [
    { x: width * 0.30, yBase: height * 0.85, phase: 0.1, color: '#f65fc3' },
    { x: width * 0.70, yBase: height * 0.85, phase: 0.4, color: '#fd96e4' },
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
 * 🔥 ANCIENT EFFECT (Flame Orange Energy Surge & Pixel Embers)
 */
function applyAncientEffect(ctx, baseImg, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const surgeY = height * 0.95 - progress * (height * 0.9);
  const grad = ctx.createLinearGradient(0, surgeY - 18, 0, surgeY + 18);
  grad.addColorStop(0, 'rgba(255, 200, 80, 0)');
  grad.addColorStop(0.5, 'rgba(255, 200, 80, 0.70)');
  grad.addColorStop(1, 'rgba(255, 200, 80, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const embers = [
    { x: width * 0.30, yBase: height * 0.85, drift: 8, phase: 0.0, color: '#fb8c2e' },
    { x: width * 0.70, yBase: height * 0.85, drift: -8, phase: 0.33, color: '#ffe600' },
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
 * 💎 DIVINE EFFECT (Celestial Turquoise Rotating Pixel Cross & Halo)
 */
function applyDivineEffect(ctx, baseImg, frameIndex, totalFrames) {
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
  ctx.fillStyle = `rgba(170, 255, 255, ${alpha * 0.85})`;
  ctx.fillRect(Math.round(-rayLen), -1.5, Math.round(rayLen * 2), 3);
  ctx.fillRect(-1.5, Math.round(-rayLen), 3, Math.round(rayLen * 2));

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
  ctx.fillRect(Math.round(-rayLen * 0.65), -1, Math.round(rayLen * 1.3), 2);
  ctx.fillRect(-1, Math.round(-rayLen * 0.65), 2, Math.round(rayLen * 1.3));
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -25 + progress * (width + 50);
  const grad = ctx.createLinearGradient(sheenPos - 22, sheenPos - 22, sheenPos + 22, sheenPos + 22);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(180, 255, 255, 0.75)');
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
      drawSparkleStar(ctx, p.x, p.y, size, a, '#a4feff');
    }
  });
}

/**
 * 🌌 SECRET EFFECT (Obsidian Dark Void Silver Sheen & Floating Stardust)
 */
function applySecretEffect(ctx, baseImg, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -30 + progress * (width + 60);
  const grad = ctx.createLinearGradient(sheenPos - 24, sheenPos - 24, sheenPos + 24, sheenPos + 24);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(225, 225, 235, 0.60)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const stars = [
    { x: width * 0.22, yBase: height * 0.80, phase: 0.0, color: '#dcdce1' },
    { x: width * 0.78, yBase: height * 0.75, phase: 0.25, color: '#ffffff' },
    { x: width * 0.45, yBase: height * 0.60, phase: 0.50, color: '#b9b9b9' },
    { x: width * 0.65, yBase: height * 0.88, phase: 0.75, color: '#ffffff' }
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
async function generateGif(baseCanvas, animFn, outputFile, totalFrames = 16, fps = 15) {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

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
    ctx.drawImage(baseCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (animFn) {
      animFn(ctx, baseCanvas, i, totalFrames);
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

async function main() {
  console.log('🚀 Processing AI-Generated Pixel Crystal Gem Sprite Sheets...');

  let pngCount = 0;
  let gifCount = 0;

  for (const spec of GEM_SPECS) {
    const t = spec.type;
    console.log(`\n💎 Processing Gem Type: ${spec.name} (${spec.shape})`);

    const sheetPath = AI_SHEETS[spec.sheetKey];
    if (!fs.existsSync(sheetPath)) {
      throw new Error(`AI Sheet not found: ${sheetPath}`);
    }

    const sheetImg = await loadImage(sheetPath);

    for (let idx = 0; idx < RANKS.length; idx++) {
      const rank = RANKS[idx];
      const id = spec.ids[rank];
      if (!id) continue;

      const row = Math.floor(idx / 3);
      const col = idx % 3;

      // Extract with border flood-fill isolation (protects dark obsidian facets) and subtle 64px pixel stepping
      const isSecret = rank === 'secret';
      const gemCanvas = extractPixelGemCell(sheetImg, row, col, 64, isSecret);

      const pngFilename = `gem_${id}_${t}_${rank}.png`;
      const outPng = path.join(OUT_DIR, pngFilename);
      const artPng = path.join(ARTIFACT_DIR, pngFilename);

      const pngBuffer = gemCanvas.toBuffer('image/png');
      fs.writeFileSync(outPng, pngBuffer);
      fs.writeFileSync(artPng, pngBuffer);
      pngCount++;

      // Animated GIF if rank has animation
      const animFn = ANIMATION_EFFECTS[rank];
      if (animFn) {
        const gifFilename = `gem_${id}_${t}_${rank}.gif`;
        const outGif = path.join(OUT_DIR, gifFilename);
        const artGif = path.join(ARTIFACT_DIR, gifFilename);

        await generateGif(gemCanvas, animFn, outGif, 16, 15);
        fs.copyFileSync(outGif, artGif);
        gifCount++;
        console.log(`  ✨ [${rank.toUpperCase()}] ID #${id} -> Pixel PNG & GIF (${pngFilename})`);
      } else {
        console.log(`  ✅ [${rank.toUpperCase()}] ID #${id} -> Pixel PNG (${pngFilename})`);
      }
    }
  }

  // Generate Showcase Matrix
  console.log('\n📊 Generating Complete Showcase Matrix Image (gem_showcase_all.png)...');
  const typeHeaders = ['Hunting Gem 💎', 'Empowering Gem 🔮', 'Lucky Gem 💖', 'Special Gem 🔺'];
  const rankColors = {
    common: '#c4c2c7',
    rare: '#fdef2e',
    epic: '#5bcafd',
    generation: '#4ce1f9',
    legendary: '#c487fa',
    mythic: '#f65fc3',
    ancient: '#fb8c2e',
    divine: '#4cf9fb',
    secret: '#dcdce1'
  };

  const CELL_W = 140;
  const CELL_H = 140;
  const HEADER_H = 50;
  const LABEL_W = 160;

  const matrixW = LABEL_W + CELL_W * GEM_SPECS.length;
  const matrixH = HEADER_H + CELL_H * RANKS.length;

  const showCanvas = createCanvas(matrixW, matrixH);
  const showCtx = showCanvas.getContext('2d');
  showCtx.imageSmoothingEnabled = false;

  showCtx.fillStyle = '#1e1f22';
  showCtx.fillRect(0, 0, matrixW, matrixH);

  showCtx.font = 'bold 15px sans-serif';
  showCtx.textAlign = 'center';
  showCtx.textBaseline = 'middle';
  showCtx.fillStyle = '#ffffff';

  GEM_SPECS.forEach((s, i) => {
    const x = LABEL_W + i * CELL_W + CELL_W / 2;
    showCtx.fillText(typeHeaders[i], x, HEADER_H / 2);
  });

  for (let rIdx = 0; rIdx < RANKS.length; rIdx++) {
    const rank = RANKS[rIdx];
    const yRow = HEADER_H + rIdx * CELL_H;

    if (rIdx % 2 === 1) {
      showCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      showCtx.fillRect(0, yRow, matrixW, CELL_H);
    }

    showCtx.font = 'bold 16px sans-serif';
    showCtx.textAlign = 'right';
    showCtx.fillStyle = rankColors[rank];
    showCtx.fillText(rank.toUpperCase(), LABEL_W - 20, yRow + CELL_H / 2);

    for (let cIdx = 0; cIdx < GEM_SPECS.length; cIdx++) {
      const spec = GEM_SPECS[cIdx];
      const sheetImg = await loadImage(AI_SHEETS[spec.sheetKey]);
      const row = Math.floor(rIdx / 3);
      const col = rIdx % 3;
      const isSecret = rank === 'secret';
      const gemCanvas = extractPixelGemCell(sheetImg, row, col, 64, isSecret);

      const cx = LABEL_W + cIdx * CELL_W + (CELL_W - CANVAS_SIZE) / 2;
      const cy = yRow + (CELL_H - CANVAS_SIZE) / 2;
      showCtx.drawImage(gemCanvas, cx, cy, CANVAS_SIZE, CANVAS_SIZE);
    }
  }

  const showcaseOut = path.join(OUT_DIR, 'gem_showcase_all.png');
  const showcaseBuffer = showCanvas.toBuffer('image/png');
  fs.writeFileSync(showcaseOut, showcaseBuffer);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'gem_showcase_all.png'), showcaseBuffer);

  console.log(`\n🎉 DONE! Generated ${pngCount} static PNGs, ${gifCount} animated GIFs, and showcase image.`);
  console.log(`📁 Assets written to: ${OUT_DIR}`);
  console.log(`📁 Artifacts written to: ${ARTIFACT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
