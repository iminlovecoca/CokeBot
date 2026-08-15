const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const { drawRankFrame, RANK_TIERS } = require("../utils/rankFrameUtil");

async function renderBattleMockup() {
  const width = 1100;
  const height = 750;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Pure dark background #05070B
  ctx.fillStyle = "#05070B";
  ctx.fillRect(0, 0, width, height);

  // 1. Draw Top Battle UI Header Bar
  const barY = 30;
  // Left Pet Box
  const p1PetX = 40;
  const p1PetY = barY;
  const petSize = 90;

  ctx.fillStyle = "#161922";
  ctx.fillRect(p1PetX, p1PetY, petSize, petSize);
  drawRankFrame(ctx, p1PetX, p1PetY, petSize, petSize, "mythic");
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🐻‍❄️", p1PetX + petSize / 2, p1PetY + petSize / 2);

  // Right Pet Box
  const p2PetX = width - 40 - petSize;
  const p2PetY = barY;
  ctx.fillStyle = "#161922";
  ctx.fillRect(p2PetX, p2PetY, petSize, petSize);
  drawRankFrame(ctx, p2PetX, p2PetY, petSize, petSize, "divine");
  ctx.fillText("🐍", p2PetX + petSize / 2, p2PetY + petSize / 2);

  // Center VS Crest
  const vsX = width / 2;
  const vsY = barY + petSize / 2;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px serif";
  ctx.fillText("VS", vsX, vsY);

  // HP / Rage Bars (Left)
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(150, barY + 15, 340, 24);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(150, barY + 50, 340, 24);
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("0 / 14284", 150 + 170, barY + 27);
  ctx.fillStyle = "#ff4da6";
  ctx.fillText("65% Nộ", 150 + 170, barY + 62);

  // HP / Rage Bars (Right)
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(vsX + 60, barY + 15, 340, 24);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(vsX + 60, barY + 50, 340, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("12 / 12174", vsX + 60 + 170, barY + 27);
  ctx.fillStyle = "#00f7d2";
  ctx.fillText("100% Nộ", vsX + 60 + 170, barY + 62);

  // 2. Draw 4 Rank Cards on Row 1 (Common, Rare, Epic, Legendary)
  const row1Tiers = ["common", "rare", "epic", "legendary"];
  const cardW = 160;
  const cardH = 210;
  const row1Y = 175;

  for (let i = 0; i < 4; i++) {
    const cardX = 65 + i * 260;
    const key = row1Tiers[i];

    // Inner dark container
    ctx.fillStyle = "#10121a";
    ctx.fillRect(cardX, row1Y, cardW, cardH);

    // Center character emoji / sprite
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("⚔️", cardX + cardW / 2, row1Y + cardH / 2);

    // Draw Pure Canvas Rank Frame
    drawRankFrame(ctx, cardX, row1Y, cardW, cardH, key);

    // Title & Subtitle below
    ctx.font = "bold 20px serif";
    ctx.fillStyle = RANK_TIERS[key].textColor;
    ctx.fillText(RANK_TIERS[key].name, cardX + cardW / 2, row1Y + cardH + 35);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#a0a8be";
    ctx.fillText(RANK_TIERS[key].subtitle, cardX + cardW / 2, row1Y + cardH + 58);
  }

  // 3. Draw 3 Rank Cards on Row 2 (Mythic, Ancient, Divine)
  const row2Tiers = ["mythic", "ancient", "divine"];
  const row2Y = 465;

  for (let i = 0; i < 3; i++) {
    const cardX = 195 + i * 260;
    const key = row2Tiers[i];

    ctx.fillStyle = "#10121a";
    ctx.fillRect(cardX, row2Y, cardW, cardH);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("🧙‍♂️", cardX + cardW / 2, row2Y + cardH / 2);

    drawRankFrame(ctx, cardX, row2Y, cardW, cardH, key);

    ctx.font = "bold 20px serif";
    ctx.fillStyle = RANK_TIERS[key].textColor;
    ctx.fillText(RANK_TIERS[key].name, cardX + cardW / 2, row2Y + cardH + 35);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#a0a8be";
    ctx.fillText(RANK_TIERS[key].subtitle, cardX + cardW / 2, row2Y + cardH + 58);
  }

  const outDir = "C:\\Users\\khang\\.gemini\\antigravity\\brain\\e1573dd0-adcd-4dc8-99fb-f3fe38332066";
  const outPath = path.join(outDir, "canvas_procedural_battle_showcase.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`✅ Saved 100% Canvas procedural mockup to: ${outPath}`);
}

renderBattleMockup().catch(console.error);
