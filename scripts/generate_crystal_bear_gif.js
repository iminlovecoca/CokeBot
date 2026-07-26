const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const STRIP_PATH = path.join(__dirname, '..', 'assets', 'crystal_bear_idle_strip.png');
const OUTPUT_GIF_ROOT = path.join(__dirname, '..', 'assets', 'crystal_bear_idle.gif');
const OUTPUT_GIF_PETS = path.join(__dirname, '..', 'assets', 'pets', 'gif', 'crystal_bear_idle.gif');

async function createCrystalBearGIF() {
  console.log('🚀 Loading crystal_bear_idle_strip.png...');
  const img = await loadImage(STRIP_PATH);
  console.log(`Image dimensions: ${img.width}x${img.height}`);

  const totalFrames = 6;
  const frameWidth = Math.floor(img.width / totalFrames); // 256px
  const frameHeight = img.height; // 260px
  const fps = 8; // Smooth 8 FPS for idle animation

  console.log(`Frame size: ${frameWidth}x${frameHeight}, Total Frames: ${totalFrames}, FPS: ${fps}`);

  // Create FFmpeg process for animated GIF with transparent background
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'bgra',
    '-s', `${frameWidth}x${frameHeight}`,
    '-r', `${fps}`,
    '-i', '-',
    '-vf', 'split[s0][s1];[s0]palettegen=max_colors=256:reserve_transparent=1[p];[s1][p]paletteuse=alpha_threshold=128',
    '-loop', '0',
    OUTPUT_GIF_ROOT
  ]);

  const canvas = createCanvas(frameWidth, frameHeight);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  for (let i = 0; i < totalFrames; i++) {
    ctx.clearRect(0, 0, frameWidth, frameHeight);
    const srcX = i * frameWidth;
    ctx.drawImage(img, srcX, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

    const buffer = canvas.toBuffer('raw');
    ffmpeg.stdin.write(buffer);
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Generated GIF: assets/crystal_bear_idle.gif`);
        // Also copy to assets/pets/gif/ if directory exists
        const petsGifDir = path.dirname(OUTPUT_GIF_PETS);
        if (fs.existsSync(petsGifDir)) {
          fs.copyFileSync(OUTPUT_GIF_ROOT, OUTPUT_GIF_PETS);
          console.log(`✅ Copied to: assets/pets/gif/crystal_bear_idle.gif`);
        }
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });

  console.log('\n🎉 ALL DONE! Crystal Bear Animated Idle GIF successfully generated.');
}

createCrystalBearGIF().catch(console.error);
