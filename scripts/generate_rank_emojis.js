const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'ranks');
const PNG_DIR = path.join(OUTPUT_DIR, 'png');
const GIF_DIR = path.join(OUTPUT_DIR, 'gif');
const SPRITE_DIR = path.join(OUTPUT_DIR, 'spritesheets');

[OUTPUT_DIR, PNG_DIR, GIF_DIR, SPRITE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Canvas size matching the PNG images
const CANVAS_SIZE = 256;

/**
 * Draw 4-pointed Sparkle Star (✨)
 */
function drawSparkleStar(ctx, cx, cy, size, alpha = 1, color = '#ffffff') {
  if (size <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  const s = Math.max(2, Math.round(size));
  // Horizontal ray
  ctx.fillRect(cx - s * 2, cy - Math.max(1, s / 3), s * 4, Math.max(2, s * 0.66));
  // Vertical ray
  ctx.fillRect(cx - Math.max(1, s / 3), cy - s * 2, Math.max(2, s * 0.66), s * 4);

  // Bright white core center
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - Math.max(1, s / 2), cy - Math.max(1, s / 2), Math.max(2, s), Math.max(2, s));
  ctx.restore();
}

/**
 * 🌸 MYTHIC EFFECT (Tier 5 - Moderate Magic Shimmer & Pink Diamond Dust)
 */
function applyMythicEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE;
  const height = CANVAS_SIZE;

  // 1. Light Sheen Sweep (Masked to letter pixels)
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -50 + progress * (width + 100);

  const grad = ctx.createLinearGradient(sheenPos - 30, sheenPos - 30, sheenPos + 30, sheenPos + 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 204, 230, 0.45)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 2. Floating Pink Diamond Dust Particles
  const dustParticles = [
    { x: width * 0.25, yBase: height * 0.85, speed: 1.0, phase: 0.0 },
    { x: width * 0.75, yBase: height * 0.85, speed: 0.9, phase: 0.25 },
    { x: width * 0.45, yBase: height * 0.9, speed: 1.1, phase: 0.5 },
    { x: width * 0.65, yBase: height * 0.9, speed: 1.0, phase: 0.75 },
    { x: width * 0.5, yBase: height * 0.6, speed: 1.2, phase: 0.4 }
  ];

  dustParticles.forEach(p => {
    const t = (progress + p.phase) % 1;
    const currY = p.yBase - t * (height * 0.6);
    const alpha = Math.sin(t * Math.PI);
    const size = 3 + Math.sin(t * Math.PI) * 4;
    drawSparkleStar(ctx, p.x, currY, size, alpha, '#ff99dd');
  });

  // 3. Twinkling Stars on Mythic Peaks
  const peaks = [
    { x: width * 0.22, y: height * 0.2, phase: 0.1 },
    { x: width * 0.78, y: height * 0.2, phase: 0.35 },
    { x: width * 0.5, y: height * 0.55, phase: 0.7 }
  ];
  peaks.forEach(p => {
    const cycle = (progress + p.phase) % 1;
    if (cycle < 0.45) {
      const pProg = cycle / 0.45;
      const size = Math.sin(pProg * Math.PI) * 7;
      const alpha = Math.sin(pProg * Math.PI);
      drawSparkleStar(ctx, p.x, p.y, size, alpha, '#ffffff');
    }
  });
}

/**
 * 🔥 ANCIENT EFFECT (Tier 6 - High Fiery Rune Surge & Embers)
 */
function applyAncientEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE;
  const height = CANVAS_SIZE;

  // 1. Vertical Rune Energy Pulse (Surge going UP the A rune)
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const surgeY = height * 0.9 - progress * (height * 0.75);

  const grad = ctx.createLinearGradient(0, surgeY - 20, 0, surgeY + 20);
  grad.addColorStop(0, 'rgba(255, 230, 128, 0)');
  grad.addColorStop(0.5, 'rgba(255, 230, 128, 0.65)');
  grad.addColorStop(1, 'rgba(255, 230, 128, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 2. Rising Ember Sparks from Base
  const embers = [
    { x: width * 0.25, yBase: height * 0.85, drift: 12, phase: 0.0 },
    { x: width * 0.42, yBase: height * 0.88, drift: -8, phase: 0.2 },
    { x: width * 0.58, yBase: height * 0.88, drift: 8, phase: 0.4 },
    { x: width * 0.75, yBase: height * 0.85, drift: -12, phase: 0.6 },
    { x: width * 0.5, yBase: height * 0.8, drift: 0, phase: 0.8 }
  ];

  embers.forEach(e => {
    const t = (progress + e.phase) % 1;
    const currY = e.yBase - t * (height * 0.65);
    const currX = e.x + Math.sin(t * Math.PI * 2) * e.drift;
    const alpha = Math.sin(t * Math.PI);
    const color = t < 0.5 ? '#ffe600' : '#ff6600';
    drawSparkleStar(ctx, currX, currY, 4, alpha, color);
  });

  // 3. Flame Burst Flares on Peak & Base Feet
  const runeFlares = [
    { x: width * 0.5, y: height * 0.15, phase: 0.0 },
    { x: width * 0.22, y: height * 0.82, phase: 0.33 },
    { x: width * 0.78, y: height * 0.82, phase: 0.66 }
  ];
  runeFlares.forEach(rf => {
    const cycle = (progress + rf.phase) % 1;
    if (cycle < 0.45) {
      const prog = cycle / 0.45;
      const size = Math.sin(prog * Math.PI) * 9;
      const alpha = Math.sin(prog * Math.PI);
      drawSparkleStar(ctx, rf.x, rf.y, size, alpha, '#ffcc00');
    }
  });
}

/**
 * 💎 DIVINE EFFECT (Tier 7 - MAXIMUM Celestial Supernova & Diamond Cosmos)
 */
function applyDivineEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE;
  const height = CANVAS_SIZE;

  // 1. Center Star Supernova Flare & Rotating Ray Cross
  const cx = width * 0.53, cy = height * 0.52;
  const starPulse = Math.sin(progress * Math.PI * 2);
  const rayLen = 25 + starPulse * 15;
  const alpha = 0.6 + Math.sin(progress * Math.PI * 2) * 0.35;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(179, 255, 255, ${alpha})`;
  // Horizontal ray
  ctx.fillRect(cx - rayLen, cy - 3, rayLen * 2, 6);
  // Vertical ray
  ctx.fillRect(cx - 3, cy - rayLen, 6, rayLen * 2);

  // Rotating diagonal cross rays
  ctx.translate(cx, cy);
  ctx.rotate((progress * Math.PI * 2));
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
  ctx.fillRect(-rayLen * 0.7, -2, rayLen * 1.4, 4);
  ctx.fillRect(-2, -rayLen * 0.7, 4, rayLen * 1.4);
  ctx.restore();

  // 2. Expanding Celestial Halo Ring
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ringRadius = (progress * (width * 0.45)) % (width * 0.45);
  const ringAlpha = (1 - ringRadius / (width * 0.45)) * 0.5;
  ctx.strokeStyle = `rgba(0, 242, 254, ${ringAlpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Brilliant Cyan Sheen Sweep
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -50 + progress * (width + 100);
  const grad = ctx.createLinearGradient(sheenPos - 40, sheenPos - 40, sheenPos + 40, sheenPos + 40);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(179, 255, 255, 0.65)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 4. Clockwise Constellation Twinkles on Diamond Points
  const diamondPoints = [
    { x: width * 0.24, y: height * 0.22, phase: 0.0 },   // Top-Left
    { x: width * 0.68, y: height * 0.22, phase: 0.25 },  // Top-Right
    { x: width * 0.82, y: height * 0.52, phase: 0.5 },   // Right Apex
    { x: width * 0.68, y: height * 0.82, phase: 0.75 }   // Bottom-Right
  ];

  diamondPoints.forEach(dp => {
    const cycle = (progress + dp.phase) % 1;
    if (cycle < 0.45) {
      const prog = cycle / 0.45;
      const size = Math.sin(prog * Math.PI) * 11;
      const a = Math.sin(prog * Math.PI);
      drawSparkleStar(ctx, dp.x, dp.y, size, a, '#70ffff');
    }
  });
}

/**
 * Apply rank-specific animation effect
 */
function applyRankAnimation(ctx, img, rankKey, frameIndex, totalFrames = 16) {
  switch (rankKey) {
    case 'mythic':
      applyMythicEffect(ctx, img, frameIndex, totalFrames);
      break;
    case 'ancient':
      applyAncientEffect(ctx, img, frameIndex, totalFrames);
      break;
    case 'divine':
      applyDivineEffect(ctx, img, frameIndex, totalFrames);
      break;
    case 'legendary':
      applyMythicEffect(ctx, img, frameIndex, totalFrames);
      break;
  }
}

/**
 * Create Animated GIF from PNG file
 */
async function createRankGIFFromPNG(rankKey, totalFrames = 16, fps = 15) {
  const pngPath = path.join(PNG_DIR, `${rankKey}.png`);
  if (!fs.existsSync(pngPath)) {
    console.error(`❌ File not found: ${pngPath}`);
    return;
  }

  const img = await loadImage(pngPath);
  const outputFile = path.join(GIF_DIR, `${rankKey}.gif`);
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'bgra',
    '-s', `${CANVAS_SIZE}x${CANVAS_SIZE}`,
    '-r', `${fps}`,
    '-i', '-',
    '-vf', 'split[s0][s1];[s0]palettegen=max_colors=128:reserve_transparent=1[p];[s1][p]paletteuse=alpha_threshold=128',
    '-loop', '0',
    outputFile
  ]);

  for (let i = 0; i < totalFrames; i++) {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Draw loaded PNG image
    ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Overlay rank-tiered sparkling animation
    applyRankAnimation(ctx, img, rankKey, i, totalFrames);

    const buffer = canvas.toBuffer('raw');
    ffmpeg.stdin.write(buffer);
  }

  ffmpeg.stdin.end();

  return new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✨ Generated GIF from PNG: assets/ranks/gif/${rankKey}.gif`);
        resolve();
      } else {
        reject(new Error(`FFmpeg error on ${rankKey} with code ${code}`));
      }
    });
  });
}

/**
 * Generate Sprite Sheets from PNG images
 */
async function generateSpriteSheetsFromPNG(ranksToAnimate, totalFrames = 16) {
  console.log('\n🎞️  Generating Transparent Sprite Sheets from loaded PNG images...');

  for (const rankKey of ranksToAnimate) {
    const pngPath = path.join(PNG_DIR, `${rankKey}.png`);
    if (!fs.existsSync(pngPath)) continue;

    const img = await loadImage(pngPath);
    const spriteWidth = CANVAS_SIZE * totalFrames;
    const spriteHeight = CANVAS_SIZE;
    const canvas = createCanvas(spriteWidth, spriteHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, spriteWidth, spriteHeight);

    for (let i = 0; i < totalFrames; i++) {
      ctx.save();
      ctx.translate(i * CANVAS_SIZE, 0);

      const frameCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
      const fCtx = frameCanvas.getContext('2d');
      fCtx.imageSmoothingEnabled = true;
      fCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      fCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      applyRankAnimation(fCtx, img, rankKey, i, totalFrames);

      ctx.drawImage(frameCanvas, 0, 0);
      ctx.restore();
    }

    const outPath = path.join(SPRITE_DIR, `${rankKey}_spritesheet.png`);
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`  ✅ Generated Sprite Sheet: assets/ranks/spritesheets/${rankKey}_spritesheet.png (${spriteWidth}x${spriteHeight}px)`);
  }

  // Master All Ranks Sprite Sheet Grid
  const allRanks = ['common', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'divine'];
  const masterWidth = CANVAS_SIZE * totalFrames;
  const masterHeight = CANVAS_SIZE * allRanks.length;
  const masterCanvas = createCanvas(masterWidth, masterHeight);
  const mCtx = masterCanvas.getContext('2d');
  mCtx.imageSmoothingEnabled = true;
  mCtx.clearRect(0, 0, masterWidth, masterHeight);

  for (let rIdx = 0; rIdx < allRanks.length; rIdx++) {
    const rankKey = allRanks[rIdx];
    const pngPath = path.join(PNG_DIR, `${rankKey}.png`);
    if (!fs.existsSync(pngPath)) continue;
    const img = await loadImage(pngPath);

    for (let f = 0; f < totalFrames; f++) {
      mCtx.save();
      mCtx.translate(f * CANVAS_SIZE, rIdx * CANVAS_SIZE);

      const frameCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
      const fCtx = frameCanvas.getContext('2d');
      fCtx.imageSmoothingEnabled = true;
      fCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      fCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      applyRankAnimation(fCtx, img, rankKey, f, totalFrames);

      mCtx.drawImage(frameCanvas, 0, 0);
      mCtx.restore();
    }
  }

  const masterPath = path.join(SPRITE_DIR, `all_ranks_spritesheet.png`);
  fs.writeFileSync(masterPath, masterCanvas.toBuffer('image/png'));
  console.log(`  🌟 Generated Master Sprite Sheet: assets/ranks/spritesheets/all_ranks_spritesheet.png (${masterWidth}x${masterHeight}px)`);
}

async function main() {
  console.log('🚀 Generating Tiered Rank Sparkling GIFs & Sprite Sheets directly from PNG files...');
  const ranksToAnimate = ['mythic', 'ancient', 'divine'];

  console.log('\n🌟 Generating GIFs for Mythic -> Ancient -> Divine...');
  for (const rankKey of ranksToAnimate) {
    await createRankGIFFromPNG(rankKey);
  }

  await generateSpriteSheetsFromPNG(ranksToAnimate);

  console.log('\n🎉 ALL DONE! All GIF animations and Sprite Sheets created from assets/ranks/png/');
}

main().catch(console.error);
