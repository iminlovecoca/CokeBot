const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  MessageFlags
} = require("discord.js");
const { createCanvas } = require("canvas");
const path = require("path");
const fs = require("fs");
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
  const radius = 10;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#2F3C4F';
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
  
  ctx.fillStyle = value === 1 || value === 4 ? '#E11D48' : '#0F172A'; // Red for 1/4, dark for others
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
    ctx.fillStyle = '#E11D48';
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
    ctx.fillStyle = '#E11D48';
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

// Generate the final result Canvas PNG
function drawTaixiuResult(dice, outcome) {
  const canvas = createCanvas(500, 160);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0F172A'; // Premium Slate-900 background
  ctx.fillRect(0, 0, 500, 160);
  
  // Draw dice
  const diceSize = 75;
  const startX = 30;
  const startY = 42;
  const spacing = 95;
  
  for (let i = 0; i < dice.length; i++) {
    drawDie(ctx, startX + i * spacing, startY, diceSize, dice[i]);
  }
  
  // Draw vertical separator
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(330, 20);
  ctx.lineTo(330, 140);
  ctx.stroke();
  
  const total = dice.reduce((a, b) => a + b, 0);
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px "Arial"';
  ctx.fillText('TỔNG ĐIỂM', 360, 48);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Arial"';
  ctx.fillText(total.toString(), 360, 88);
  
  // Draw Outcome Badge
  ctx.save();
  const badgeX = 360;
  const badgeY = 104;
  const badgeW = 115;
  const badgeH = 34;
  const radius = 6;
  
  ctx.fillStyle = outcome === 'tai' ? '#E11D48' : '#2563EB'; // Red for Tai, Blue for Xiu
  ctx.beginPath();
  ctx.moveTo(badgeX + radius, badgeY);
  ctx.lineTo(badgeX + badgeW - radius, badgeY);
  ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + radius);
  ctx.lineTo(badgeX + badgeW, badgeY + badgeH - radius);
  ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - radius, badgeY + badgeH);
  ctx.lineTo(badgeX + radius, badgeY + badgeH);
  ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - radius);
  ctx.lineTo(badgeX, badgeY + radius);
  ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px "Arial"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(outcome === 'tai' ? '🐉 TÀI' : '🐢 XỈU', badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.restore();
  
  return canvas.toBuffer('image/png');
}

// Render the entire game room payload
function renderTaixiuRoom(state, resultBuffer = null) {
  const round = state.round;
  const status = state.status;
  const countdown = state.countdown;
  const taiPool = state.taiPool;
  const xiuPool = state.xiuPool;
  
  const playersTaiCount = state.playersTai ? state.playersTai.size : 0;
  const playersXiuCount = state.playersXiu ? state.playersXiu.size : 0;
  
  // Format history to emojis
  const historyList = (state.history || []).slice(-15);
  const historyStr = historyList.map(h => h === 'tai' ? '🔴' : '⚪').join(' ') || 'Chưa có dữ liệu';
  
  let titleText = `🎲 **COKE CASINO — TÀI XỈU**  |  *Vòng #${round}*`;
  let timeStr = "";
  
  if (status === 'betting') {
    timeStr = `⌛ Thời gian cược còn lại: **${countdown} giây**`;
  } else if (status === 'rolling') {
    timeStr = `🎰 **Đang lắc bát... Vui lòng đợi kết quả!**`;
  } else {
    timeStr = `🏁 **Vòng kết thúc! Chuẩn bị vòng mới...**`;
  }
  
  const contentLines = [
    titleText,
    timeStr,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔴 **🐉 TÀI (11-17)**`,
    `👤 Người chơi: \`${playersTaiCount.toLocaleString()}\`  |  💰 Tổng cược: \`${taiPool.toLocaleString()}\` coke`,
    `━━━━━━━━━━━━`,
    `⚪ **🐢 XỈU (4-10)**`,
    `👤 Người chơi: \`${playersXiuCount.toLocaleString()}\`  |  💰 Tổng cược: \`${xiuPool.toLocaleString()}\` coke`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 **Lịch sử gần đây:** ${historyStr}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`
  ];

  const payload = {
    content: contentLines.join('\n'),
    embeds: [],
    components: []
  };

  // Add Action buttons
  const isBettings = status === 'betting';
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('taixiu_bet_tai')
      .setLabel('Bet Tài')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_bet_xiu')
      .setLabel('Bet Xỉu')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_bet_amount')
      .setLabel('Đặt mức cược 💰')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_history')
      .setLabel('Xem Lịch Sử 📜')
      .setStyle(ButtonStyle.Secondary)
  );

  payload.components = [row];

  // Set visual attachment
  if (status === 'result' && resultBuffer) {
    payload.files = [new AttachmentBuilder(resultBuffer, { name: 'result.png' })];
    // Attachments will show automatically in channel as images
  } else {
    // Show the infinite dice rolling GIF using normal embed/file or just linking to it
    // To make it look extremely premium, we can add it as a link inside message content or simple embed
    payload.embeds = [{
      image: { url: 'https://i.imgur.com/x0c7g78.gif' },
      color: 0x0F172A
    }];
  }

  return payload;
}

// Edit the casino room message safely
async function updateRoomMessage(client, state, resultBuffer = null) {
  try {
    const channel = await client.channels.fetch(state.channelId).catch(() => null);
    if (!channel) return;
    
    let msg = null;
    if (state.messageId) {
      msg = await channel.messages.fetch(state.messageId).catch(() => null);
    }
    
    const payload = renderTaixiuRoom(state, resultBuffer);
    
    if (msg) {
      // Clear previous files if status transitioned back
      if (state.status !== 'result') {
        payload.files = [];
      }
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

  let updateCooldown = 0;

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
          // Switch to result and roll the dice
          const d1 = Math.floor(Math.random() * 6) + 1;
          const d2 = Math.floor(Math.random() * 6) + 1;
          const d3 = Math.floor(Math.random() * 6) + 1;
          const total = d1 + d2 + d3;
          const outcome = total >= 11 ? 'tai' : 'xiu';

          state.lastRoll = [d1, d2, d3];
          state.status = 'result';
          state.countdown = 5;
          state.history.push(outcome);
          if (state.history.length > 100) {
            state.history.shift(); // prune history
          }
          
          // Distribute payouts
          const winningPool = outcome === 'tai' ? state.taiPool : state.xiuPool;
          const winnersMap = outcome === 'tai' ? state.playersTai : state.playersXiu;
          
          const payoutPromises = [];
          for (const [userId, betAmt] of winnersMap.entries()) {
            // Payout: Double the bet amount (x2 return)
            payoutPromises.push(incBalance(userId, betAmt * 2));
          }
          await Promise.all(payoutPromises).catch(console.error);

          // Clear active state pools
          const resultBuffer = drawTaixiuResult(state.lastRoll, outcome);
          
          await state.save();
          await updateRoomMessage(client, state, resultBuffer);

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
            .setLabel("Số Coke muốn cược (ví dụ: 10000, 250000)")
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
          const formatted = list.map(h => h === 'tai' ? '🔴 Tài' : '⚪ Xỉu').join(' → ');
          await interaction.reply({
            content: `📊 **Lịch sử 20 vòng gần nhất:**\n${formatted || "Chưa có vòng đấu nào diễn ra."}`,
            ephemeral: true
          }).catch(() => {});
          return;
        }

        if (cid === "taixiu_bet_tai" || cid === "taixiu_bet_xiu") {
          await interaction.deferReply({ ephemeral: true }).catch(() => {});

          if (state.status !== "betting") {
            return interaction.editReply({ content: "❌ Vòng cược đã đóng! Hãy đợi vòng sau." }).catch(() => {});
          }

          const amt = pendingBets.get(userId) || 0;
          if (amt <= 0) {
            return interaction.editReply({ content: "❌ Bạn chưa chọn mức cược! Hãy bấm nút **Đặt mức cược 💰** trước." }).catch(() => {});
          }

          // Validate balance
          const userDoc = await User.findOne({ userId });
          if (!userDoc || userDoc.coke < amt) {
            return interaction.editReply({ content: `❌ Số dư Coke hiện có không đủ để cược **${amt.toLocaleString()}**!` }).catch(() => {});
          }

          const side = cid === "taixiu_bet_tai" ? "tai" : "xiu";
          
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
            return interaction.editReply({ content: "❌ Lỗi hệ thống khi ghi nhận cược. Thử lại!" }).catch(() => {});
          }

          await interaction.editReply({ content: `✅ Đã đặt cược thành công **${amt.toLocaleString()}** coke vào cửa **${side === 'tai' ? '🐉 TÀI' : '🐢 XỈU'}**!` }).catch(() => {});
          
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
