const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const fs = require("fs");
const { AttachmentBuilder } = require("discord.js");


const ITEM_DRAW_DEFAULTS = {
  cua: { name: "CUA", color: "#ff4b4b", imageFile: "cua.png" },
  tom: { name: "TÔM", color: "#ff7e4b", imageFile: "tom.png" },
  bau: { name: "BẦU", color: "#4bff4b", imageFile: "bau.png" },
  ga: { name: "GÀ", color: "#ffd44b", imageFile: "ga.png" },
  huou: { name: "HƯƠU", color: "#c68a4c", imageFile: "huou.png" },
  ca: { name: "CÁ", color: "#4b90ff", imageFile: "ca.png" }
};


const imageCache = new Map();


async function getCachedImage(filename) {
  if (imageCache.has(filename)) {
    return imageCache.get(filename);
  }
  const imgPath = path.join(__dirname, "../assets/images/baucua", filename);
  if (fs.existsSync(imgPath)) {
    try {
      const img = await loadImage(imgPath);
      imageCache.set(filename, img);
      return img;
    } catch (err) {
      console.error(`[Baucua Canvas] Failed to load image: ${imgPath}`, err);
    }
  }
  return null;
}


function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}


async function drawBettingCanvas(game) {
  const width = 600;
  const height = 410;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(0, 0, width, height);

  
  ctx.strokeStyle = "#248046";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 12, false, true);

  
  const itemsList = ["cua", "tom", "bau", "ga", "huou", "ca"];
  const cardWidth = 170;
  const cardHeight = 170;
  const spacingX = 20;
  const spacingY = 20;
  const startX = 25;
  const startY = 25;

  for (let index = 0; index < itemsList.length; index++) {
    const itemId = itemsList[index];
    const itemCfg = ITEM_DRAW_DEFAULTS[itemId];
    const col = index % 3;
    const row = Math.floor(index / 3);

    const cardX = startX + col * (cardWidth + spacingX);
    const cardY = startY + row * (cardHeight + spacingY);

    
    ctx.fillStyle = "#2b2d31";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, true, false);

    
    ctx.strokeStyle = itemCfg.color;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, false, true);

    
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 14px "Arial"';
    ctx.textAlign = "center";
    ctx.fillText(itemCfg.name, cardX + cardWidth / 2, cardY + 22);

    
    const img = await getCachedImage(itemCfg.imageFile);
    if (img) {
      ctx.drawImage(img, cardX + 30, cardY + 35, 110, 110);
    } else {
      ctx.font = '50px "Arial"';
      ctx.fillText("❓", cardX + cardWidth / 2, cardY + 95);
    }
  }

  
  ctx.textAlign = "left";

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: `baucua_betting_${game.gameId}.png` });
}


async function drawResultCanvas(game, results) {
  const width = 600;
  const height = 210;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(0, 0, width, height);

  
  ctx.strokeStyle = "#248046";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 12, false, true);

  
  const cardWidth = 170;
  const cardHeight = 170;
  const spacingX = 20;
  const startX = 25;
  const startY = 20;

  for (let i = 0; i < results.length; i++) {
    const rolledItem = results[i];
    const itemCfg = ITEM_DRAW_DEFAULTS[rolledItem.id];
    const cardX = startX + i * (cardWidth + spacingX);
    const cardY = startY;

    
    ctx.fillStyle = "#2b2d31";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, true, false);

    
    ctx.strokeStyle = itemCfg.color;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, false, true);

    
    ctx.textAlign = "center";
    ctx.fillStyle = "#b5bac1";
    ctx.font = 'bold 11px "Arial"';
    ctx.fillText(`XÚC XẮC ${i + 1}`, cardX + cardWidth / 2, cardY + 22);

    
    const img = await getCachedImage(itemCfg.imageFile);
    if (img) {
      ctx.drawImage(img, cardX + 30, cardY + 35, 110, 110);
    } else {
      ctx.font = '50px "Arial"';
      ctx.fillText("🎲", cardX + cardWidth / 2, cardY + 95);
    }
  }

  
  ctx.textAlign = "left";

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: `baucua_result_${game.gameId}.png` });
}

module.exports = {
  drawBettingCanvas,
  drawResultCanvas
};
