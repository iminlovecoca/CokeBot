const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const fs = require("fs");
const { AttachmentBuilder } = require("discord.js");

// Đăng ký font nếu có
const robotoFontPath = path.join(__dirname, "../assets/fonts/RobotoSlab-Regular.ttf");
if (fs.existsSync(robotoFontPath)) {
  try {
    registerFont(robotoFontPath, { family: "RobotoSlab" });
  } catch (err) {
    console.error("[Baucua Canvas] Failed to register font:", err);
  }
}

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
 * Vẽ màn hình đặt cược (Lobby game)
 */
async function drawBettingCanvas(game) {
  const width = 800;
  const height = 540;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Vẽ hình nền tối (matching Discord dark mode)
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(0, 0, width, height);

  // 2. Vẽ viền bo góc phát sáng màu xanh lá (style OwO)
  ctx.strokeStyle = "#248046";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 15, false, true);

  // 3. Vẽ Tiêu đề chính
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 28px "RobotoSlab", "Arial"';
  ctx.fillText("🏆 BẦU CUA TÔM CÁ", 30, 50);

  // Vẽ biểu tượng kính lúp nhỏ ở góc trên bên phải (decor giống OwO)
  ctx.fillStyle = "#2b2d31";
  drawRoundedRect(ctx, 730, 20, 40, 40, 8, true, false);
  ctx.fillStyle = "#72767d";
  ctx.font = '20px "Arial"';
  ctx.fillText("🔍", 738, 47);

  // 4. Vẽ Subtitle thông tin sòng
  const expirationTime = game.createdAt + 60000;
  const secondsLeft = Math.max(0, Math.round((expirationTime - Date.now()) / 1000));
  const subtitleText = `Chủ sòng: @${game.hostUsername || "Khang"}  |  Hạn mức cược: 250,000 Coke  |  Thời gian: ${secondsLeft}s`;
  ctx.fillStyle = "#b5bac1";
  ctx.font = '15px "Arial"';
  ctx.fillText(subtitleText, 30, 85);

  // 5. Vẽ 6 con vật (3 cột, 2 hàng)
  const itemsList = ["cua", "tom", "bau", "ga", "huou", "ca"];
  const cardWidth = 230;
  const cardHeight = 180;
  const spacingX = 25;
  const spacingY = 25;
  const startX = 30;
  const startY = 110;

  for (let index = 0; index < itemsList.length; index++) {
    const itemId = itemsList[index];
    const itemCfg = ITEM_DRAW_DEFAULTS[itemId];
    const col = index % 3;
    const row = Math.floor(index / 3);

    const cardX = startX + col * (cardWidth + spacingX);
    const cardY = startY + row * (cardHeight + spacingY);

    // Vẽ nền thẻ card
    ctx.fillStyle = "#2b2d31";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12, true, false);

    // Vẽ viền thẻ card tương ứng màu con vật
    ctx.strokeStyle = itemCfg.color;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12, false, true);

    // Tên con vật ở đầu thẻ card
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 16px "Arial"';
    ctx.textAlign = "center";
    ctx.fillText(itemCfg.name, cardX + cardWidth / 2, cardY + 28);

    // Load và vẽ ảnh pixel art của con vật
    const img = await getCachedImage(itemCfg.imageFile);
    if (img) {
      ctx.drawImage(img, cardX + (cardWidth - 70) / 2, cardY + 42, 70, 70);
    } else {
      // Fallback vẽ chữ to nếu không load được ảnh
      ctx.font = '40px "Arial"';
      ctx.fillText("❓", cardX + cardWidth / 2, cardY + 90);
    }

    // Tính tổng tiền cược trên con vật này
    let totalItemBet = 0;
    const playersOnItem = [];

    for (const [userId, bets] of game.bets.entries()) {
      const amountOnItem = bets
        .filter((b) => b.choice === itemId)
        .reduce((sum, b) => sum + b.amount, 0);
      if (amountOnItem > 0) {
        totalItemBet += amountOnItem;
        const name = game.usernames.get(userId) || "Player";
        playersOnItem.push(name);
      }
    }

    // Hiển thị tổng tiền cược ở dưới thẻ
    ctx.fillStyle = "#ffd700";
    ctx.font = 'bold 14px "Arial"';
    ctx.fillText(`Tổng cược: ${totalItemBet.toLocaleString()}`, cardX + cardWidth / 2, cardY + 135);

    // Hiển thị người cược ở cuối thẻ
    ctx.fillStyle = "#b5bac1";
    ctx.font = '12px "Arial"';
    if (playersOnItem.length === 0) {
      ctx.fillText("Chưa có cược", cardX + cardWidth / 2, cardY + 158);
    } else {
      let firstPlayer = playersOnItem[0];
      if (firstPlayer.length > 12) {
        firstPlayer = firstPlayer.substring(0, 10) + "...";
      }
      const playerStr = playersOnItem.length === 1 
        ? firstPlayer 
        : `${firstPlayer} (+${playersOnItem.length - 1})`;
      ctx.fillText(playerStr, cardX + cardWidth / 2, cardY + 158);
    }
  }

  // Reset căn lề chữ
  ctx.textAlign = "left";

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: `baucua_betting_${game.gameId}.png` });
}

/**
 * Vẽ màn hình kết quả (Xúc xắc và Trả thưởng)
 */
async function drawResultCanvas(game, results, leaderboard) {
  const width = 800;
  const height = 760;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Vẽ hình nền tối
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(0, 0, width, height);

  // 2. Vẽ viền bo góc phát sáng màu xanh lá
  ctx.strokeStyle = "#248046";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 15, false, true);

  // 3. Vẽ Tiêu đề chính
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 28px "RobotoSlab", "Arial"';
  ctx.fillText("🏆 KẾT QUẢ BẦU CUA", 30, 50);

  // Vẽ biểu tượng kính lúp nhỏ ở góc trên bên phải
  ctx.fillStyle = "#2b2d31";
  drawRoundedRect(ctx, 730, 20, 40, 40, 8, true, false);
  ctx.fillStyle = "#72767d";
  ctx.font = '20px "Arial"';
  ctx.fillText("🔍", 738, 47);

  // 4. Vẽ Subtitle thông tin sòng
  const subtitleText = `Chủ sòng: @${game.hostUsername || "Khang"}  |  Phiên chơi kết thúc!`;
  ctx.fillStyle = "#b5bac1";
  ctx.font = '15px "Arial"';
  ctx.fillText(subtitleText, 30, 85);

  // 5. Vẽ 3 Xúc xắc Kết quả nằm ngang (giống 3 thẻ card Boss của OwO)
  const cardWidth = 230;
  const cardHeight = 240;
  const spacingX = 25;
  const startX = 30;
  const startY = 110;

  for (let i = 0; i < results.length; i++) {
    const rolledItem = results[i];
    const itemCfg = ITEM_DRAW_DEFAULTS[rolledItem.id];
    const cardX = startX + i * (cardWidth + spacingX);
    const cardY = startY;

    // Vẽ nền thẻ card
    ctx.fillStyle = "#2b2d31";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12, true, false);

    // Vẽ viền thẻ card tương ứng màu xúc xắc trúng
    ctx.strokeStyle = itemCfg.color;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12, false, true);

    // Dòng chữ XÚC XẮC
    ctx.textAlign = "center";
    ctx.fillStyle = "#b5bac1";
    ctx.font = 'bold 13px "Arial"';
    ctx.fillText(`XÚC XẮC ${i + 1}`, cardX + cardWidth / 2, cardY + 25);

    // Tên con vật to hơn
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 18px "Arial"';
    ctx.fillText(itemCfg.name, cardX + cardWidth / 2, cardY + 48);

    // Vẽ ảnh pixel art
    const img = await getCachedImage(itemCfg.imageFile);
    if (img) {
      ctx.drawImage(img, cardX + (cardWidth - 70) / 2, cardY + 62, 70, 70);
    } else {
      ctx.font = '40px "Arial"';
      ctx.fillText("🎲", cardX + cardWidth / 2, cardY + 110);
    }

    // Vẽ thanh tiến trình giả lập 100% trúng thưởng (giống HP bar của OwO)
    const barX = cardX + 25;
    const barY = cardY + 148;
    const barW = cardWidth - 50;
    const barH = 10;

    ctx.fillStyle = "#111214";
    drawRoundedRect(ctx, barX, barY, barW, barH, 5, true, false);

    ctx.fillStyle = itemCfg.color;
    drawRoundedRect(ctx, barX, barY, barW, barH, 5, true, false);

    ctx.fillStyle = "#4bff4b";
    ctx.font = 'bold 13px "Arial"';
    ctx.fillText("100% TRÚNG", cardX + cardWidth / 2, cardY + 178);

    // Vẽ các icon chỉ số (⚔️, 🛡️, 🧪) để decor giống thẻ boss
    // Đếm xem con này xuất hiện mấy lần trong kết quả
    const count = results.filter((r) => r.id === rolledItem.id).length;
    ctx.fillStyle = "#72767d";
    ctx.font = '12px "Arial"';
    ctx.fillText(`⚔️ x${count} thắng   🛡️ Cực Đẹp   🧪 Trúng lớn`, cardX + cardWidth / 2, cardY + 205);
  }

  // 6. Vẽ bảng xếp hạng trả thưởng (Top 5 Players)
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 20px "RobotoSlab", "Arial"';
  ctx.fillText("Top Players Payout", 30, 395);

  // Vẽ tiêu đề cột bảng
  ctx.fillStyle = "#72767d";
  ctx.font = 'bold 13px "Arial"';
  ctx.fillText("Rank", 50, 428);
  ctx.fillText("Payout", 130, 428);
  ctx.fillText("Player & Details", 270, 428);

  // Vẽ dòng phân cách
  ctx.strokeStyle = "#35363c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 438);
  ctx.lineTo(770, 438);
  ctx.stroke();

  const startTableY = 448;
  const rowHeight = 40;

  if (leaderboard.length === 0) {
    ctx.fillStyle = "#72767d";
    ctx.font = 'italic 15px "Arial"';
    ctx.fillText("Không có người chơi nào tham gia đặt cược.", 30, startTableY + 25);
  } else {
    // Chỉ lấy tối đa top 5 người chơi
    const displayPlayers = leaderboard.slice(0, 5);
    for (let index = 0; index < displayPlayers.length; index++) {
      const p = displayPlayers[index];
      const rowY = startTableY + index * rowHeight;

      // Vẽ nền Rank
      ctx.fillStyle = "#111214";
      drawRoundedRect(ctx, 40, rowY, 35, 28, 6, true, false);
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 13px "Arial"';
      ctx.textAlign = "center";
      ctx.fillText(`${index + 1}`, 57, rowY + 18);

      // Vẽ nền Payout
      ctx.fillStyle = "#111214";
      drawRoundedRect(ctx, 95, rowY, 130, 28, 6, true, false);
      
      const profitSign = p.netProfit >= 0 ? "+" : "";
      ctx.fillStyle = p.netProfit > 0 ? "#4bff4b" : p.netProfit < 0 ? "#ff4b4b" : "#72767d";
      ctx.font = 'bold 13px "Arial"';
      ctx.fillText(`${profitSign}${p.netProfit.toLocaleString()}`, 160, rowY + 18);

      // Vẽ nền Player (giống tag Discord mention)
      ctx.fillStyle = "rgba(88, 101, 242, 0.15)";
      ctx.textAlign = "left";
      
      let displayName = `@${p.username}`;
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 13) + "...";
      }
      
      const nameWidth = ctx.measureText(displayName).width + 20;
      drawRoundedRect(ctx, 240, rowY, nameWidth, 28, 6, true, false);
      
      ctx.fillStyle = "#5865f2";
      ctx.font = 'bold 13px "Arial"';
      ctx.fillText(displayName, 250, rowY + 18);

      // Vẽ chi tiết đặt cược ở sau tag tên
      ctx.fillStyle = "#b5bac1";
      ctx.font = '12px "Arial"';
      ctx.fillText(`(${p.details.join(", ")})`, 250 + nameWidth + 10, rowY + 18);
    }
  }

  // 7. Vẽ mục Thống kê phiên (Rewards style của OwO)
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 20px "RobotoSlab", "Arial"';
  ctx.fillText("Thống Kê Phiên Chơi", 30, 675);

  // Tính các thông số cho Rewards
  let totalBet = 0;
  let totalWinners = 0;
  leaderboard.forEach(p => {
    // Tìm các cược để tính tổng cược
    const userBets = game.bets.get(p.userId) || [];
    totalBet += userBets.reduce((sum, b) => sum + b.amount, 0);
    if (p.netProfit > 0) totalWinners++;
  });

  const rewards = [
    { title: "Tổng Tiền Cược", val: `${totalBet.toLocaleString()} Coke`, emoji: "🪙" },
    { title: "Số Người Thắng", val: `${totalWinners} người chơi`, emoji: "👑" },
    { title: "Xúc Xắc Ra", val: `${results.map(r => ITEM_DRAW_DEFAULTS[r.id].name).join(" - ")}`, emoji: "🎲" },
    { title: "Tổng Người Chơi", val: `${game.bets.size} người chơi`, emoji: "👤" }
  ];

  const rewWidth = 350;
  const rewHeight = 48;
  const rewSpacingX = 40;
  const rewSpacingY = 12;
  const rewStartX = 30;
  const rewStartY = 690;

  for (let idx = 0; idx < rewards.length; idx++) {
    const rew = rewards[idx];
    const col = idx % 2;
    const row = Math.floor(idx / 2);

    const rewX = rewStartX + col * (rewWidth + rewSpacingX);
    const rewY = rewStartY + row * (rewHeight + rewSpacingY);

    // Vẽ nền Box
    ctx.fillStyle = "#2b2d31";
    drawRoundedRect(ctx, rewX, rewY, rewWidth, rewHeight, 8, true, false);

    // Vẽ viền nhạt
    ctx.strokeStyle = "#3f4248";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, rewX, rewY, rewWidth, rewHeight, 8, false, true);

    // Vẽ Emoji đại diện
    ctx.font = '20px "Arial"';
    ctx.fillText(rew.emoji, rewX + 15, rewY + 31);

    // Vẽ nhãn tiêu đề
    ctx.fillStyle = "#72767d";
    ctx.font = 'bold 11px "Arial"';
    ctx.fillText(rew.title.toUpperCase(), rewX + 48, rewY + 19);

    // Vẽ giá trị thực tế
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 13px "Arial"';
    ctx.fillText(rew.val, rewX + 48, rewY + 36);
  }

  const buffer = canvas.toBuffer("image/png");
  return new AttachmentBuilder(buffer, { name: `baucua_result_${game.gameId}.png` });
}

module.exports = {
  drawBettingCanvas,
  drawResultCanvas
};
