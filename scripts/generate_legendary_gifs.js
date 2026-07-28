const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LEGENDARY_DIR = path.join(__dirname, '..', 'assets', 'ranks', 'legendary');
const GIF_DIR = path.join(LEGENDARY_DIR, 'gif');
const PNG_DIR = path.join(LEGENDARY_DIR, 'png_transparent');

[LEGENDARY_DIR, GIF_DIR, PNG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const CANVAS_SIZE = 512; // High definition emoji size

/**
 * Draw 4-pointed Sparkle Star (✨)
 */
function drawSparkleStar(ctx, cx, cy, size, alpha = 1, color = '#ffffff') {
  if (size <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, alpha));

  const s = Math.max(2, size);
  
  // Outer soft glow aura
  const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 3);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  radGrad.addColorStop(0.3, 'rgba(216, 180, 254, 0.6)'); // Light purple aura
  radGrad.addColorStop(1, 'rgba(216, 180, 254, 0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 3, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal primary ray
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 2.5, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Vertical primary ray
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.4, s * 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright white core center
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Remove Dark Background from standard image & return transparent ImageData
 */
function processTransparentImage(ctx, img, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Dark background pixels removal
    if (r < 24 && g < 22 && b < 32) {
      data[i + 3] = 0; // Fully transparent
    } else if (r < 45 && g < 40 && b < 55 && luminance < 32) {
      // Soft alpha edge feathering
      const factor = Math.max(0, (luminance - 15) / 17);
      data[i + 3] = Math.floor(data[i + 3] * factor);
    }
  }

  return imgData;
}

/**
 * Apply Legendary Sparkling & Light Sweep Animation
 */
function applyLegendarySparkles(ctx, key, progress, width, height) {
  // 1. Light Sheen Sweep across crystal body
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const sheenPos = -100 + progress * (width + 200);

  const grad = ctx.createLinearGradient(sheenPos - 60, sheenPos - 60, sheenPos + 60, sheenPos + 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(235, 210, 255, 0.45)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Define sparkle anchor points for each animal key
  const sparkleConfigs = {
    shark: [
      { x: 0.28, y: 0.35, phase: 0.0, size: 9 },  // Head / Snout
      { x: 0.53, y: 0.22, phase: 0.25, size: 11 }, // Top Dorsal Fin
      { x: 0.77, y: 0.38, phase: 0.5, size: 10 },  // Tail Top
      { x: 0.52, y: 0.58, phase: 0.75, size: 8 },  // Pectoral Fin
      { x: 0.56, y: 0.81, phase: 0.4, size: 9 },   // Tail Bottom
    ],
    snake: [
      { x: 0.78, y: 0.27, phase: 0.0, size: 11 },  // Head Top
      { x: 0.20, y: 0.28, phase: 0.2, size: 9 },   // Left Bend
      { x: 0.50, y: 0.28, phase: 0.4, size: 10 },  // Center Bend
      { x: 0.22, y: 0.73, phase: 0.6, size: 9 },   // Left Loop
      { x: 0.57, y: 0.68, phase: 0.8, size: 8 },   // Right Loop
    ],
    eagle: [
      { x: 0.26, y: 0.49, phase: 0.0, size: 12 },  // Beak / Eye
      { x: 0.33, y: 0.26, phase: 0.2, size: 10 },  // Left Wing Apex
      { x: 0.58, y: 0.39, phase: 0.4, size: 11 },  // Chest Glow
      { x: 0.60, y: 0.25, phase: 0.6, size: 10 },  // Right Wing Apex
      { x: 0.49, y: 0.76, phase: 0.8, size: 9 },   // Talons
    ],
    saber_tiger_badge: [
      { x: 0.25, y: 0.71, phase: 0.0, size: 12 },  // Left Saber Tooth
      { x: 0.38, y: 0.75, phase: 0.25, size: 12 }, // Right Saber Tooth
      { x: 0.24, y: 0.22, phase: 0.5, size: 11 },  // Ear Top Left
      { x: 0.54, y: 0.20, phase: 0.75, size: 10 }, // Ear Top Right
      { x: 0.45, y: 0.34, phase: 0.33, size: 9 },  // Eye Glow
    ],
    saber_tiger_fullbody: [
      { x: 0.89, y: 0.49, phase: 0.0, size: 12 },  // Saber Teeth
      { x: 0.57, y: 0.26, phase: 0.25, size: 11 }, // Shoulder Apex
      { x: 0.27, y: 0.41, phase: 0.5, size: 10 },  // Hip Peak
      { x: 0.35, y: 0.16, phase: 0.75, size: 9 },  // Tail Tip
      { x: 0.64, y: 0.82, phase: 0.35, size: 8 },  // Front Claws
    ],
    mammoth: [
      { x: 0.14, y: 0.45, phase: 0.0, size: 12 },  // Left Tusk Tip
      { x: 0.32, y: 0.52, phase: 0.25, size: 11 }, // Right Tusk Tip
      { x: 0.48, y: 0.18, phase: 0.5, size: 10 },  // Head Top Hair
      { x: 0.68, y: 0.36, phase: 0.75, size: 11 }, // Back Peak
      { x: 0.82, y: 0.50, phase: 0.35, size: 9 },  // Tail / Rear
    ]
  };

  const sparkles = sparkleConfigs[key] || [];

  sparkles.forEach(p => {
    const cycle = (progress + p.phase) % 1;
    // Pulsing star animation
    const alpha = Math.sin(cycle * Math.PI);
    const size = p.size * (0.4 + Math.sin(cycle * Math.PI) * 0.8);
    drawSparkleStar(ctx, p.x * width, p.y * height, size, alpha, '#ffffff');
  });
}

/**
 * Generate Animated GIF from PNG file with transparent background
 */
async function generateLegendaryGIF(key, fileName, totalFrames = 16, fps = 15) {
  const inputPngPath = path.join(LEGENDARY_DIR, fileName);
  if (!fs.existsSync(inputPngPath)) {
    console.error(`❌ File not found: ${inputPngPath}`);
    return;
  }

  console.log(`🎬 Processing ${key} (${fileName}) into transparent GIF...`);
  const img = await loadImage(inputPngPath);
  
  const width = CANVAS_SIZE;
  const height = CANVAS_SIZE;
  const outputFile = path.join(GIF_DIR, `${key}.gif`);

  // FFmpeg process for high quality transparent GIF
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'bgra',
    '-s', `${width}x${height}`,
    '-r', `${fps}`,
    '-i', '-',
    '-vf', 'split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=1[p];[s1][p]paletteuse=alpha_threshold=128',
    '-loop', '0',
    outputFile
  ]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  // Process clean transparent base image
  const baseImgData = processTransparentImage(ctx, img, width, height);

  // Also save clean transparent PNG
  const transparentPngPath = path.join(PNG_DIR, `${key}.png`);
  fs.writeFileSync(transparentPngPath, canvas.toBuffer('image/png'));

  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    ctx.clearRect(0, 0, width, height);
    
    // Put clean transparent animal image
    ctx.putImageData(baseImgData, 0, 0);

    // Apply sparkling animation overlay
    applyLegendarySparkles(ctx, key, progress, width, height);

    const buffer = canvas.toBuffer('raw');
    ffmpeg.stdin.write(buffer);
  }

  ffmpeg.stdin.end();

  return new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✨ Generated Transparent GIF: assets/ranks/legendary/gif/${key}.gif`);
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code} for ${key}`));
      }
    });
  });
}

async function main() {
  console.log('🚀 Generating Sparkling Transparent Animated GIFs for Legendary Emojis...');

  const items = [
    { key: 'shark', file: 'legendary_shark.png' },
    { key: 'snake', file: 'legendary_snake.png' },
    { key: 'eagle', file: 'legendary_eagle_fullbody.png' },
    { key: 'saber_tiger_badge', file: 'legendary_saber_tiger_badge.png' },
    { key: 'saber_tiger_fullbody', file: 'legendary_saber_tiger_fullbody.png' },
    { key: 'mammoth', file: 'legendary_mammoth.png' }
  ];

  for (const item of items) {
    await generateLegendaryGIF(item.key, item.file);
  }

  console.log('\n🎉 ALL DONE! All 6 Legendary GIFs created successfully with transparent backgrounds.');
}

main().catch(console.error);
