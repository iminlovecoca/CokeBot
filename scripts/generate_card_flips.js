const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CARDS_DIR = path.join(__dirname, '..', 'assets', 'cards');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'cards_flip');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function createFlipGif(cardName, backImg, cardImg) {
  const width = 262;
  const height = 372;
  const totalFrames = 16;
  const fps = 24;
  const outputFile = path.join(OUTPUT_DIR, `${cardName}f.gif`);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'bgra',
    '-s', `${width}x${height}`,
    '-r', `${fps}`,
    '-i', '-',
    '-vf', 'split[s0][s1];[s0]palettegen=reserve_transparent=1[p];[s1][p]paletteuse=alpha_threshold=128',
    '-loop', '-1',
    outputFile
  ]);

  for (let i = 0; i <= totalFrames; i++) {
    const progress = i / totalFrames;
    ctx.clearRect(0, 0, width, height);

    if (progress <= 0.5) {
      // First half: back card scaling down from 1 to 0 width (cosine transition for smooth 3D rotation feel)
      const scaleX = Math.cos(progress * Math.PI);
      const currentW = Math.max(1, width * scaleX);
      const x = (width - currentW) / 2;
      ctx.drawImage(backImg, x, 0, currentW, height);
    } else {
      // Second half: front card scaling up from 0 to 1 width
      const scaleX = Math.sin((progress - 0.5) * Math.PI);
      const currentW = Math.max(1, width * scaleX);
      const x = (width - currentW) / 2;
      ctx.drawImage(cardImg, x, 0, currentW, height);
    }

    const buffer = canvas.toBuffer('raw');
    ffmpeg.stdin.write(buffer);
  }

  // Hold the final frame (full card revealed)
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(cardImg, 0, 0, width, height);
  const finalBuffer = canvas.toBuffer('raw');
  for (let h = 0; h < 6; h++) {
    ffmpeg.stdin.write(finalBuffer);
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
}

async function run() {
  console.log("Loading back card image...");
  const backImg = await loadImage(path.join(CARDS_DIR, 'back.png'));
  const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.png') && f !== 'back.png');

  console.log(`Generating GIF flip animations for ${files.length} cards...`);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const cardName = path.basename(file, '.png');
    const cardImg = await loadImage(path.join(CARDS_DIR, file));
    await createFlipGif(cardName, backImg, cardImg);
    console.log(`[${i + 1}/${files.length}] Generated ${cardName}f.gif`);
  }
  console.log("\nDone! All 52 GIF card flip files generated in assets/cards_flip/");
}

run().catch(console.error);
