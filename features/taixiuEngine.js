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
  EmbedBuilder
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
  ctx.strokeStyle = '#475569';
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

// Generate the fully visual game board Canvas
function drawTaixiuBoard(state) {
  const canvas = createCanvas(600, 180);
  const ctx = canvas.getContext('2d');
  
  // Background (Premium Light Slate)
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, 600, 180);
  
  // Border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, 590, 170);
  
  const status = state.status;
  const taiPool = state.taiPool || 0;
  const xiuPool = state.xiuPool || 0;
  const totalPool = taiPool + xiuPool;
  
  // Calculate ratios
  let rTai = 0.5;
  let rXiu = 0.5;
  if (totalPool > 0) {
    rTai = taiPool / totalPool;
    rXiu = xiuPool / totalPool;
  }
  
  // 1. TÀI Section (Left) - Color: Black/Dark Slate
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 26px "Arial"';
  ctx.fillText('TÀI', 65, 45);
  
  // Draw Black Circle Indicator next to TÀI
  ctx.beginPath();
  ctx.arc(38, 36, 10, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#475569';
  ctx.font = '13px "Arial"';
  ctx.fillText('TỔNG ĐẶT CƯỢC', 30, 75);
  
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "Arial"';
  ctx.fillText(`${taiPool.toLocaleString()} coke`, 30, 105);
  
  // Tai Pool Bar (Dark Slate)
  ctx.fillStyle = '#E2E8F0'; // Bar background
  ctx.fillRect(30, 125, 200, 18);
  ctx.fillStyle = '#0F172A'; // Dark slate bar fill
  ctx.fillRect(30, 125, Math.floor(rTai * 200), 18);
  
  // 2. XỈU Section (Right) - Color: Dark Slate with White Dot
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 26px "Arial"';
  ctx.fillText('XỈU', 535, 45);
  
  // Draw White Circle Indicator next to XỈU
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(558, 36, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  
  ctx.fillStyle = '#475569';
  ctx.font = '13px "Arial"';
  ctx.fillText('TỔNG ĐẶT CƯỢC', 370, 75);
  
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px "Arial"';
  ctx.fillText(`${xiuPool.toLocaleString()} coke`, 370, 105);
  
  // Xiu Pool Bar (White/Light Slate Accent)
  ctx.fillStyle = '#E2E8F0'; // Bar background
  ctx.fillRect(370, 125, 200, 18);
  ctx.fillStyle = '#94A3B8'; // Slate/white-ish bar fill
  const xiuWidth = Math.floor(rXiu * 200);
  ctx.fillRect(570 - xiuWidth, 125, xiuWidth, 18);
  
  // 3. Center Section (Status / Result)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (status === 'betting') {
    ctx.fillStyle = '#D97706'; // Amber Gold
    ctx.font = 'bold 36px "Arial"';
    ctx.fillText(`${state.countdown}s`, 300, 75);
    
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px "Arial"';
    ctx.fillText('ĐANG CƯỢC', 300, 115);
  } else if (status === 'rolling') {
    ctx.fillStyle = '#2563EB'; // Blue
    ctx.font = 'bold 22px "Arial"';
    ctx.fillText('LẮC...', 300, 75);
    
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px "Arial"';
    ctx.fillText('CHỜ KẾT QUẢ', 300, 115);
  } else if (status === 'result') {
    // Draw the 3 dice in the center
    const dice = state.lastRoll || [1, 2, 3];
    const dSize = 42;
    const startDiceX = 300 - (3 * dSize + 2 * 8) / 2;
    const diceY = 48;
    
    for (let i = 0; i < dice.length; i++) {
      drawDie(ctx, startDiceX + i * (dSize + 8), diceY, dSize, dice[i]);
    }
    
    const total = dice.reduce((a, b) => a + b, 0);
    const outcome = total >= 11 ? 'tai' : 'xiu';
    
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px "Arial"';
    ctx.fillText(outcome === 'tai' ? 'TÀI' : 'XỈU', 300, 114);
    
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px "Arial"';
    ctx.fillText(`Tổng: ${total}`, 300, 138);
  }
  ctx.restore();
  
  return canvas.toBuffer('image/png');
}

// Render the entire game room payload
function renderTaixiuRoom(state, boardBuffer) {
  const round = state.round;
  const status = state.status;
  const countdown = state.countdown;
  
  // Format history to black/white emojis: Tai = ⚫ (black), Xiu = ⚪ (white)
  const historyList = (state.history || []).slice(-15);
  const historyStr = historyList.map(h => h === 'tai' ? '⚫' : '⚪').join(' ') || 'Chưa có dữ liệu';
  
  let timeStr = "";
  let color = 0xF59E0B; // Warning Amber for Betting
  if (status === 'rolling') {
    timeStr = `🎰 **Đang lắc bát...**`;
    color = 0x3B82F6; // Blue for Rolling
  } else if (status === 'result') {
    timeStr = `🏁 **Vòng kết thúc!**`;
    color = 0x10B981; // Green for Result
  } else {
    timeStr = `⌛ Thời gian cược: **${countdown}s**`;
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`🎲 COKE CASINO — TÀI XỈU`)
    .setDescription(`### Vòng #${round}\n⏳ **Trạng thái:** ${timeStr}\n📊 **Lịch sử gần đây:** ${historyStr}`)
    .setColor(color)
    .setImage('attachment://board.png')
    .setFooter({ text: "Chúc các bạn may mắn! 🍀" })
    .setTimestamp();

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

  const payload = {
    content: "",
    embeds: [embed],
    components: [row],
    files: [new AttachmentBuilder(boardBuffer, { name: 'board.png' })],
    skipV2: true // CRITICAL: Skip V2 layout to let standard Embed render the board.png perfectly!
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
          const formatted = list.map(h => h === 'tai' ? '⚫ Tài' : '⚪ Xỉu').join(' → ');
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
