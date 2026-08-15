const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

async function sliceRankFrames() {
  const sourcePath = "C:\\Users\\khang\\.gemini\\antigravity\\brain\\e1573dd0-adcd-4dc8-99fb-f3fe38332066\\.user_uploaded\\media_1786779950718.png";
  if (!fs.existsSync(sourcePath)) {
    console.error("Source image not found at:", sourcePath);
    return;
  }

  const img = await loadImage(sourcePath);
  console.log(`📸 Source image loaded: ${img.width}x${img.height}`);

  const outputDir = path.join(__dirname, "../assets/ranks/frames");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // The source image has 7 frames lined up side by side horizontally
  // Image layout analysis:
  // Total width: img.width, Total height: img.height
  // Top text label area is roughly top 20%
  // The 7 frames start around y = img.height * 0.20 down to y = img.height * 0.95
  
  const frameKeys = ["common", "rare", "epic", "legendary", "mythic", "ancient", "divine"];
  const totalFrames = 7;
  
  const frameWidth = img.width / totalFrames;
  const cropY = Math.floor(img.height * 0.21);
  const cropH = Math.floor(img.height * 0.77);

  for (let i = 0; i < totalFrames; i++) {
    const cropX = Math.floor(i * frameWidth);
    const cropW = Math.floor(frameWidth);

    const canvas = createCanvas(cropW, cropH);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Make black background (#000000 or near-black) transparent
    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;
    for (let j = 0; j < data.length; j += 4) {
      const r = data[j];
      const g = data[j + 1];
      const b = data[j + 2];
      // If color is very dark (black background), set alpha to 0
      if (r < 18 && g < 18 && b < 18) {
        data[j + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const key = frameKeys[i];
    const outPath = path.join(outputDir, `${key}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    console.log(`✅ Saved sliced HD frame: assets/ranks/frames/${key}.png (${cropW}x${cropH})`);
  }

  console.log("🎉 All 7 rank frame PNG assets sliced & extracted with transparent background successfully!");
}

sliceRankFrames().catch(console.error);
