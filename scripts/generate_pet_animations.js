const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE_DIR = path.join(__dirname, '..', 'assets', 'pets');
const PNG_DIR = path.join(BASE_DIR, 'png');
const GIF_DIR = path.join(BASE_DIR, 'gif');
const SPRITE_DIR = path.join(BASE_DIR, 'spritesheets');

[BASE_DIR, PNG_DIR, GIF_DIR, SPRITE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const FRAME_SIZE = 280;
const TOTAL_FRAMES = 16;
const FPS = 15;

const PET_BOUNDS = [
  { id: 1, name: 'pet_1', minX: 60, maxX: 512, minY: 290, maxY: 720 },
  { id: 2, name: 'pet_2', minX: 512, maxX: 1010, minY: 310, maxY: 720 },
  { id: 3, name: 'pet_3', minX: 1040, maxX: 1510, minY: 280, maxY: 720 }
];

/**
 * Floodfill Background Removal
 * Preserves 100% of internal dark pixels (eyes, mouth, shading, outlines)
 */
async function extractPetWithFloodfill(srcImg, bounds) {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(srcImg, bounds.minX, bounds.minY, w, h, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Floodfill background mask starting from outer border
  const bgMask = new Uint8Array(w * h);
  const queue = [];

  // Add outer perimeter pixels to queue
  for (let x = 0; x < w; x++) { queue.push(x); queue.push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { queue.push(y * w); queue.push(y * w + (w - 1)); }

  while (queue.length > 0) {
    const idx = queue.pop();
    if (bgMask[idx]) continue;

    const p = idx * 4;
    const r = d[p], g = d[p + 1], b = d[p + 2];

    // Background threshold: black/near-black background
    if (r < 32 && g < 32 && b < 32) {
      bgMask[idx] = 1;
      const x = idx % w;
      const y = Math.floor(idx / w);
      if (x > 0 && !bgMask[idx - 1]) queue.push(idx - 1);
      if (x < w - 1 && !bgMask[idx + 1]) queue.push(idx + 1);
      if (y > 0 && !bgMask[idx - w]) queue.push(idx - w);
      if (y < h - 1 && !bgMask[idx + w]) queue.push(idx + w);
    }
  }

  // Clear alpha ONLY for confirmed connected background pixels
  for (let i = 0; i < w * h; i++) {
    if (bgMask[i]) {
      d[i * 4 + 3] = 0; // Transparent
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// -------------------------------------------------------------
// 2D ORGANIC SLICE MESH DEFORMATION ENGINE
// -------------------------------------------------------------

/**
 * Draws pet sprite with organic slice deformation (squash, stretch, sway, curve)
 */
function drawDeformedPetMesh(ctx, petImg, destX, destY, destW, destH, animState, progress) {
  const numSlices = 24;
  const sliceH = petImg.height / numSlices;
  const cycle = Math.sin(progress * Math.PI * 2);
  const cycle2 = Math.cos(progress * Math.PI * 2);

  ctx.save();
  ctx.translate(destX, destY);

  for (let i = 0; i < numSlices; i++) {
    const v = i / numSlices; // 0 = head, 1 = feet
    const srcY = i * sliceH;

    let offsetX = 0;
    let offsetY = 0;
    let scaleX = 1;
    let scaleY = 1;

    switch (animState) {
      case 'idle': {
        // Organic breathing & gentle head/body sway
        offsetX = Math.sin(progress * Math.PI * 2 + v * Math.PI * 0.8) * (8 * (1 - v));
        scaleX = 1 + Math.sin(progress * Math.PI * 2) * (0.04 * (1 - v));
        scaleY = 1 - Math.sin(progress * Math.PI * 2) * (0.03 * (1 - v));
        offsetY = Math.sin(progress * Math.PI * 2) * 5;
        break;
      }

      case 'angry': {
        // Stomping vibration & angry body hunching forward
        const stomp = Math.abs(Math.sin(progress * Math.PI * 4));
        offsetX = Math.sin(progress * Math.PI * 8) * (4 * (1 - v * 0.5));
        offsetY = -stomp * 8 + (1 - v) * 5;
        scaleX = 1 + stomp * 0.05;
        scaleY = 1 - stomp * 0.05;
        break;
      }

      case 'happy': {
        // Energetic Bouncing Jump & Body Squash/Stretch
        const jumpPhase = Math.sin(progress * Math.PI);
        const jumpY = -Math.abs(jumpPhase) * 35;
        const stretch = jumpY < -15 ? 0.12 : -0.08;
        scaleX = 1 - stretch;
        scaleY = 1 + stretch;
        offsetX = Math.sin(progress * Math.PI * 4) * (6 * (1 - v));
        offsetY = jumpY;
        break;
      }

      case 'ecstatic': {
        // Playful S-Curve Body Wiggle (Vuốt ve / Cho ăn)
        offsetX = Math.sin(progress * Math.PI * 4 + v * Math.PI * 1.5) * 12;
        scaleX = 1 + Math.sin(progress * Math.PI * 2) * 0.06;
        scaleY = 1 - Math.sin(progress * Math.PI * 2) * 0.06;
        offsetY = Math.sin(progress * Math.PI * 2) * 4;
        break;
      }
    }

    const drawSliceW = destW * scaleX;
    const drawSliceH = (destH / numSlices) * scaleY;
    const drawSliceX = -drawSliceW / 2 + offsetX;
    const drawSliceY = -destH + i * (destH / numSlices) + offsetY;

    ctx.drawImage(
      petImg,
      0, srcY, petImg.width, sliceH,
      drawSliceX, drawSliceY, drawSliceW, drawSliceH + 1
    );
  }

  ctx.restore();
}

// -------------------------------------------------------------
// DYNAMIC FACIAL EXPRESSIONS & EMOTION PARTICLES
// -------------------------------------------------------------

function drawHeart(ctx, x, y, size, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff3366';
  ctx.beginPath();
  const topH = size * 0.3;
  ctx.moveTo(x, y + topH);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topH);
  ctx.bezierCurveTo(x - size / 2, y + (size + topH) / 2, x, y + size, x, y + size);
  ctx.bezierCurveTo(x, y + size, x + size / 2, y + (size + topH) / 2, x + size / 2, y + topH);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - size * 0.18, y + size * 0.25, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMusicNote(ctx, x, y, size, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x, y - size, size * 0.2, size);
  ctx.fillRect(x, y - size, size * 0.6, size * 0.25);
  ctx.restore();
}

function drawStar(ctx, cx, cy, size, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff066';
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAngerSteam(ctx, x, y, size, progress, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff3300';
  ctx.beginPath();
  ctx.arc(x + Math.sin(progress * Math.PI * 4) * 4, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(x + Math.sin(progress * Math.PI * 4) * 4, y + 2, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Renders Facial Expression Morphing on top of Pet Face
 */
function drawFacialExpression(ctx, centerX, centerY, animState, progress, frameIdx) {
  const headY = centerY - 130;

  switch (animState) {
    case 'idle': {
      // Periodic eyelid blink (frame 7-8)
      if (frameIdx === 7 || frameIdx === 8) {
        ctx.save();
        ctx.fillStyle = '#2b1d14'; // Eyelid curve
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2b1d14';

        // Left eye blink arc
        ctx.beginPath();
        ctx.arc(centerX - 35, headY, 14, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();

        // Right eye blink arc
        ctx.beginPath();
        ctx.arc(centerX + 35, headY, 14, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'angry': {
      // Red Angry Aura Glow
      ctx.save();
      const auraAlpha = 0.2 + Math.sin(progress * Math.PI * 4) * 0.15;
      ctx.fillStyle = `rgba(255, 0, 0, ${auraAlpha})`;
      ctx.beginPath();
      ctx.arc(centerX, headY + 20, 95, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Angry Eyebrows (\ /)
      ctx.strokeStyle = '#330000';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(centerX - 55, headY - 25);
      ctx.lineTo(centerX - 15, headY - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX + 55, headY - 25);
      ctx.lineTo(centerX + 15, headY - 10);
      ctx.stroke();

      // Frowning / Roaring Open Mouth
      ctx.fillStyle = '#660000';
      ctx.beginPath();
      ctx.arc(centerX, headY + 28, 16, Math.PI * 1.1, Math.PI * 1.9, true);
      ctx.closePath();
      ctx.fill();

      // Anger Vein Symbol (💢)
      ctx.strokeStyle = '#ff0033';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX + 45, headY - 40, 9, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();

      // Rising Fire / Steam
      for (let i = 0; i < 3; i++) {
        const pT = (progress + i * 0.33) % 1;
        const pX = centerX - 35 + i * 35;
        const pY = headY - 45 - pT * 30;
        drawAngerSteam(ctx, pX, pY, 7 + pT * 5, pT, 1 - pT);
      }
      break;
    }

    case 'happy': {
      // Cheerful Eyes (^ ^)
      ctx.save();
      ctx.strokeStyle = '#2b1d14';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';

      // Left eye (^ arc)
      ctx.beginPath();
      ctx.arc(centerX - 35, headY + 5, 15, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Right eye (^ arc)
      ctx.beginPath();
      ctx.arc(centerX + 35, headY + 5, 15, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Big Open Happy Smile (D)
      ctx.fillStyle = '#cc0044';
      ctx.beginPath();
      ctx.arc(centerX, headY + 22, 16, 0, Math.PI);
      ctx.fill();

      // Pink Tongue
      ctx.fillStyle = '#ff6699';
      ctx.beginPath();
      ctx.arc(centerX, headY + 28, 9, 0, Math.PI);
      ctx.fill();

      // Rosy Blushing Cheeks
      ctx.fillStyle = 'rgba(255, 102, 153, 0.5)';
      ctx.beginPath();
      ctx.ellipse(centerX - 55, headY + 15, 14, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + 55, headY + 15, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Music Notes & Stars Floating
      const note1T = (progress) % 1;
      drawMusicNote(ctx, centerX - 55, headY - 40 - note1T * 35, 14, 1 - note1T);

      const star1T = (progress + 0.5) % 1;
      drawStar(ctx, centerX + 55, headY - 35 - star1T * 30, 8, 1 - star1T);
      break;
    }

    case 'ecstatic': {
      // Blissful Closed Eyes (> < or u u)
      ctx.save();
      ctx.strokeStyle = '#2b1d14';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';

      // Left eye (> arc)
      ctx.beginPath();
      ctx.arc(centerX - 35, headY + 8, 14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Right eye (< arc)
      ctx.beginPath();
      ctx.arc(centerX + 35, headY + 8, 14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Contented Sweet Smile (w)
      ctx.beginPath();
      ctx.arc(centerX - 10, headY + 22, 10, 0, Math.PI * 0.85);
      ctx.arc(centerX + 10, headY + 22, 10, Math.PI * 0.15, Math.PI);
      ctx.stroke();

      // Deep Blushing Cheeks (😊)
      ctx.fillStyle = 'rgba(255, 77, 148, 0.65)';
      ctx.beginPath();
      ctx.ellipse(centerX - 52, headY + 16, 16, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + 52, headY + 16, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Hearts Floating 💕 (Cho ăn / Vuốt ve)
      const heartPositions = [
        { offsetX: -45, phase: 0.0, size: 16 },
        { offsetX: 45, phase: 0.33, size: 20 },
        { offsetX: 0, phase: 0.66, size: 24 }
      ];

      heartPositions.forEach(h => {
        const t = (progress + h.phase) % 1;
        const hX = centerX + h.offsetX + Math.sin(t * Math.PI * 2) * 12;
        const hY = headY - 50 - t * 45;
        drawHeart(ctx, hX, hY, h.size, 1 - t);
      });
      break;
    }
  }
}

/**
 * Render single animation frame
 */
function renderPetAnimationFrame(petImg, animState, frameIdx, totalFrames) {
  const canvas = createCanvas(FRAME_SIZE, FRAME_SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  const progress = frameIdx / totalFrames;
  const centerX = FRAME_SIZE / 2;
  const centerY = FRAME_SIZE / 2 + 35;

  const destW = petImg.width * 0.45;
  const destH = petImg.height * 0.45;

  // 1. Draw Deformed Body Mesh
  drawDeformedPetMesh(ctx, petImg, centerX, centerY, destW, destH, animState, progress);

  // 2. Draw Dynamic Facial Expressions & Emotion Particles
  drawFacialExpression(ctx, centerX, centerY, animState, progress, frameIdx);

  return canvas;
}

/**
 * Export GIF using FFmpeg
 */
async function generatePetGIF(petName, animState, frames) {
  const outputFile = path.join(GIF_DIR, `${petName}_${animState}.gif`);
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'bgra',
    '-s', `${FRAME_SIZE}x${FRAME_SIZE}`,
    '-r', `${FPS}`,
    '-i', '-',
    '-vf', 'split[s0][s1];[s0]palettegen=max_colors=128:reserve_transparent=1[p];[s1][p]paletteuse=alpha_threshold=128',
    '-loop', '0',
    outputFile
  ]);

  frames.forEach(frameCanvas => {
    const buffer = frameCanvas.toBuffer('raw');
    ffmpeg.stdin.write(buffer);
  });

  ffmpeg.stdin.end();

  return new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✨ Generated GIF: assets/pets/gif/${petName}_${animState}.gif`);
        resolve();
      } else {
        reject(new Error(`FFmpeg error on ${petName}_${animState} code ${code}`));
      }
    });
  });
}

/**
 * Main Pipeline
 */
async function main() {
  console.log('🚀 Extracting pets via Floodfill & Rendering 2D Mesh Animations...');
  const srcImg = await loadImage(path.join(__dirname, '..', 'assets', 'pet.png'));

  const animStates = ['idle', 'angry', 'happy', 'ecstatic'];

  for (const petBounds of PET_BOUNDS) {
    console.log(`\n🐾 Processing ${petBounds.name}...`);
    // Extract pet with Floodfill -> 100% complete body & face without missing parts
    const petImgCanvas = await extractPetWithFloodfill(srcImg, petBounds);

    // Save PNG
    const pngPath = path.join(PNG_DIR, `${petBounds.name}.png`);
    fs.writeFileSync(pngPath, petImgCanvas.toBuffer('image/png'));
    console.log(`  ✅ Extracted Clean PNG: assets/pets/png/${petBounds.name}.png`);

    const petAllAnimFrames = {};

    for (const state of animStates) {
      const stateFrames = [];
      for (let f = 0; f < TOTAL_FRAMES; f++) {
        const frameCanvas = renderPetAnimationFrame(petImgCanvas, state, f, TOTAL_FRAMES);
        stateFrames.push(frameCanvas);
      }
      petAllAnimFrames[state] = stateFrames;

      // Export State Sprite Sheet (1 row x 16 cols)
      const stateSpriteWidth = FRAME_SIZE * TOTAL_FRAMES;
      const stateSpriteCanvas = createCanvas(stateSpriteWidth, FRAME_SIZE);
      const sCtx = stateSpriteCanvas.getContext('2d');

      stateFrames.forEach((fc, idx) => {
        sCtx.drawImage(fc, idx * FRAME_SIZE, 0);
      });

      const stateSpritePath = path.join(SPRITE_DIR, `${petBounds.name}_${state}.png`);
      fs.writeFileSync(stateSpritePath, stateSpriteCanvas.toBuffer('image/png'));
      console.log(`  ✅ Generated Sprite Sheet: assets/pets/spritesheets/${petBounds.name}_${state}.png`);

      // Export GIF
      await generatePetGIF(petBounds.name, state, stateFrames);
    }

    // Export Master Sprite Sheet (4 rows x 16 cols)
    const masterSpriteWidth = FRAME_SIZE * TOTAL_FRAMES;
    const masterSpriteHeight = FRAME_SIZE * animStates.length;
    const masterCanvas = createCanvas(masterSpriteWidth, masterSpriteHeight);
    const mCtx = masterCanvas.getContext('2d');

    animStates.forEach((state, rIdx) => {
      const frames = petAllAnimFrames[state];
      frames.forEach((fc, cIdx) => {
        mCtx.drawImage(fc, cIdx * FRAME_SIZE, rIdx * FRAME_SIZE);
      });
    });

    const masterSpritePath = path.join(SPRITE_DIR, `${petBounds.name}_all_animations.png`);
    fs.writeFileSync(masterSpritePath, masterCanvas.toBuffer('image/png'));
    console.log(`  🌟 Generated Master Sprite Sheet: assets/pets/spritesheets/${petBounds.name}_all_animations.png (${masterSpriteWidth}x${masterSpriteHeight}px)`);
  }

  console.log('\n🎉 ALL DONE! All 3 Pets extracted with 100% intact bodies and animated with 2D Deformable Mesh & Facial Expressions!');
}

main().catch(console.error);
