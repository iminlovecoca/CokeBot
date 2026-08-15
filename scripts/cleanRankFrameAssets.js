const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

async function cleanRankFrameAssets() {
  const sourcePath = "C:\\Users\\khang\\.gemini\\antigravity\\brain\\e1573dd0-adcd-4dc8-99fb-f3fe38332066\\.user_uploaded\\media_1786779950718.png";
  if (!fs.existsSync(sourcePath)) {
    console.error("Source image not found:", sourcePath);
    return;
  }

  const img = await loadImage(sourcePath);
  const outputDir = path.join(__dirname, "../assets/ranks/frames");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const frameKeys = [
    { key: "common", name: "COMMON", sub: "Viên Bạc Thép" },
    { key: "rare", name: "RARE", sub: "Cánh Vàng Kim" },
    { key: "epic", name: "EPIC", sub: "Cánh Sapphire Blue" },
    { key: "legendary", name: "LEGENDARY", sub: "Cánh Rồng Tím" },
    { key: "mythic", name: "MYTHIC", sub: "Cánh Gai Đỏ Hồng" },
    { key: "ancient", name: "ANCIENT", sub: "Cánh Cổ Đại Amber" },
    { key: "divine", name: "DIVINE", sub: "Cánh Tinh Tú Cyan" }
  ];

  const totalFrames = 7;
  const frameWidth = img.width / totalFrames; // ~146.28
  const cropY = Math.floor(img.height * 0.22); // Start right below text header
  const cropH = Math.floor(img.height * 0.76); // Height of frame

  for (let i = 0; i < totalFrames; i++) {
    const cropX = Math.floor(i * frameWidth);
    const cropW = Math.floor(frameWidth);

    const canvas = createCanvas(cropW, cropH);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Alpha keying: make pure black and dark background transparent
    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const data = imgData.data;

    // Center bounding box for transparency (interior of frame)
    const innerLeft = Math.floor(cropW * 0.22);
    const innerRight = Math.floor(cropW * 0.78);
    const innerTop = Math.floor(cropH * 0.16);
    const innerBottom = Math.floor(cropH * 0.84);

    for (let py = 0; py < cropH; py++) {
      for (let px = 0; px < cropW; px++) {
        const idx = (py * cropW + px) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const maxVal = Math.max(r, g, b);

        // If inside the frame interior and dark, make 100% transparent
        if (px >= innerLeft && px <= innerRight && py >= innerTop && py <= innerBottom) {
          if (maxVal < 45) {
            data[idx + 3] = 0;
          }
        } else {
          // Outside background
          if (maxVal < 16) {
            data[idx + 3] = 0;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const key = frameKeys[i].key;
    const outPath = path.join(outputDir, `${key}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    console.log(`✅ Cleaned frame asset: assets/ranks/frames/${key}.png (${cropW}x${cropH})`);
  }

  console.log("🎉 All 7 rank frame PNG assets cleaned with transparent interior successfully!");
}

cleanRankFrameAssets().catch(console.error);
