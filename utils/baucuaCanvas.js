const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const fs = require("fs");
const { AttachmentBuilder } = require("discord.js");

// Cấu hình con vật và thuộc tính vẽ
const ITEM_DRAW_DEFAULTS = {
  cua: { name: "CUA", color: "#ff4b4b", imageFile: "cua.png" },
  tom: { name: "TÔM", color: "#ff7e4b", imageFile: "tom.png" },
  bau: { name: "BẦU", color: "#4bff4b", imageFile: "bau.png" },
  ga: { name: "GÀ", color: "#ffd44b", imageFile: "ga.png" },
  huou: { name: "HƯƠU", color: "#c68a4c", imageFile: "huou.png" },
  ca: { name: "CÁ", color: "#4b90ff", imageFile: "ca.png" }
};

// Cache chứa các ảnh đã load để tối ưu hiệu năng
const imageCache = new Map();

// Hàm tải ảnh an toàn và cache lại
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

// Vẽ hình chữ nhật bo góc
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

/**
 * Vẽ màn hình đặt cược (Lobby game) - Chỉ vẽ 6 hình thú cực to
 */
async function drawBettingCanvas(game) {
  const width = 600;
  const height = 410;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Vẽ hình nền tối
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(0, 0, width, height);

  // 2. Vẽ viền bo góc phát sáng màu xanh lá (style OwO)
  ctx.strokeStyle = "#248046";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 12, false, true);

  // 3. Vẽ 6 con vật (3 cột, 2 hàng)
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

    // Vẽ nền thẻ card
    ctx.fillStyle = "#2b2d31";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, true, false);

    // Vẽ viền thẻ card tương ứng màu con vật
    ctx.strokeStyle = itemCfg.color;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, false, true);

    // Tên con vật ở đầu thẻ card
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 14px "Arial"';
    ctx.textAlign = "center";
    ctx.fillText(itemCfg.name, cardX + cardWidth / 2, cardY + 22);

    // Load và vẽ ảnh pixel art của con vật (kích thước lớn 110x110)
    const img = await getCachedImage(itemCfg.imageFile);
    if (img) {
      ctx.drawImage(img, cardX + 30, cardY + 35, 110, 110);
    } else {
      ctx.font = '50px "Arial"';
      ctx.fillText("❓", cardX + cardWidth / 2, cardY + 95);
    }
  }

  // Reset căn lề chữ
  ctx.textAlign = "left";

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: `baucua_betting_${game.gameId}.png` });
}

/**
 * Vẽ màn hình kết quả - Chỉ vẽ 3 xúc xắc rolled cực to nằm ngang
 */
async function drawResultCanvas(game, results) {
  const width = 600;
  const height = 210;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Vẽ hình nền tối
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(0, 0, width, height);

  // 2. Vẽ viền bo góc phát sáng màu xanh lá
  ctx.strokeStyle = "#248046";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 12, false, true);

  // 3. Vẽ 3 Xúc xắc Kết quả nằm ngang (kích thước lớn)
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

    // Vẽ nền thẻ card
    ctx.fillStyle = "#2b2d31";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, true, false);

    // Vẽ viền thẻ card tương ứng màu xúc xắc trúng
    ctx.strokeStyle = itemCfg.color;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10, false, true);

    // Dòng chữ XÚC XẮC
    ctx.textAlign = "center";
    ctx.fillStyle = "#b5bac1";
    ctx.font = 'bold 11px "Arial"';
    ctx.fillText(`XÚC XẮC ${i + 1}`, cardX + cardWidth / 2, cardY + 22);

    // Vẽ ảnh pixel art (kích thước lớn 110x110)
    const img = await getCachedImage(itemCfg.imageFile);
    if (img) {
      ctx.drawImage(img, cardX + 30, cardY + 35, 110, 110);
    } else {
      ctx.font = '50px "Arial"';
      ctx.fillText("🎲", cardX + cardWidth / 2, cardY + 95);
    }
  }

  // Reset căn lề chữ
  ctx.textAlign = "left";

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: `baucua_result_${game.gameId}.png` });
}

module.exports = {
  drawBettingCanvas,
  drawResultCanvas
};
