const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");
const { drawRankFrame, RANK_TIERS } = require("../utils/rankFrameUtil");

async function renderAllRankFrames() {
  const outputDir = path.join(__dirname, "../assets/ranks/preview");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tiers = [
    { key: "common", name: "COMMON", sub: "Viền Bạc Thép" },
    { key: "rare", name: "RARE", sub: "Viền Vàng Kim" },
    { key: "epic", name: "EPIC", sub: "Viền Sapphire Lam" },
    { key: "legendary", name: "LEGENDARY", sub: "Viền Tím Hoàng Gia" },
    { key: "mythic", name: "MYTHIC", sub: "Viền Đỏ Huyết Nguyệt" },
    { key: "ancient", name: "ANCIENT", sub: "Viền Hổ Phách Cổ Đại" },
    { key: "divine", name: "DIVINE", sub: "Viền Tinh Tú Tối Cao" }
  ];

  // 1. Render Individual Square (1:1) PNG Images (320x320)
  for (const tier of tiers) {
    const size = 320;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Pure Solid Dark #05070B Background
    ctx.fillStyle = "#05070B";
    ctx.fillRect(0, 0, size, size);

    // Frame Bounding Box (Square 180x180)
    const boxSize = 180;
    const boxX = (size - boxSize) / 2;
    const boxY = (size - boxSize) / 2 + 10;

    // Dark empty placeholder for avatar
    ctx.fillStyle = "#10121a";
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    // Draw Square Vector Rank Frame
    drawRankFrame(ctx, boxX, boxY, boxSize, boxSize, tier.key);

    // Rank Title Text above frame
    ctx.textAlign = "center";
    ctx.font = "bold 20px serif";
    ctx.fillStyle = RANK_TIERS[tier.key].textColor;
    ctx.fillText(tier.name, size / 2, 40);

    // Subtitle Text below Title
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#a8b0c5";
    ctx.fillText(tier.sub, size / 2, 58);

    const filePath = path.join(outputDir, `${tier.key}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
  }

  // 2. Render Full Square Asset Template Sheet (all_ranks.png)
  const fullWidth = 1800;
  const fullHeight = 380;
  const fullCanvas = createCanvas(fullWidth, fullHeight);
  const fullCtx = fullCanvas.getContext("2d");

  // Pure Solid Dark #05070B Background
  fullCtx.fillStyle = "#05070B";
  fullCtx.fillRect(0, 0, fullWidth, fullHeight);

  const boxSize = 180;
  const startX = 55;
  const spacingX = 248;
  const frameY = 120;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const offsetX = startX + i * spacingX;

    // Dark empty square placeholder for avatar
    fullCtx.fillStyle = "#10121a";
    fullCtx.fillRect(offsetX, frameY, boxSize, boxSize);

    // Draw Square Vector Rank Frame (1:1 Ratio)
    drawRankFrame(fullCtx, offsetX, frameY, boxSize, boxSize, tier.key);

    // Title Text
    fullCtx.textAlign = "center";
    fullCtx.font = "bold 22px serif";
    fullCtx.fillStyle = RANK_TIERS[tier.key].textColor;
    fullCtx.fillText(tier.name, offsetX + boxSize / 2, 55);

    // Subtitle Text
    fullCtx.font = "14px sans-serif";
    fullCtx.fillStyle = "#a0a8be";
    fullCtx.fillText(tier.sub, offsetX + boxSize / 2, 78);
  }

  const allRanksPath = path.join(outputDir, "all_ranks.png");
  fs.writeFileSync(allRanksPath, fullCanvas.toBuffer("image/png"));
  console.log(`🎉 Saved square 1:1 rank template sheet to: assets/ranks/preview/all_ranks.png`);

  // Copy to artifact directory for instant user display
  const artifactDir = "C:\\Users\\khang\\.gemini\\antigravity\\brain\\e1573dd0-adcd-4dc8-99fb-f3fe38332066";
  if (fs.existsSync(artifactDir)) {
    fs.copyFileSync(allRanksPath, path.join(artifactDir, "all_ranks.png"));
  }
}

if (require.main === module) {
  renderAllRankFrames().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = renderAllRankFrames;
