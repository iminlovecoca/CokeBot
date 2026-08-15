const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");
const { drawRankFrame, RANK_TIERS } = require("../utils/rankFrameUtil");

async function renderShowcase() {
  const canvasWidth = 1300;
  const canvasHeight = 950;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0c0d12";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Subtle Tech Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvasWidth; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y < canvasHeight; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Header Banner
  ctx.fillStyle = "#141620";
  ctx.fillRect(0, 0, canvasWidth, 80);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, canvasWidth, 80);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⚔️ BẢNG MẪU KHUNG CÁNH GIÁP LEAGUE OF LEGENDS STYLE (COKEBOT) ⚔️", canvasWidth / 2, 50);

  const tiers = [
    { key: "common", label: "Common", desc: "Viền Bạc Thép" },
    { key: "rare", label: "Rare", desc: "Cánh V Vàng Kim" },
    { key: "epic", label: "Epic", desc: "Cánh Sapphire Blue" },
    { key: "legendary", label: "Legendary", desc: "Cánh Rồng Tím" },
    { key: "mythic", label: "Mythic", desc: "Cánh Gai Đỏ Hồng" },
    { key: "ancient", label: "Ancient", desc: "Cánh Cổ Đại Amber" },
    { key: "divine", label: "Divine", desc: "Cánh Tinh Tú Cyan" }
  ];

  const boxW = 140;
  const boxH = 140;
  const startY = 150;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const row = Math.floor(i / 4);
    const col = i % 4;

    const offsetX = row === 0 ? 90 + col * 290 : 235 + col * 290;
    const offsetY = startY + row * 400;

    // Card background panel with generous margins for wings
    ctx.save();
    ctx.fillStyle = "#151722";
    ctx.strokeStyle = RANK_TIERS[tier.key].borderColor1;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(offsetX - 35, offsetY - 45, boxW + 70, boxH + 195, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Dark avatar box container
    ctx.fillStyle = "#202432";
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, boxW, boxH, 12);
    ctx.fill();

    // Draw inner icon / avatar symbol
    ctx.fillStyle = "#454c64";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚔️", offsetX + boxW / 2, offsetY + boxH / 2);

    // Draw Progressive LoL-Style Rank Frame with full wings
    drawRankFrame(ctx, offsetX, offsetY, boxW, boxH, tier.key);

    // Text Label below
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = RANK_TIERS[tier.key].borderColor1;
    ctx.fillText(tier.label.toUpperCase(), offsetX + boxW / 2, offsetY + boxH + 60);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#a8b0c5";
    ctx.fillText(tier.desc, offsetX + boxW / 2, offsetY + boxH + 90);
  }

  const outDir = "C:\\Users\\khang\\.gemini\\antigravity\\brain\\e1573dd0-adcd-4dc8-99fb-f3fe38332066";
  const outPath = path.join(outDir, "rank_frames_showcase_large.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Saved updated HD rank frame showcase to: ${outPath}`);
}

renderShowcase().catch(console.error);
