const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  MessageFlags,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require("discord.js");
const { createCanvas } = require("canvas");
const TaixiuState = require("../models/TaixiuState");
const User = require("../models/User");
const config = require("../data/config");
const { runTransactionWithRetry } = require("../utils/miscUtil");
const { incBalance } = require("../utils/userUtil");

// In-memory cache for pending bet amounts (key: userId, value: bet amount)
const pendingBets = new Map();

// Track active timers per channelId
const activeGames = new Map();

// Custom dice drawing helper
function drawDie(ctx, x, y, size, value) {
  const radius = 6;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + size - radius, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
  ctx.lineTo(x + size, y + size - radius);
  ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
  ctx.lineTo(x + radius, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = value === 1 || value === 4 ? '#DC2626' : '#0F172A'; // Red for 1/4, dark for others
  const cx = x + size / 2;
  const cy = y + size / 2;
  const dotRadius = size * 0.08;
  const offset = size * 0.22;
  
  const drawDot = (dx, dy) => {
    ctx.beginPath();
    ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  };
  
  if (value === 1) {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(cx, cy, dotRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (value === 2) {
    drawDot(cx - offset, cy - offset);
    drawDot(cx + offset, cy + offset);
  } else if (value === 3) {
    drawDot(cx - offset, cy - offset);
    drawDot(cx, cy);
    drawDot(cx + offset, cy + offset);
  } else if (value === 4) {
    ctx.fillStyle = '#DC2626';
    drawDot(cx - offset, cy - offset);
    drawDot(cx + offset, cy - offset);
    drawDot(cx - offset, cy + offset);
    drawDot(cx + offset, cy + offset);
  } else if (value === 5) {
    drawDot(cx - offset, cy - offset);
    drawDot(cx + offset, cy - offset);
    drawDot(cx, cy);
    drawDot(cx - offset, cy + offset);
    drawDot(cx + offset, cy + offset);
  } else if (value === 6) {
    drawDot(cx - offset, cy - offset);
    drawDot(cx + offset, cy - offset);
    drawDot(cx - offset, cy);
    drawDot(cx + offset, cy);
    drawDot(cx - offset, cy + offset);
    drawDot(cx + offset, cy + offset);
  }
  ctx.restore();
}

// Draw a beautiful casino chip vector on Canvas
function drawChip(ctx, x, y, radius, label) {
  ctx.save();
  // Outer circle
  ctx.fillStyle = '#F59E0B'; // Gold outer
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Dashed inner border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.arc(x, y, radius - 3, 0, Math.PI * 2);
  ctx.stroke();
  
  // Inner circle
  ctx.fillStyle = '#059669'; // Emerald Green
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Text label
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px "Arial"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

// Draw percentage capsule bar
function drawCapsule(ctx, x, y, width, height, text, isTai) {
  ctx.save();
  const radius = height / 2;
  
  // Capsule Background
  ctx.fillStyle = '#022C22';
  ctx.beginPath();
  ctx.arc(x - width / 2 + radius, y, radius, Math.PI * 0.5, Math.PI * 1.5);
  ctx.lineTo(x + width / 2 - radius, y - radius);
  ctx.arc(x + width / 2 - radius, y, radius, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
  
  // Stroke border
  ctx.strokeStyle = isTai ? '#EF4444' : '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Text
  ctx.fillStyle = isTai ? '#EF4444' : '#FFFFFF';
  ctx.font = 'bold 14px "Arial"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  
  ctx.restore();
}

// Generate the fully visual game board Canvas (Premium Dark Green theme - Scaled up for readability)
function drawTaixiuBoard(state) {
  const canvas = createCanvas(800, 500);
  const ctx = canvas.getContext('2d');
  
  // 1. Background (Dark Royal Green Felt)
  const gradBg = ctx.createRadialGradient(400, 250, 80, 400, 250, 500);
  gradBg.addColorStop(0, '#064E3B');
  gradBg.addColorStop(1, '#022C22');
  ctx.fillStyle = gradBg;
  ctx.fillRect(0, 0, 800, 500);
  
  // Gold Ornate Outer Border
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 784, 484);
  
  ctx.strokeStyle = '#EAB308';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(13, 13, 774, 474);
  
  // Top Title Plate "TÀI XỈU"
  ctx.save();
  ctx.fillStyle = '#022C22';
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 13);
  ctx.lineTo(340, 53);
  ctx.lineTo(460, 53);
  ctx.lineTo(500, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = '#F59E0B'; // Rich Gold Title
  ctx.font = 'bold 24px "Arial"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TÀI XỈU', 400, 33);
  ctx.restore();
  
  const status = state.status;
  const taiPool = state.taiPool || 0;
  const xiuPool = state.xiuPool || 0;
  const totalPool = taiPool + xiuPool;
  
  // Players counts
  const playersTai = state.playersTai ? state.playersTai.size : 0;
  const playersXiu = state.playersXiu ? state.playersXiu.size : 0;
  
  // Ratios
  let rTai = 0.5;
  let rXiu = 0.5;
  if (totalPool > 0) {
    rTai = taiPool / totalPool;
    rXiu = xiuPool / totalPool;
  }
  
  // ── LEFT PANEL (TÀI) ──
  ctx.save();
  // Draw Dragon circular shield badge
  const cxDragon = 110;
  const cyDragon = 145;
  const gradDragon = ctx.createRadialGradient(cxDragon, cyDragon, 5, cxDragon, cyDragon, 45);
  gradDragon.addColorStop(0, '#EF4444');
  gradDragon.addColorStop(1, '#7F1D1D');
  ctx.fillStyle = gradDragon;
  ctx.beginPath();
  ctx.arc(cxDragon, cyDragon, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  
  // Abstract Gold Dragon emblem shape inside
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cxDragon, cyDragon + 5, 18, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cxDragon, cyDragon - 12);
  ctx.lineTo(cxDragon - 8, cyDragon + 8);
  ctx.lineTo(cxDragon + 8, cyDragon + 8);
  ctx.closePath();
  ctx.fillStyle = '#F59E0B';
  ctx.fill();
  
  // Text Title (Bigger and bold)
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 42px "Arial"';
  ctx.fillText('TÀI', 170, 140);
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px "Arial"';
  ctx.fillText(`👤 ${playersTai} NGƯỜI`, 170, 175);
  
  // Bet labels
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px "Arial"';
  ctx.fillText('TỔNG ĐẶT CƯỢC', 65, 230);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px "Arial"';
  const taiStr = taiPool.toLocaleString();
  ctx.fillText(taiStr, 65, 270);
  drawChip(ctx, 65 + ctx.measureText(taiStr).width + 18, 262, 11, 'C');
  
  // Percentage Capsule
  const pctTai = totalPool > 0 ? Math.round(rTai * 100) : 50;
  drawCapsule(ctx, 180, 325, 180, 34, `${pctTai}%`, true);
  ctx.restore();
  
  // ── RIGHT PANEL (XỈU) ──
  ctx.save();
  // Draw Turtle circular shield badge
  const cxTurtle = 690;
  const cyTurtle = 145;
  const gradTurtle = ctx.createRadialGradient(cxTurtle, cyTurtle, 5, cxTurtle, cyTurtle, 45);
  gradTurtle.addColorStop(0, '#CBD5E1');
  gradTurtle.addColorStop(1, '#334155');
  ctx.fillStyle = gradTurtle;
  ctx.beginPath();
  ctx.arc(cxTurtle, cyTurtle, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  
  // Draw Turtle Shell Hexagon inside
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  const rT = 22;
  ctx.beginPath();
  for (let a = 0; a < 6; a++) {
    const angle = (a * Math.PI) / 3;
    const hx = cxTurtle + Math.cos(angle) * rT;
    const hy = cyTurtle + Math.sin(angle) * rT;
    if (a === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
  for (let a = 0; a < 6; a++) {
    const angle = (a * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cxTurtle + Math.cos(angle) * rT, cyTurtle + Math.sin(angle) * rT);
    ctx.lineTo(cxTurtle + Math.cos(angle) * 36, cyTurtle + Math.sin(angle) * 36);
    ctx.stroke();
  }
  
  // Text Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px "Arial"';
  ctx.textAlign = 'right';
  ctx.fillText('XỈU', 630, 140);
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px "Arial"';
  ctx.fillText(`👤 ${playersXiu} NGƯỜI`, 630, 175);
  
  // Bet labels
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px "Arial"';
  ctx.fillText('TỔNG ĐẶT CƯỢC', 530, 230);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px "Arial"';
  const xiuStr = xiuPool.toLocaleString();
  ctx.fillText(xiuStr, 530, 270);
  drawChip(ctx, 530 + ctx.measureText(xiuStr).width + 18, 262, 11, 'C');
  
  // Percentage Capsule
  const pctXiu = totalPool > 0 ? Math.round(rXiu * 100) : 50;
  drawCapsule(ctx, 620, 325, 180, 34, `${pctXiu}%`, false);
  ctx.restore();
  
  // ── CENTER PANEL (Countdown / Dice / Status) ──
  ctx.save();
  // Ornate Gold arch box
  ctx.fillStyle = '#022C22';
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  const boxX = 310;
  const boxY = 85;
  const boxW = 180;
  const boxH = 190;
  const rB = 12;
  ctx.beginPath();
  ctx.moveTo(boxX + rB, boxY);
  ctx.lineTo(boxX + boxW - rB, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + rB);
  ctx.lineTo(boxX + boxW, boxY + boxH - rB);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - rB, boxY + boxH);
  ctx.lineTo(boxX + rB, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - rB);
  ctx.lineTo(boxX, boxY + rB);
  ctx.quadraticCurveTo(boxX, boxY, boxX + rB, boxY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Round text
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px "Arial"';
  ctx.fillText(`VÒNG #${state.round}`, 400, 110);
  
  if (status === 'betting') {
    ctx.fillStyle = '#F59E0B'; // Gold
    ctx.font = 'bold 56px "Arial"';
    ctx.fillText(`${state.countdown}s`, 400, 165);
    
    // Status capsule "ĐANG NHẬN CƯỢC"
    drawCapsule(ctx, 400, 235, 150, 30, 'ĐANG NHẬN CƯỢC', false);
  } else if (status === 'rolling') {
    ctx.fillStyle = '#60A5FA'; // Light Blue
    ctx.font = 'bold 26px "Arial"';
    ctx.fillText('LẮC BÁT...', 400, 165);
    
    drawCapsule(ctx, 400, 235, 150, 30, 'ĐANG LẮC...', false);
  } else if (status === 'result') {
    // Draw dice inside the center box
    const dice = state.lastRoll || [1, 2, 3];
    const dSize = 44;
    const startDiceX = 400 - (3 * dSize + 2 * 8) / 2;
    const diceY = 135;
    
    for (let i = 0; i < dice.length; i++) {
      drawDie(ctx, startDiceX + i * (dSize + 8), diceY, dSize, dice[i]);
    }
    
    const d1 = dice[0];
    const d2 = dice[1];
    const d3 = dice[2];
    const isBao = (d1 === d2 && d2 === d3);
    const total = dice.reduce((a, b) => a + b, 0);
    const outcome = isBao ? 'bao' : (total >= 11 ? 'tai' : 'xiu');
    
    if (outcome === 'bao') {
      drawCapsule(ctx, 400, 235, 150, 30, 'BÃO 💥', false);
    } else {
      drawCapsule(ctx, 400, 235, 150, 30, outcome === 'tai' ? '🐉 TÀI' : '🐢 XỈU', outcome === 'tai');
    }
  }
  
  // TỔNG POOL (Below center box)
  ctx.fillStyle = '#022C22';
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2;
  const poolX = 310;
  const poolY = 285;
  const poolW = 180;
  const poolH = 45;
  ctx.beginPath();
  ctx.moveTo(poolX + 8, poolY);
  ctx.lineTo(poolX + poolW - 8, poolY);
  ctx.quadraticCurveTo(poolX + poolW, poolY, poolX + poolW, poolY + 8);
  ctx.lineTo(poolX + poolW, poolY + poolH - 8);
  ctx.quadraticCurveTo(poolX + poolW, poolY + poolH, poolX + poolW - 8, poolY + poolH);
  ctx.lineTo(poolX + 8, poolY + poolH);
  ctx.quadraticCurveTo(poolX, poolY + poolH, poolX, poolY + poolH - 8);
  ctx.lineTo(poolX, poolY + 8);
  ctx.quadraticCurveTo(poolX, poolY, poolX + 8, poolY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 13px "Arial"';
  ctx.fillText('TỔNG POOL', 400, 298);
  
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 20px "Arial"';
  ctx.fillText(`${totalPool.toLocaleString()}`, 400, 317);
  ctx.restore();
  
  // ── 4. HISTORY PANEL (Bottom) ──
  ctx.save();
  ctx.strokeStyle = '#064E3B';
  ctx.fillStyle = '#022C22';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 375, 740, 100);
  ctx.fillRect(30, 375, 740, 100);
  
  ctx.strokeStyle = '#D97706';
  ctx.strokeRect(33, 378, 734, 94);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 16px "Arial"';
  ctx.fillText('LỊCH SỬ KẾT QUẢ', 400, 395);
  
  // Draw beads
  const historyList = (state.history || []).slice(-15);
  const beadSpacing = 40;
  const startBeadX = 400 - ((historyList.length - 1) * beadSpacing) / 2;
  const beadY = 438;
  
  for (let i = 0; i < historyList.length; i++) {
    const h = historyList[i];
    const bx = startBeadX + i * beadSpacing;
    
    ctx.beginPath();
    ctx.arc(bx, beadY, 12, 0, Math.PI * 2);
    
    if (h === 'tai') {
      ctx.fillStyle = '#EF4444'; // Red circle for Tài
      ctx.fill();
      ctx.strokeStyle = '#7F1D1D';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (h === 'bao') {
      ctx.fillStyle = '#F59E0B'; // Gold circle for Bão
      ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF'; // White circle for Xỉu
      ctx.fill();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
  
  return canvas.toBuffer('image/png');
}

// Render the entire game room payload using V2 Container manually
function renderTaixiuRoom(state, boardBuffer) {
  const round = state.round;
  
  // Format history: Tai = ⚫, Xiu = ⚪, Bao = 🔵 (Blue dot for triple)
  const historyList = (state.history || []).slice(-15);
  const historyStr = historyList.map(h => h === 'tai' ? '⚫' : h === 'bao' ? '🔵' : '⚪').join(' ') || 'Chưa có dữ liệu';

  // Get Coke Money Emoji
  const cokeEmoji = config.emoji.money || "🪙";

  const headerText = `${cokeEmoji} **COKE CASINO — TÀI XỈU**  |  *Vòng #${round}*\n\n` +
                     `📊 **Lịch sử gần đây:**\n\n${historyStr}\n\u200b`; // added \u200b (blank line spacing)
  
  const textHeader = new TextDisplayBuilder().setContent(headerText);
  
  // Use a unique name for the board attachment to bypass Discord's CDN cache
  const imageName = `board_${Date.now()}.png`;
  
  const gallery = new MediaGalleryBuilder()
    .addItems(new MediaGalleryItemBuilder().setURL(`attachment://${imageName}`));

  const container = new ContainerBuilder()
    .setAccentColor(state.status === 'result' ? 0x10B981 : 0x8E9AA7) // Green for result, Grey for betting/rolling
    .addTextDisplayComponents(textHeader)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addMediaGalleryComponents(gallery);

  // Add Action buttons
  const isBettings = state.status === 'betting';
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('taixiu_bet_tai')
      .setLabel('TÀI')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_bet_xiu')
      .setLabel('XỈU')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_bet_amount')
      .setLabel('Tuỳ chọn')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_history')
      .setLabel('Xem Lịch Sử 📜')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('taixiu_quick_10k')
      .setLabel('10K 🪙')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_quick_50k')
      .setLabel('50K 🪙')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_quick_100k')
      .setLabel('100K 🪙')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_quick_250k')
      .setLabel('250K 🪙')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isBettings)
  );

  container.addActionRowComponents(row);
  container.addActionRowComponents(row2);

  const payload = {
    embeds: [],
    components: [container],
    files: [new AttachmentBuilder(boardBuffer, { name: imageName })],
    flags: MessageFlags.IsComponentsV2,
    skipV2: true // CRITICAL: Skip v2Converter so it does not corrupt our pre-built V2 layout!
  };

  return payload;
}

// Edit the casino room message safely
async function updateRoomMessage(client, state) {
  try {
    const channel = await client.channels.fetch(state.channelId).catch(() => null);
    if (!channel) return;
    
    let msg = null;
    if (state.messageId) {
      msg = await channel.messages.fetch(state.messageId).catch(() => null);
    }
    
    const boardBuffer = drawTaixiuBoard(state);
    const payload = renderTaixiuRoom(state, boardBuffer);
    
    if (msg) {
      await msg.edit(payload).catch(console.error);
    } else {
      const newMsg = await channel.send(payload).catch(console.error);
      if (newMsg) {
        state.messageId = newMsg.id;
        await state.save();
      }
    }
  } catch (err) {
    console.error("Lỗi khi cập nhật phòng Tài Xỉu:", err);
  }
}

// Start/Resume the game loop for a channel
function startTaixiuLoop(client, channelId) {
  if (activeGames.has(channelId)) {
    clearInterval(activeGames.get(channelId));
  }

  const intervalId = setInterval(async () => {
    try {
      const state = await TaixiuState.findOne({ channelId });
      if (!state) return;

      // Handle states
      if (state.status === 'betting') {
        state.countdown -= 1;
        
        let needsUpdate = false;
        if (state.countdown <= 0) {
          state.status = 'rolling';
          state.countdown = 5;
          needsUpdate = true;
        } else {
          // Rule: Countdown only updates every 5 seconds (60, 55, 50...)
          // Except for the last 10 seconds: updates every second
          if (state.countdown <= 10) {
            needsUpdate = true;
          } else if (state.countdown % 5 === 0) {
            needsUpdate = true;
          }
        }

        await state.save();
        if (needsUpdate) {
          await updateRoomMessage(client, state);
        }

      } else if (state.status === 'rolling') {
        state.countdown -= 1;
        if (state.countdown <= 0) {
          // Roll dice with House Control algorithm (anti-streak, pool-balancing)
          const getOutcomeOf = (r1, r2, r3) => {
            if (r1 === r2 && r2 === r3) return 'bao';
            const sum = r1 + r2 + r3;
            return sum >= 11 ? 'tai' : 'xiu';
          };

          const taiPool = state.taiPool || 0;
          const xiuPool = state.xiuPool || 0;
          
          let d1 = Math.floor(Math.random() * 6) + 1;
          let d2 = Math.floor(Math.random() * 6) + 1;
          let d3 = Math.floor(Math.random() * 6) + 1;
          let isBao = (d1 === d2 && d2 === d3);
          let total = d1 + d2 + d3;
          let outcome = isBao ? 'bao' : (total >= 11 ? 'tai' : 'xiu');

          let targetOutcome = null;
          const diff = Math.abs(taiPool - xiuPool);
          
          // Pool imbalance protection: target the side with LESS money (or Bão) 58% of the time if difference > 10,000
          if (diff > 10000 && Math.random() < 0.58) {
            targetOutcome = taiPool > xiuPool ? 'xiu' : 'tai';
          }
          
          // Anti-streak protection: break streaks of 5+ of the same outcome 65% of the time
          const history = state.history || [];
          if (history.length >= 5) {
            const last5 = history.slice(-5);
            const allTai = last5.every(h => h === 'tai');
            const allXiu = last5.every(h => h === 'xiu');
            
            if (allTai && Math.random() < 0.65) {
              targetOutcome = 'xiu';
            } else if (allXiu && Math.random() < 0.65) {
              targetOutcome = 'tai';
            }
          }

          if (targetOutcome && outcome !== targetOutcome) {
            for (let attempt = 0; attempt < 30; attempt++) {
              const rd1 = Math.floor(Math.random() * 6) + 1;
              const rd2 = Math.floor(Math.random() * 6) + 1;
              const rd3 = Math.floor(Math.random() * 6) + 1;
              const newOutcome = getOutcomeOf(rd1, rd2, rd3);
              if (newOutcome === targetOutcome || newOutcome === 'bao') {
                d1 = rd1;
                d2 = rd2;
                d3 = rd3;
                isBao = (d1 === d2 && d2 === d3);
                total = d1 + d2 + d3;
                outcome = newOutcome;
                break;
              }
            }
          }

          state.lastRoll = [d1, d2, d3];
          state.status = 'result';
          state.countdown = 5;
          state.history.push(outcome);
          if (state.history.length > 100) {
            state.history.shift(); // prune history
          }
          
          // Distribute payouts: If outcome is 'bao', nobody wins (house takes all)
          if (outcome !== 'bao') {
            const winnersMap = outcome === 'tai' ? state.playersTai : state.playersXiu;
            
            const payoutPromises = [];
            for (const [userId, betAmt] of winnersMap.entries()) {
              // Payout: Double the bet amount (x2 return)
              payoutPromises.push(incBalance(userId, betAmt * 2));
            }
            await Promise.all(payoutPromises).catch(console.error);
          }

          await state.save();
          await updateRoomMessage(client, state);

        } else {
          await state.save();
        }

      } else if (state.status === 'result') {
        state.countdown -= 1;
        if (state.countdown <= 0) {
          // Start next round
          state.status = 'betting';
          state.countdown = 60;
          state.taiPool = 0;
          state.xiuPool = 0;
          state.playersTai = new Map();
          state.playersXiu = new Map();
          state.round += 1;
          
          await state.save();
          await updateRoomMessage(client, state);
        } else {
          await state.save();
        }
      }

    } catch (err) {
      console.error("Lỗi trong vòng lặp game Tài Xỉu:", err);
    }
  }, 1000);

  activeGames.set(channelId, intervalId);
}

// Initializer called on Client Ready
async function initializeTaixiu(client) {
  const rooms = await TaixiuState.find({});
  console.log(`🎰 Khởi tạo ${rooms.length} phòng Tài Xỉu hoạt động 24/7...`);
  
  for (const room of rooms) {
    startTaixiuLoop(client, room.channelId);
  }

  // Set up global interactionCreate listener
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isButton()) {
        const cid = interaction.customId;
        if (!cid.startsWith("taixiu_")) return;

        const userId = interaction.user.id;
        const channelId = interaction.channelId;

        const state = await TaixiuState.findOne({ channelId });
        if (!state) return;

        if (cid === "taixiu_bet_amount") {
          // Show enter bet amount Modal
          const modal = new ModalBuilder()
            .setCustomId("taixiu_modal_amount")
            .setTitle("Nhập Số Tiền Cược Tài Xỉu");

          const amountInput = new TextInputBuilder()
            .setCustomId("taixiu_amount_input")
            .setLabel("Số Coke cược (Tối đa: 250,000)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Nhập số nguyên dương...")
            .setRequired(true);

          const row = new ActionRowBuilder().addComponents(amountInput);
          modal.addComponents(row);
          
          await interaction.showModal(modal).catch(() => {});
          return;
        }

        if (cid === "taixiu_history") {
          const list = (state.history || []).slice(-20);
          const formatted = list.map(h => h === 'tai' ? '⚫ Tài' : h === 'bao' ? '🔵 Bão' : '⚪ Xỉu').join(' → ');
          await interaction.reply({
            content: `📊 **Lịch sử 20 vòng gần nhất:**\n${formatted || "Chưa có vòng đấu nào diễn ra."}`,
            ephemeral: true
          }).catch(() => {});
          return;
        }

        if (cid.startsWith("taixiu_quick_")) {
          const rawAmt = cid.replace("taixiu_quick_", "");
          let amount = 0;
          if (rawAmt === "10k") amount = 10000;
          else if (rawAmt === "50k") amount = 50000;
          else if (rawAmt === "100k") amount = 100000;
          else if (rawAmt === "250k") amount = 250000;
          
          if (amount <= 0) return;

          // Balance check
          const userDoc = await User.findOne({ userId });
          if (!userDoc || userDoc.coke < amount) {
            return interaction.reply({ content: `❌ Số dư Coke hiện có không đủ để cược **${amount.toLocaleString()}**!`, ephemeral: true }).catch(() => {});
          }

          pendingBets.set(userId, amount);
          await interaction.reply({
            content: `💵 Đã thiết lập mức cược nhanh: **${amount.toLocaleString()}** coke.\nNhấn nút **Bet Tài** hoặc **Bet Xỉu** để đặt cược!`,
            ephemeral: true
          }).catch(() => {});
          return;
        }

        if (cid === "taixiu_bet_tai" || cid === "taixiu_bet_xiu") {
          await interaction.deferUpdate().catch(() => {});

          if (state.status !== "betting") {
            return;
          }

          const amt = pendingBets.get(userId) || 0;
          if (amt <= 0) {
            return interaction.followUp({
              content: "❌ Bạn chưa chọn mức cược! Hãy bấm nút **Đặt mức cược 💰** hoặc các nút cược nhanh ở dưới.",
              ephemeral: true
            }).catch(() => {});
          }

          if (amt > 250000) {
            return interaction.followUp({
              content: "❌ Mức cược tối đa là **250,000** coke!",
              ephemeral: true
            }).catch(() => {});
          }

          const side = cid === "taixiu_bet_tai" ? "tai" : "xiu";
          const currentBet = (side === "tai" ? state.playersTai.get(userId) : state.playersXiu.get(userId)) || 0;
          
          if (currentBet + amt > 250000) {
            const maxAllowed = 250000 - currentBet;
            if (maxAllowed <= 0) {
              return interaction.followUp({
                content: `❌ Bạn đã đặt tối đa **250,000** coke cho cửa này ở vòng này rồi!`,
                ephemeral: true
              }).catch(() => {});
            } else {
              return interaction.followUp({
                content: `❌ Bạn chỉ có thể đặt thêm tối đa **${maxAllowed.toLocaleString()}** coke cho cửa này (Tổng giới hạn 250K mỗi bên)!`,
                ephemeral: true
              }).catch(() => {});
            }
          }

          // Validate balance
          const userDoc = await User.findOne({ userId });
          if (!userDoc || userDoc.coke < amt) {
            return interaction.followUp({
              content: `❌ Số dư Coke hiện có không đủ để cược **${amt.toLocaleString()}**!`,
              ephemeral: true
            }).catch(() => {});
          }
          
          // Deduct balance and update state
          try {
            const betTxn = async (session) => {
              await User.updateOne({ userId }, { $inc: { coke: -amt } }).session(session);
              
              if (side === "tai") {
                const prev = state.playersTai.get(userId) || 0;
                state.playersTai.set(userId, prev + amt);
                state.taiPool += amt;
              } else {
                const prev = state.playersXiu.get(userId) || 0;
                state.playersXiu.set(userId, prev + amt);
                state.xiuPool += amt;
              }
              state.markModified("playersTai");
              state.markModified("playersXiu");
              await state.save({ session });
            };
            await runTransactionWithRetry(betTxn);
          } catch (err) {
            console.error("Giao dịch đặt cược Tài Xỉu lỗi:", err);
            return;
          }
          
          // Immediately update message to show new bet pools
          await updateRoomMessage(client, state);
          return;
        }
      }

      if (interaction.isModalSubmit()) {
        const cid = interaction.customId;
        if (cid === "taixiu_modal_amount") {
          const userId = interaction.user.id;
          const inputStr = interaction.fields.getTextInputValue("taixiu_amount_input").trim();
          const amount = parseInt(inputStr.replace(/,/g, ''));
          
          if (isNaN(amount) || amount <= 0) {
            return interaction.reply({ content: "❌ Số tiền cược không hợp lệ! Vui lòng nhập số nguyên dương.", ephemeral: true }).catch(() => {});
          }

          if (amount > 250000) {
            return interaction.reply({ content: "❌ Mức cược tối đa là **250,000** coke một lần!", ephemeral: true }).catch(() => {});
          }

          // Balance check
          const userDoc = await User.findOne({ userId });
          if (!userDoc || userDoc.coke < amount) {
            return interaction.reply({ content: `❌ Số dư Coke hiện có không đủ để cược **${amount.toLocaleString()}**!`, ephemeral: true }).catch(() => {});
          }

          pendingBets.set(userId, amount);
          await interaction.reply({
            content: `💵 Đã thiết lập mức cược: **${amount.toLocaleString()}** coke.\nNhấn nút **Bet Tài** hoặc **Bet Xỉu** để chính thức đặt cược!`,
            ephemeral: true
          }).catch(() => {});
          return;
        }
      }
    } catch (interErr) {
      console.error("Lỗi khi xử lý tương tác Tài Xỉu:", interErr);
    }
  });
}

module.exports = {
  initializeTaixiu,
  startTaixiuLoop
};
