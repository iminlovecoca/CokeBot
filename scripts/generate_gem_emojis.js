/**
 * CokeBot AI-Generated Gem Emojis Pipeline
 * Slices 4 AI-generated 3x3 crystal gem sprite sheets into clean 128x128 transparent Discord emojis:
 * - Hunting Gems: AI-generated faceted diamonds (💎)
 * - Empowering Gems: AI-generated faceted octagons (🔮)
 * - Lucky Gems: AI-generated faceted hearts (💖)
 * - Special Gems: AI-generated faceted triangles (🔺)
 *
 * All 4 sheets are strictly colored according to CokeBot's Rank Tier Palette,
 * with animated transparent GIFs generated for special ranks (Generation, Legendary, Mythic, Ancient, Divine, Secret).
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
  hunting: path.join(BRAIN_DIR, 'ai_sheet_hunting_gems_1792940755501.jpg'),
  empowering: path.join(BRAIN_DIR, 'ai_sheet_empowering_gems_1792940777916.jpg'),
  lucky: path.join(BRAIN_DIR, 'ai_sheet_lucky_gems_1792940800841.jpg'),
  special: path.join(BRAIN_DIR, 'ai_sheet_special_gems_1792940828137.jpg'),
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
 * 4-Pointed Sparkle Star for sparkling effects
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
 * Extract a single cell from 3x3 AI sheet, remove black background, and center onto 128x128
 */
function extractAndCleanCell(sheetImg, row, col) {
  const cellW = sheetImg.width / 3;
  const cellH = sheetImg.height / 3;

  const rawCanvas = createCanvas(cellW, cellH);
  const rawCtx = rawCanvas.getContext('2d');
  rawCtx.drawImage(sheetImg, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);

  const imgData = rawCtx.getImageData(0, 0, cellW, cellH);
  const data = imgData.data;

  let minX = cellW, minY = cellH, maxX = 0, maxY = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxC = Math.max(r, g, b);

    // Alpha feathering on pitch black background
    let a = 0;
    if (maxC > 40) {
      a = 255;
    } else if (maxC > 16) {
      a = Math.round(((maxC - 16) / 24) * 255);
    }
    data[i + 3] = a;

    if (a > 64) {
      const px = (i / 4) % cellW;
      const py = Math.floor((i / 4) / cellW);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  rawCtx.putImageData(imgData, 0, 0);

  // Center onto 128x128 canvas
  const finalCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const finalCtx = finalCanvas.getContext('2d');

  if (maxX > minX && maxY > minY) {
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    const TARGET_SIZE = 104;
    const scale = Math.min(TARGET_SIZE / cropW, TARGET_SIZE / cropH);
    const destW = Math.round(cropW * scale);
    const destH = Math.round(cropH * scale);
    const destX = Math.round((CANVAS_SIZE - destW) / 2);
    const destY = Math.round((CANVAS_SIZE - destH) / 2);

    finalCtx.drawImage(rawCanvas, minX, minY, cropW, cropH, destX, destY, destW, destH);
  } else {
    finalCtx.drawImage(rawCanvas, 0, 0, cellW, cellH, 12, 12, 104, 104);
  }

  return finalCanvas;
}

/**
 * ❄️ GENERATION EFFECT (Cyber Ice-Mint Sheen & Frost Motes)
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
 * 👑 LEGENDARY EFFECT (Royal Purple Arcane Sheen & Violet Stardust)
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
 * 🌸 MYTHIC EFFECT (Hot Magenta Sheen & Pink Diamond Dust)
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
 * 🔥 ANCIENT EFFECT (Flame Orange Energy Surge & Embers)
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
 * 💎 DIVINE EFFECT (Celestial Turquoise Rotating Ray Cross & Halo)
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
  ctx.fillRect(-rayLen, -1.5, rayLen * 2, 3);
  ctx.fillRect(-1.5, -rayLen, 3, rayLen * 2);

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
  ctx.fillRect(-rayLen * 0.65, -1, rayLen * 1.3, 2);
  ctx.fillRect(-1, -rayLen * 0.65, 2, rayLen * 1.3);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ringRadius = (progress * (width * 0.42)) % (width * 0.42);
  const ringAlpha = (1 - ringRadius / (width * 0.42)) * 0.45;
  ctx.strokeStyle = `rgba(76, 249, 251, ${ringAlpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
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
  console.log('🚀 Processing AI-Generated Crystal Gem Sprite Sheets...');

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

      // Extract and clean individual gem cell from the AI sheet
      const gemCanvas = extractAndCleanCell(sheetImg, row, col);

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
        console.log(`  ✨ [${rank.toUpperCase()}] ID #${id} -> PNG & GIF (${pngFilename})`);
      } else {
        console.log(`  ✅ [${rank.toUpperCase()}] ID #${id} -> PNG (${pngFilename})`);
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
      const gemCanvas = extractAndCleanCell(sheetImg, row, col);

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
