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

// Generate the fully visual game board Canvas (Green Felt Casino style) - Height expanded to 220
function drawTaixiuBoard(state) {
  const canvas = createCanvas(700, 220);
  const ctx = canvas.getContext('2d');
  
  // Background (Dark Green Felt)
  ctx.fillStyle = '#065F46';
  ctx.fillRect(0, 0, 700, 220);
  
  // Border (Luxurious Gold border)
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, 690, 210);
  
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
  
  // 1. TÀI Section (Left) - Color: Red
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 26px "Arial"';
  ctx.fillText('TÀI', 65, 55);
  
  // Draw Red Circle Indicator next to TÀI
  ctx.beginPath();
  ctx.arc(38, 46, 10, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '13px "Arial"';
  ctx.fillText('TỔNG ĐẶT CƯỢC', 30, 90);
  
  // Draw Casino Chip next to pool labels
  drawChip(ctx, 160, 86, 10, 'C');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px "Arial"';
  ctx.fillText(`${taiPool.toLocaleString()} coke`, 30, 125);
  
  // Tai Pool Bar (Red with dark forest green backing)
  ctx.fillStyle = '#064E3B'; // Bar background
  ctx.fillRect(30, 155, 230, 18);
  ctx.fillStyle = '#EF4444'; // Red bar fill
  ctx.fillRect(30, 155, Math.floor(rTai * 230), 18);
  
  // 2. XỈU Section (Right) - Color: White
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px "Arial"';
  ctx.fillText('XỈU', 635, 55);
  
  // Draw White Circle Indicator next to XỈU
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(658, 46, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '13px "Arial"';
  ctx.fillText('TỔNG ĐẶT CƯỢC', 440, 90);
  
  // Draw Casino Chip next to pool labels
  drawChip(ctx, 570, 86, 10, 'C');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px "Arial"';
  ctx.fillText(`${xiuPool.toLocaleString()} coke`, 440, 125);
  
  // Xiu Pool Bar (White with dark forest green backing)
  ctx.fillStyle = '#064E3B'; // Bar background
  ctx.fillRect(440, 155, 230, 18);
  ctx.fillStyle = '#FFFFFF'; // White bar fill
  const xiuWidth = Math.floor(rXiu * 230);
  ctx.fillRect(670 - xiuWidth, 155, xiuWidth, 18);
  
  // 3. Center Section (Status / Result)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (status === 'betting') {
    ctx.fillStyle = '#F59E0B'; // Gold
    ctx.font = 'bold 36px "Arial"';
    ctx.fillText(`${state.countdown}s`, 350, 90);
    
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 11px "Arial"';
    ctx.fillText('ĐANG CƯỢC', 350, 135);
  } else if (status === 'rolling') {
    ctx.fillStyle = '#60A5FA'; // Light Blue
    ctx.font = 'bold 22px "Arial"';
    ctx.fillText('LẮC...', 350, 90);
    
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 11px "Arial"';
    ctx.fillText('CHỜ KẾT QUẢ', 350, 135);
  } else if (status === 'result') {
    // Draw the 3 dice in the center
    const dice = state.lastRoll || [1, 2, 3];
    const dSize = 42;
    const startDiceX = 350 - (3 * dSize + 2 * 8) / 2;
    const diceY = 60;
    
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
      ctx.fillStyle = '#F59E0B'; // Gold for Bao
      ctx.font = 'bold 18px "Arial"';
      ctx.fillText('BÃO 💥', 350, 138);
    } else {
      ctx.fillStyle = outcome === 'tai' ? '#EF4444' : '#FFFFFF';
      ctx.font = 'bold 18px "Arial"';
      ctx.fillText(outcome === 'tai' ? 'TÀI' : 'XỈU', 350, 138);
    }
    
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 12px "Arial"';
    ctx.fillText(`Tổng: ${total}`, 350, 165);
  }
  ctx.restore();
  
  return canvas.toBuffer('image/png');
}

// Render the entire game room payload using V2 Container manually
function renderTaixiuRoom(state, boardBuffer) {
  const round = state.round;
  
  // Format history: Tai = 🔴, Xiu = ⚪, Bao = 🔵 (Blue dot for triple)
  const historyList = (state.history || []).slice(-15);
  const historyStr = historyList.map(h => h === 'tai' ? '🔴' : h === 'bao' ? '🔵' : '⚪').join(' ') || 'Chưa có dữ liệu';

  // Get Coke Money Emoji
  const cokeEmoji = config.emoji.money || "🪙";

  const headerText = `${cokeEmoji} **COKE CASINO — TÀI XỈU**  |  *Vòng #${round}*\n\n` +
                     `📊 **Lịch sử**\n\n${historyStr}\n\u200b`; // added \u200b (blank line spacing)
  
  const textHeader = new TextDisplayBuilder().setContent(headerText);
  
  const gallery = new MediaGalleryBuilder()
    .addItems(new MediaGalleryItemBuilder().setURL('attachment://board.png'));

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
      .setLabel('Tài')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_bet_xiu')
      .setLabel('Xỉu')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_bet_amount')
      .setLabel('Nạp chip')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isBettings)
  );

  container.addActionRowComponents(row);

  const payload = {
    content: "",
    embeds: [],
    components: [container],
    files: [new AttachmentBuilder(boardBuffer, { name: 'board.png' })],
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
          // Switch to result and roll the dice
          const d1 = Math.floor(Math.random() * 6) + 1;
          const d2 = Math.floor(Math.random() * 6) + 1;
          const d3 = Math.floor(Math.random() * 6) + 1;
          
          const isBao = (d1 === d2 && d2 === d3);
          const total = d1 + d2 + d3;
          const outcome = isBao ? 'bao' : (total >= 11 ? 'tai' : 'xiu');

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

        if (cid === "taixiu_bet_tai" || cid === "taixiu_bet_xiu") {
          await interaction.deferUpdate().catch(() => {});

          if (state.status !== "betting") {
            return;
          }

          const amt = pendingBets.get(userId) || 0;
          if (amt <= 0) {
            return;
          }

          if (amt > 250000) {
            return;
          }

          // Validate balance
          const userDoc = await User.findOne({ userId });
          if (!userDoc || userDoc.coke < amt) {
            return;
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
