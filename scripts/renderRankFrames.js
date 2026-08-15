const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const { drawRankFrame, RANK_TIERS } = require("../utils/rankFrameUtil");

async function renderAllRankFrames() {
  const outputDir = path.join(__dirname, "../assets/ranks/preview");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`🚀 Starting rendering of all Battle Rank Frames into: ${outputDir}`);

  const tiers = [
    { key: "common", label: "Common", desc: "Viền Bạc Thép" },
    { key: "rare", label: "Rare", desc: "Cánh Vàng Kim" },
    { key: "epic", label: "Epic", desc: "Cánh Sapphire Blue" },
    { key: "legendary", label: "Legendary", desc: "Cánh Rồng Tím" },
    { key: "mythic", label: "Mythic", desc: "Cánh Gai Đỏ Hồng" },
    { key: "ancient", label: "Ancient", desc: "Cánh Cổ Đại Amber" },
    { key: "divine", label: "Divine", desc: "Cánh Tinh Tú Cyan" }
  ];

  // 1. Render Individual 320x320 PNG Images for each Rank Tier
  for (const tier of tiers) {
    const width = 340;
    const height = 340;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Dark Background
    ctx.fillStyle = "#12141d";
    ctx.fillRect(0, 0, width, height);

    // Tech Grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Avatar Box Container (Center 140x140)
    const boxW = 140;
    const boxH = 140;
    const boxX = (width - boxW) / 2;
    const boxY = (height - boxH) / 2 - 15;

    ctx.fillStyle = "#1f2330";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();

    // Center Avatar Icon
    ctx.fillStyle = "#4c536d";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚔️", boxX + boxW / 2, boxY + boxH / 2);

    // Draw Metallic Rank Frame with 3D Wings
    drawRankFrame(ctx, boxX, boxY, boxW, boxH, tier.key);

    // Title Label below
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = RANK_TIERS[tier.key].borderColor1;
    ctx.fillText(tier.label.toUpperCase(), width / 2, height - 40);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#a0a8be";
    ctx.fillText(tier.desc, width / 2, height - 18);

    const filePath = path.join(outputDir, `${tier.key}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
    console.log(`✅ Rendered individual frame: assets/ranks/preview/${tier.key}.png`);
  }

  // 2. Render Full Overview Grid Image (all_ranks.png)
  const fullWidth = 1400;
  const fullHeight = 900;
  const fullCanvas = createCanvas(fullWidth, fullHeight);
  const fullCtx = fullCanvas.getContext("2d");

  fullCtx.fillStyle = "#0c0d12";
  fullCtx.fillRect(0, 0, fullWidth, fullHeight);

  fullCtx.fillStyle = "#ffffff";
  fullCtx.font = "bold 32px sans-serif";
  fullCtx.textAlign = "center";
  fullCtx.fillText("🛡️ BẢNG TỔNG HỢP TOÀN BỘ KHUNG BẬC RANK BATTLE PVP (COKEBOT) 🛡️", fullWidth / 2, 55);

  const boxW = 140;
  const boxH = 140;
  const startY = 140;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const row = Math.floor(i / 4);
    const col = i % 4;

    const offsetX = row === 0 ? 100 + col * 310 : 255 + col * 310;
    const offsetY = startY + row * 380;

    // Card background panel
    fullCtx.save();
    fullCtx.fillStyle = "#151722";
    fullCtx.strokeStyle = RANK_TIERS[tier.key].borderColor1;
    fullCtx.lineWidth = 2;
    fullCtx.beginPath();
    fullCtx.roundRect(offsetX - 35, offsetY - 45, boxW + 70, boxH + 195, 16);
    fullCtx.fill();
    fullCtx.stroke();
    fullCtx.restore();

    // Dark avatar box container
    fullCtx.fillStyle = "#202432";
    fullCtx.beginPath();
    fullCtx.roundRect(offsetX, offsetY, boxW, boxH, 12);
    fullCtx.fill();

    // Center Avatar Icon
    fullCtx.fillStyle = "#454c64";
    fullCtx.font = "bold 52px sans-serif";
    fullCtx.textAlign = "center";
    fullCtx.textBaseline = "middle";
    fullCtx.fillText("⚔️", offsetX + boxW / 2, offsetY + boxH / 2);

    // Draw Rank Frame
    drawRankFrame(fullCtx, offsetX, offsetY, boxW, boxH, tier.key);

    // Text Label
    fullCtx.font = "bold 22px sans-serif";
    fullCtx.fillStyle = RANK_TIERS[tier.key].borderColor1;
    fullCtx.fillText(tier.label.toUpperCase(), offsetX + boxW / 2, offsetY + boxH + 60);

    fullCtx.font = "14px sans-serif";
    fullCtx.fillStyle = "#a8b0c5";
    fullCtx.fillText(tier.desc, offsetX + boxW / 2, offsetY + boxH + 90);
  }

  const allRanksPath = path.join(outputDir, "all_ranks.png");
  fs.writeFileSync(allRanksPath, fullCanvas.toBuffer("image/png"));
  console.log(`🎉 Saved complete overview to: assets/ranks/preview/all_ranks.png`);

  // Also copy to artifacts directory for display
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
