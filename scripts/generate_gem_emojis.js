/**
 * CokeBot OwO-Style Gem Emojis Generator
 * Generates simple, clean geometric vector gems matching OwO Bot with exact CokeBot rank colors
 * and animated GIFs for special ranks (Generation, Legendary, Mythic, Ancient, Divine, Secret).
 *
 * CokeBot Rank Palette Mapping:
 * - Common (C): Silver / White (#c4c2c7 / #f1f0f2)
 * - Rare (R): Bright Golden Yellow (#fdef2e / #fffa81)
 * - Epic (E): Electric Sky Blue (#5bcafd / #92e5ff)
 * - Generation (G): Ice-Mint Cyan (#4ce1f9 / #d5fcfd)
 * - Legendary (L): Royal Orchid Purple (#c487fa / #e9c3ff)
 * - Mythic (M): Hot Magenta / Neon Pink (#f65fc3 / #fd96e4)
 * - Ancient (A): Flame Orange / Amber Fire (#fb8c2e / #ffb66e)
 * - Divine (D): Celestial Turquoise Teal (#4cf9fb / #a4feff)
 * - Secret (S): Obsidian Dark Void / Carbon Silver (#18181a / #b9b9b9)
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CANVAS_SIZE = 128;
const BASE_OWO_DIR = 'C:/Users/khang/.gemini/antigravity/brain/e1573dd0-adcd-4dc8-99fb-f3fe38332066/scratch/owo_gems';
const OUT_DIR = path.join(__dirname, '..', 'assets', 'emojis', 'gems');
const ARTIFACT_DIR = 'C:/Users/khang/.gemini/antigravity/brain/e1573dd0-adcd-4dc8-99fb-f3fe38332066/gems_emojis';

[OUT_DIR, ARTIFACT_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

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
 * Exact 5-Point Color Ramps matching CokeBot Rank Badges
 */
const RANK_RAMPS = {
  common: {
    border: [16, 16, 18],
    shadow: [60, 60, 65],
    mid: [120, 120, 128],
    light: [196, 194, 199],
    hi: [255, 255, 255]
  },
  uncommon: {
    border: [0, 51, 0],
    shadow: [27, 94, 32],
    mid: [56, 142, 60],
    light: [129, 199, 132],
    hi: [220, 245, 220]
  },
  rare: { // R = Bright Yellow / Gold (Rank R in CokeBot)
    border: [35, 25, 0],
    shadow: [120, 85, 5],
    mid: [200, 160, 15],
    light: [253, 239, 46],
    hi: [255, 252, 180]
  },
  epic: { // E = Electric Sky Blue (Rank E in CokeBot)
    border: [4, 17, 46],
    shadow: [15, 50, 100],
    mid: [35, 120, 200],
    light: [91, 202, 253],
    hi: [200, 245, 255]
  },
  generation: { // G = Ice-Mint Cyan (Rank G in CokeBot)
    border: [6, 34, 52],
    shadow: [10, 65, 95],
    mid: [25, 145, 185],
    light: [76, 225, 249],
    hi: [220, 254, 254]
  },
  legendary: { // L = Royal Purple / Violet (Rank L in CokeBot)
    border: [22, 10, 40],
    shadow: [70, 25, 110],
    mid: [135, 55, 195],
    light: [196, 135, 250],
    hi: [245, 225, 255]
  },
  mythic: { // M = Hot Magenta / Neon Pink (Rank M in CokeBot)
    border: [33, 2, 19],
    shadow: [95, 12, 60],
    mid: [180, 35, 125],
    light: [246, 95, 195],
    hi: [255, 210, 245]
  },
  ancient: { // A = Fiery Flame Orange (Rank A in CokeBot)
    border: [30, 7, 0],
    shadow: [100, 35, 5],
    mid: [190, 75, 12],
    light: [251, 140, 46],
    hi: [255, 220, 160]
  },
  divine: { // D = Celestial Turquoise Teal (Rank D in CokeBot)
    border: [3, 31, 32],
    shadow: [10, 75, 75],
    mid: [25, 165, 165],
    light: [76, 249, 251],
    hi: [215, 255, 255]
  },
  secret: { // S = Obsidian Dark Void / Carbon Silver (Rank S in CokeBot)
    border: [8, 8, 8],
    shadow: [24, 24, 26],
    mid: [55, 55, 60],
    light: [120, 120, 125],
    hi: [220, 220, 225]
  }
};

/**
 * High-fidelity 4-segment color ramp mapping greyscale OwO gem pixels to rank palette
 */
function recolorCanvasImage(img, ramp) {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const data = imgData.data;

  const { border, shadow, mid, light, hi } = ramp;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const lum = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
    let r, g, b;

    if (lum < 0.45) {
      const t = lum / 0.45;
      r = (1 - t) * border[0] + t * shadow[0];
      g = (1 - t) * border[1] + t * shadow[1];
      b = (1 - t) * border[2] + t * shadow[2];
    } else if (lum < 0.68) {
      const t = (lum - 0.45) / 0.23;
      r = (1 - t) * shadow[0] + t * mid[0];
      g = (1 - t) * shadow[1] + t * mid[1];
      b = (1 - t) * shadow[2] + t * mid[2];
    } else if (lum < 0.88) {
      const t = (lum - 0.68) / 0.20;
      r = (1 - t) * mid[0] + t * light[0];
      g = (1 - t) * mid[1] + t * light[1];
      b = (1 - t) * mid[2] + t * light[2];
    } else {
      const t = (lum - 0.88) / 0.12;
      r = (1 - t) * light[0] + t * hi[0];
      g = (1 - t) * light[1] + t * hi[1];
      b = (1 - t) * light[2] + t * hi[2];
    }

    data[i] = Math.round(Math.min(255, Math.max(0, r)));
    data[i + 1] = Math.round(Math.min(255, Math.max(0, g)));
    data[i + 2] = Math.round(Math.min(255, Math.max(0, b)));
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * ❄️ GENERATION EFFECT (Tier G - Ice-Mint Cyan Cyber Sweep)
 */
function applyGenerationEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  // Sheen sweep
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

  // Floating frost motes
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
 * 👑 LEGENDARY EFFECT (Tier L - Royal Purple Arcane Sheen & Violet Stardust)
 */
function applyLegendaryEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  // Royal Purple Sheen Sweep
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

  // Violet arcane dust
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
 * 🌸 MYTHIC EFFECT (Tier M - Hot Magenta Sheen & Pink Diamond Dust)
 */
function applyMythicEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  // Magenta Sheen Sweep
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

  // Pink diamond sparkles
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
 * 🔥 ANCIENT EFFECT (Tier A - Flame Orange Energy Surge & Embers)
 */
function applyAncientEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  // Energy surge rising
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

  // Rising embers
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
 * 💎 DIVINE EFFECT (Tier D - Celestial Turquoise Rotating Ray Cross & Halo)
 */
function applyDivineEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;
  const cx = width * 0.5, cy = height * 0.5;

  // Rotating holy ray cross in celestial turquoise
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

  // Diagonal rays
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
  ctx.fillRect(-rayLen * 0.65, -1, rayLen * 1.3, 2);
  ctx.fillRect(-1, -rayLen * 0.65, 2, rayLen * 1.3);
  ctx.restore();

  // Expanding halo ring
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

  // Turquoise sheen sweep
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

  // Corner sparkles
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
 * 🌌 SECRET EFFECT (Tier S - Obsidian Dark Void Silver Sheen & Floating Stardust)
 */
function applySecretEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  // Dark obsidian silver sheen sweep
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

  // Floating void dust sparkles
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

const GEM_SPECS = [
  {
    type: 'hunting',
    shapeName: 'Hunting Gem',
    prefix: 'Generic Hunting Gem.png',
    ids: { common: '51', rare: '53', epic: '54', generation: '58', legendary: '56', mythic: '55', ancient: '57', divine: '59', secret: '60' }
  },
  {
    type: 'empowering',
    shapeName: 'Empowering Gem',
    prefix: 'Generic Empowering Gem.png',
    ids: { common: '65', rare: '67', epic: '68', generation: '85', legendary: '70', mythic: '69', ancient: '71', divine: '87', secret: '89' }
  },
  {
    type: 'lucky',
    shapeName: 'Lucky Gem',
    prefix: 'Generic Lucky Gem.png',
    ids: { common: '72', rare: '74', epic: '75', generation: '86', legendary: '77', mythic: '76', ancient: '78', divine: '88', secret: '90' }
  },
  {
    type: 'special',
    shapeName: 'Special Gem (Triangle)',
    prefix: 'Generic Special Gem.png',
    ids: { common: '79', rare: '81', epic: '82', generation: '91', legendary: '84', mythic: '83', ancient: '92', divine: '93', secret: '94' }
  }
];

const RANKS = ['common', 'rare', 'epic', 'generation', 'legendary', 'mythic', 'ancient', 'divine', 'secret'];

async function main() {
  console.log('🚀 Generating OwO-style gem emojis adhering strictly to CokeBot Rank Colors...');

  let pngCount = 0;
  let gifCount = 0;

  for (const spec of GEM_SPECS) {
    const t = spec.type;
    console.log(`\n💎 Processing Gem Type: ${spec.shapeName} (${t})`);

    const genericImg = await loadImage(path.join(BASE_OWO_DIR, spec.prefix));

    for (const rank of RANKS) {
      const id = spec.ids[rank];
      const ramp = RANK_RAMPS[rank];
      if (!id || !ramp) continue;

      // 1. Recolor greyscale OwO gem using CokeBot rank color ramp
      const recoloredCanvas = recolorCanvasImage(genericImg, ramp);

      const pngFilename = `gem_${id}_${t}_${rank}.png`;
      const outPng = path.join(OUT_DIR, pngFilename);
      const artPng = path.join(ARTIFACT_DIR, pngFilename);

      const pngBuffer = recoloredCanvas.toBuffer('image/png');
      fs.writeFileSync(outPng, pngBuffer);
      fs.writeFileSync(artPng, pngBuffer);
      pngCount++;

      // 2. Animated GIF if rank has animation effect
      const animFn = ANIMATION_EFFECTS[rank];
      if (animFn) {
        const gifFilename = `gem_${id}_${t}_${rank}.gif`;
        const outGif = path.join(OUT_DIR, gifFilename);
        const artGif = path.join(ARTIFACT_DIR, gifFilename);

        await generateGif(recoloredCanvas, animFn, outGif, 16, 15);
        fs.copyFileSync(outGif, artGif);
        gifCount++;
        console.log(`  ✨ [${rank.toUpperCase()}] ID #${id} -> PNG & GIF (${pngFilename})`);
      } else {
        console.log(`  ✅ [${rank.toUpperCase()}] ID #${id} -> PNG (${pngFilename})`);
      }
    }
  }

  // 3. Generate Complete Showcase Matrix Image
  console.log('\n📊 Generating Complete Showcase Matrix Image (gem_showcase_all.png)...');
  const typeHeaders = ['Hunting Gem 💎', 'Empowering Gem 🔮', 'Lucky Gem 💖', 'Special Gem 🔺'];

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
    const ramp = RANK_RAMPS[rank];

    if (rIdx % 2 === 1) {
      showCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      showCtx.fillRect(0, yRow, matrixW, CELL_H);
    }

    // Rank label in rank's bright highlight color
    showCtx.font = 'bold 16px sans-serif';
    showCtx.textAlign = 'right';
    const [r, g, b] = ramp.light;
    showCtx.fillStyle = `rgb(${r},${g},${b})`;
    showCtx.fillText(rank.toUpperCase(), LABEL_W - 20, yRow + CELL_H / 2);

    for (let cIdx = 0; cIdx < GEM_SPECS.length; cIdx++) {
      const spec = GEM_SPECS[cIdx];
      const genericImg = await loadImage(path.join(BASE_OWO_DIR, spec.prefix));
      const gemCanvas = recolorCanvasImage(genericImg, ramp);
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
