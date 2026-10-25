/**
 * CokeBot OwO-Style Gem Emojis Generator
 * Generates simple, clean geometric vector gems matching OwO Bot with rank-based recoloring
 * and animated GIFs for special ranks (Generation, Mythic, Ancient, Divine, Secret, Legendary).
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
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  const s = Math.max(1, Math.round(size));
  ctx.fillRect(cx - s * 2, cy - Math.max(1, s / 3), s * 4, Math.max(1, s * 0.66));
  ctx.fillRect(cx - Math.max(1, s / 3), cy - s * 2, Math.max(1, s * 0.66), s * 4);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - Math.max(1, s / 2), cy - Math.max(1, s / 2), Math.max(1, s), Math.max(1, s));
  ctx.restore();
}

/**
 * Recolor greyscale image using 3-segment color ramp on Canvas
 */
function recolorCanvasImage(img, shadowRgb, midRgb, highlightRgb, specRgb = [255, 255, 255]) {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const lum = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
    let r, g, b;

    if (lum < 0.45) {
      const t = lum / 0.45;
      r = t * shadowRgb[0];
      g = t * shadowRgb[1];
      b = t * shadowRgb[2];
    } else if (lum < 0.75) {
      const t = (lum - 0.45) / 0.30;
      r = (1 - t) * shadowRgb[0] + t * midRgb[0];
      g = (1 - t) * shadowRgb[1] + t * midRgb[1];
      b = (1 - t) * shadowRgb[2] + t * midRgb[2];
    } else if (lum < 0.92) {
      const t = (lum - 0.75) / 0.17;
      r = (1 - t) * midRgb[0] + t * highlightRgb[0];
      g = (1 - t) * midRgb[1] + t * highlightRgb[1];
      b = (1 - t) * midRgb[2] + t * highlightRgb[2];
    } else {
      const t = (lum - 0.92) / 0.08;
      r = (1 - t) * highlightRgb[0] + t * specRgb[0];
      g = (1 - t) * highlightRgb[1] + t * specRgb[1];
      b = (1 - t) * highlightRgb[2] + t * specRgb[2];
    }

    data[i] = Math.round(Math.min(255, Math.max(0, r)));
    data[i + 1] = Math.round(Math.min(255, Math.max(0, g)));
    data[i + 2] = Math.round(Math.min(255, Math.max(0, b)));
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * ❄️ GENERATION EFFECT (Tier G - Mint & Ice-Cyan Cyber Sweep)
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
  grad.addColorStop(0.5, 'rgba(180, 255, 255, 0.75)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Floating frost motes
  const particles = [
    { x: width * 0.28, yBase: height * 0.82, phase: 0.0, color: '#00f2fe' },
    { x: width * 0.72, yBase: height * 0.78, phase: 0.3, color: '#4facfe' },
    { x: width * 0.50, yBase: height * 0.65, phase: 0.6, color: '#ffffff' }
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
 * 🌸 MYTHIC EFFECT (Tier M - Ruby Flame & Pink Diamond Dust)
 */
function applyMythicEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  // Sheen sweep
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

  // Ruby sparkles
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
 * 💎 DIVINE EFFECT (Tier D - Celestial Supernova & Rotating Golden Rays)
 */
function applyDivineEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;
  const cx = width * 0.5, cy = height * 0.5;

  // Rotating holy ray cross
  const starPulse = Math.sin(progress * Math.PI * 2);
  const rayLen = 16 + starPulse * 8;
  const alpha = 0.65 + Math.sin(progress * Math.PI * 2) * 0.3;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);
  ctx.rotate(progress * Math.PI * 2);
  ctx.fillStyle = `rgba(255, 240, 150, ${alpha * 0.75})`;
  ctx.fillRect(-rayLen, -1.5, rayLen * 2, 3);
  ctx.fillRect(-1.5, -rayLen, 3, rayLen * 2);

  // Diagonal rays
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.55})`;
  ctx.fillRect(-rayLen * 0.65, -1, rayLen * 1.3, 2);
  ctx.fillRect(-1, -rayLen * 0.65, 2, rayLen * 1.3);
  ctx.restore();

  // Golden sheen sweep
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

  // Corner sparkles
  const corners = [
    { x: width * 0.25, y: height * 0.25, phase: 0.0 },
    { x: width * 0.75, y: height * 0.25, phase: 0.33 },
    { x: width * 0.50, y: height * 0.82, phase: 0.66 }
  ];
  corners.forEach(p => {
    const cycle = (progress + p.phase) % 1;
    if (cycle < 0.45) {
      const prog = cycle / 0.45;
      const size = Math.sin(prog * Math.PI) * 4;
      const a = Math.sin(prog * Math.PI);
      drawSparkleStar(ctx, p.x, p.y, size, a, '#fff8b3');
    }
  });
}

/**
 * 🌌 SECRET EFFECT (Tier S - Cosmic Void Galaxy Pulse & Chromatic Prismatic Shimmer)
 */
function applySecretEffect(ctx, img, frameIndex, totalFrames) {
  const progress = frameIndex / totalFrames;
  const width = CANVAS_SIZE, height = CANVAS_SIZE;

  // Cosmic color wave sheen
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

  // Galaxy starlight motes
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
    const size = 1.5 + Math.sin(t * Math.PI) * 3;
    drawSparkleStar(ctx, p.x, currY, size, alpha, p.color);
  });
}

/**
 * Generate animated GIF via FFmpeg
 */
async function generateGif(baseCanvasOrImg, animFn, outputFile, totalFrames = 16, fps = 15) {
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
    ctx.drawImage(baseCanvasOrImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (animFn) {
      animFn(ctx, baseCanvasOrImg, i, totalFrames);
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
    commonFile: 'Common Hunting Gem.png',
    rareFile: 'Rare Hunting Gem.png',
    epicFile: 'Epic Hunting Gem.png',
    mythicalFile: 'Mythical Hunting Gem.png',
    legendaryGif: 'Legendary Hunting Gem.gif',
    ancientGif: 'Fabled Hunting Gem.gif',
    ids: { common: '51', rare: '53', epic: '54', generation: '58', legendary: '56', mythic: '55', ancient: '57', divine: '59', secret: '60' }
  },
  {
    type: 'empowering',
    shapeName: 'Empowering Gem',
    prefix: 'Generic Empowering Gem.png',
    commonFile: 'Common Empowering Gem.png',
    rareFile: 'Rare Empowering Gem.png',
    epicFile: 'Epic Empowering Gem.png',
    mythicalFile: 'Mythical Empowering Gem.png',
    legendaryGif: 'Legendary Empowering Gem.gif',
    ancientGif: 'Fabled Empowering Gem.gif',
    ids: { common: '65', rare: '67', epic: '68', generation: '85', legendary: '70', mythic: '69', ancient: '71', divine: '87', secret: '89' }
  },
  {
    type: 'lucky',
    shapeName: 'Lucky Gem',
    prefix: 'Generic Lucky Gem.png',
    commonFile: 'Common Lucky Gem.png',
    rareFile: 'Rare Lucky Gem.png',
    epicFile: 'Epic Lucky Gem.png',
    mythicalFile: 'Mythical Lucky Gem.png',
    legendaryGif: 'Legendary Lucky Gem.gif',
    ancientGif: 'Fabled Lucky Gem.gif',
    ids: { common: '72', rare: '74', epic: '75', generation: '86', legendary: '77', mythic: '76', ancient: '78', divine: '88', secret: '90' }
  },
  {
    type: 'special',
    shapeName: 'Special Gem',
    prefix: 'Generic Special Gem.png',
    commonFile: 'Common Special Gem.png',
    rareFile: 'Rare Special Gem.png',
    epicFile: 'Epic Special Gem.png',
    mythicalFile: 'Mythical Special Gem.png',
    legendaryGif: 'Legendary Special Gem.gif',
    ancientGif: 'Fabled Special Gem.gif',
    ids: { common: '79', rare: '81', epic: '82', generation: '91', legendary: '84', mythic: '83', ancient: '92', divine: '93', secret: '94' }
  }
];

async function main() {
  console.log('🚀 Generating simple, clean OwO-style gem emojis with animations...');

  for (const spec of GEM_SPECS) {
    const t = spec.type;
    console.log(`\n💎 Processing Gem Type: ${spec.shapeName} (${t})`);

    const genericImg = await loadImage(path.join(BASE_OWO_DIR, spec.prefix));
    const commonImg = await loadImage(path.join(BASE_OWO_DIR, spec.commonFile));
    const rareImg = await loadImage(path.join(BASE_OWO_DIR, spec.rareFile));
    const epicImg = await loadImage(path.join(BASE_OWO_DIR, spec.epicFile));
    const mythicImg = await loadImage(path.join(BASE_OWO_DIR, spec.mythicalFile));

    // 1. Common (PNG)
    const comPng = path.join(OUT_DIR, `gem_${spec.ids.common}_${t}_common.png`);
    const comCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    comCanvas.getContext('2d').drawImage(commonImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    fs.writeFileSync(comPng, comCanvas.toBuffer('image/png'));
    fs.copyFileSync(comPng, path.join(ARTIFACT_DIR, path.basename(comPng)));
    console.log(`  ✅ Common: ${path.basename(comPng)}`);

    // 2. Rare (PNG)
    const rarePng = path.join(OUT_DIR, `gem_${spec.ids.rare}_${t}_rare.png`);
    const rareCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    rareCanvas.getContext('2d').drawImage(rareImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    fs.writeFileSync(rarePng, rareCanvas.toBuffer('image/png'));
    fs.copyFileSync(rarePng, path.join(ARTIFACT_DIR, path.basename(rarePng)));
    console.log(`  ✅ Rare: ${path.basename(rarePng)}`);

    // 3. Epic (PNG)
    const epicPng = path.join(OUT_DIR, `gem_${spec.ids.epic}_${t}_epic.png`);
    const epicCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    epicCanvas.getContext('2d').drawImage(epicImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    fs.writeFileSync(epicPng, epicCanvas.toBuffer('image/png'));
    fs.copyFileSync(epicPng, path.join(ARTIFACT_DIR, path.basename(epicPng)));
    console.log(`  ✅ Epic: ${path.basename(epicPng)}`);

    // 4. Generation (PNG & Animated GIF)
    // Recolor to Fresh Ice-Mint Cyan (#00f2fe / #4facfe)
    const genCanvas = recolorCanvasImage(genericImg, [0, 75, 95], [0, 200, 235], [130, 245, 255]);
    const genPng = path.join(OUT_DIR, `gem_${spec.ids.generation}_${t}_generation.png`);
    const genGif = path.join(OUT_DIR, `gem_${spec.ids.generation}_${t}_generation.gif`);
    fs.writeFileSync(genPng, genCanvas.toBuffer('image/png'));
    fs.copyFileSync(genPng, path.join(ARTIFACT_DIR, path.basename(genPng)));
    await generateGif(genCanvas, applyGenerationEffect, genGif, 16, 15);
    fs.copyFileSync(genGif, path.join(ARTIFACT_DIR, path.basename(genGif)));
    console.log(`  ✨ Generation: ${path.basename(genPng)} & ${path.basename(genGif)}`);

    // 5. Legendary (PNG & Animated GIF from OwO)
    const legGifSrc = path.join(BASE_OWO_DIR, spec.legendaryGif);
    const legGifDest = path.join(OUT_DIR, `gem_${spec.ids.legendary}_${t}_legendary.gif`);
    const legPng = path.join(OUT_DIR, `gem_${spec.ids.legendary}_${t}_legendary.png`);
    fs.copyFileSync(legGifSrc, legGifDest);
    fs.copyFileSync(legGifDest, path.join(ARTIFACT_DIR, path.basename(legGifDest)));
    // Extract first frame as PNG
    const legImg = await loadImage(legGifSrc.replace('.gif', '_frame0.png'));
    const legCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    legCanvas.getContext('2d').drawImage(legImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    fs.writeFileSync(legPng, legCanvas.toBuffer('image/png'));
    fs.copyFileSync(legPng, path.join(ARTIFACT_DIR, path.basename(legPng)));
    console.log(`  ✨ Legendary: ${path.basename(legPng)} & ${path.basename(legGifDest)}`);

    // 6. Mythic (PNG & Animated GIF)
    const mythPng = path.join(OUT_DIR, `gem_${spec.ids.mythic}_${t}_mythic.png`);
    const mythGif = path.join(OUT_DIR, `gem_${spec.ids.mythic}_${t}_mythic.gif`);
    const mythCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    mythCanvas.getContext('2d').drawImage(mythicImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    fs.writeFileSync(mythPng, mythCanvas.toBuffer('image/png'));
    fs.copyFileSync(mythPng, path.join(ARTIFACT_DIR, path.basename(mythPng)));
    await generateGif(mythCanvas, applyMythicEffect, mythGif, 16, 15);
    fs.copyFileSync(mythGif, path.join(ARTIFACT_DIR, path.basename(mythGif)));
    console.log(`  ✨ Mythic: ${path.basename(mythPng)} & ${path.basename(mythGif)}`);

    // 7. Ancient (PNG & Animated GIF from OwO Fabled)
    const ancGifSrc = path.join(BASE_OWO_DIR, spec.ancientGif);
    const ancGifDest = path.join(OUT_DIR, `gem_${spec.ids.ancient}_${t}_ancient.gif`);
    const ancPng = path.join(OUT_DIR, `gem_${spec.ids.ancient}_${t}_ancient.png`);
    fs.copyFileSync(ancGifSrc, ancGifDest);
    fs.copyFileSync(ancGifDest, path.join(ARTIFACT_DIR, path.basename(ancGifDest)));
    const ancImg = await loadImage(ancGifSrc.replace('.gif', '_frame0.png'));
    const ancCanvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    ancCanvas.getContext('2d').drawImage(ancImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    fs.writeFileSync(ancPng, ancCanvas.toBuffer('image/png'));
    fs.copyFileSync(ancPng, path.join(ARTIFACT_DIR, path.basename(ancPng)));
    console.log(`  ✨ Ancient: ${path.basename(ancPng)} & ${path.basename(ancGifDest)}`);

    // 8. Divine (PNG & Animated GIF)
    // Recolor to Radiant Celestial Gold (#ffd700 / #fff176)
    const divCanvas = recolorCanvasImage(genericImg, [115, 75, 0], [255, 190, 0], [255, 245, 140]);
    const divPng = path.join(OUT_DIR, `gem_${spec.ids.divine}_${t}_divine.png`);
    const divGif = path.join(OUT_DIR, `gem_${spec.ids.divine}_${t}_divine.gif`);
    fs.writeFileSync(divPng, divCanvas.toBuffer('image/png'));
    fs.copyFileSync(divPng, path.join(ARTIFACT_DIR, path.basename(divPng)));
    await generateGif(divCanvas, applyDivineEffect, divGif, 16, 15);
    fs.copyFileSync(divGif, path.join(ARTIFACT_DIR, path.basename(divGif)));
    console.log(`  ✨ Divine: ${path.basename(divPng)} & ${path.basename(divGif)}`);

    // 9. Secret (PNG & Animated GIF)
    // Recolor to Cosmic Nebula Violet (#9900ff / #e040fb)
    const secCanvas = recolorCanvasImage(genericImg, [45, 10, 70], [148, 30, 185], [235, 85, 255]);
    const secPng = path.join(OUT_DIR, `gem_${spec.ids.secret}_${t}_secret.png`);
    const secGif = path.join(OUT_DIR, `gem_${spec.ids.secret}_${t}_secret.gif`);
    fs.writeFileSync(secPng, secCanvas.toBuffer('image/png'));
    fs.copyFileSync(secPng, path.join(ARTIFACT_DIR, path.basename(secPng)));
    await generateGif(secCanvas, applySecretEffect, secGif, 16, 15);
    fs.copyFileSync(secGif, path.join(ARTIFACT_DIR, path.basename(secGif)));
    console.log(`  ✨ Secret: ${path.basename(secPng)} & ${path.basename(secGif)}`);
  }

  console.log('\n🎉 ALL DONE! All 36 gem emojis (PNG + Animated GIFs) generated successfully!');
}

main().catch(console.error);
