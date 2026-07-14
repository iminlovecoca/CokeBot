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

// Track active game states in memory (key: channelId, value: TaixiuState document)
const activeStates = new Map();

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

// Draw a user silhouette icon on Canvas
function drawUserIcon(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#94A3B8'; // Slate 400
  // Head
  ctx.beginPath();
  ctx.arc(x, y - 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Body (shoulders)
  ctx.beginPath();
  ctx.arc(x, y + 4, 6, Math.PI, 0, false);
  ctx.fill();
  ctx.restore();
}

// Generate the fully visual game board Canvas (Premium Dark Green theme - Scaled up for readability)
function drawTaixiuBoard(state) {
  // Mini board: 400 x 180
  const canvas = createCanvas(400, 180);
  const ctx = canvas.getContext('2d');
  
  // 1. Background (Dark Royal Green Felt)
  const gradBg = ctx.createRadialGradient(200, 90, 40, 200, 90, 250);
  gradBg.addColorStop(0, '#064E3B');
  gradBg.addColorStop(1, '#022C22');
  ctx.fillStyle = gradBg;
  ctx.fillRect(0, 0, 400, 180);
  
  // Gold Ornate Outer Border
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 388, 168);
  
  ctx.strokeStyle = '#EAB308';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 380, 160);
  
  const status = state.status;
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (status === 'betting') {
    // Draw last roll dice
    const dice = state.lastRoll || [1, 2, 3];
    const dSize = 50;
    const startDiceX = 200 - (3 * dSize + 2 * 12) / 2;
    const diceY = 90;
    
    // Draw label "VÒNG TRƯỚC"
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 12px "Arial"';
    ctx.fillText('KẾT QUẢ VÒNG TRƯỚC', 200, 30);
    
    for (let i = 0; i < dice.length; i++) {
      drawDie(ctx, startDiceX + i * (dSize + 12), diceY, dSize, dice[i]);
    }
  } else if (status === 'rolling') {
    // Draw shaking cup / Lắc bát
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 24px "Arial"';
    ctx.fillText('🎲 ĐANG LẮC BÁT... 🎲', 200, 90);
  } else if (status === 'result') {
    // Draw current roll dice
    const dice = state.lastRoll || [1, 2, 3];
    const dSize = 50;
    const startDiceX = 200 - (3 * dSize + 2 * 12) / 2;
    const diceY = 85;
    
    const total = dice.reduce((a, b) => a + b, 0);
    const d1 = dice[0];
    const d2 = dice[1];
    const d3 = dice[2];
    const isBao = (d1 === d2 && d2 === d3);
    const outcomeText = isBao ? 'BÃO' : (total >= 11 ? 'TÀI' : 'XỈU');
    
    // Draw outcome label
    ctx.fillStyle = isBao ? '#3B82F6' : (total >= 11 ? '#EF4444' : '#CBD5E1');
    ctx.font = 'bold 20px "Arial"';
    ctx.fillText(`${outcomeText} (${total} điểm)`, 200, 30);
    
    for (let i = 0; i < dice.length; i++) {
      drawDie(ctx, startDiceX + i * (dSize + 12), diceY, dSize, dice[i]);
    }
  }
  
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
  const userEmoji = "👥";

  // Calculate players
  const getMapSize = (map) => {
    if (!map) return 0;
    if (typeof map.size === 'number') return map.size;
    if (typeof map.get === 'function') return 0;
    return Object.keys(map).length;
  };
  const playersTai = getMapSize(state.playersTai);
  const playersXiu = getMapSize(state.playersXiu);

  // Set up Embed
  const embed = new EmbedBuilder()
    .setColor(state.status === 'result' ? "#10B981" : "#D97706") // Green for result, gold/orange for betting
    .setTitle(`🎰 COKE CASINO — TÀI XỈU | Vòng #${round}`);

  // Set status description
  let countdownText = "";
  if (state.status === "betting") {
    countdownText = `⏳ **${state.countdown} giây**`;
  } else if (state.status === "rolling") {
    countdownText = `🎲 **Đang lắc bát...**`;
  } else if (state.status === "result") {
    const dice = state.lastRoll || [1, 2, 3];
    const total = dice.reduce((a, b) => a + b, 0);
    const d1 = dice[0];
    const d2 = dice[1];
    const d3 = dice[2];
    const isBao = (d1 === d2 && d2 === d3);
    const outcomeText = isBao ? 'Bão 💥' : (total >= 11 ? 'Tài 🐉' : 'Xỉu 🐢');
    countdownText = `🎉 Kết quả: **${outcomeText}** (${total} điểm)`;
  }

  const headsEmoji = config.emoji.heads || "🪙";
  const tailsEmoji = config.emoji.tails || "🪙";

  embed.setDescription(`${countdownText}\n\n**Cầu :** ${historyStr}`);

  embed.addFields(
    {
      name: `${headsEmoji} TÀI`,
      value: `${cokeEmoji} **${state.taiPool.toLocaleString()}** coke\n👤 **${playersTai} người**`,
      inline: true
    },
    {
      name: `${tailsEmoji} XỈU`,
      value: `${cokeEmoji} **${state.xiuPool.toLocaleString()}** coke\n👤 **${playersXiu} người**`,
      inline: true
    }
  );

  const imageName = `board_${Date.now()}.png`;
  embed.setImage(`attachment://${imageName}`);

  // Action Buttons
  const isBettings = state.status === 'betting';
  const row1 = new ActionRowBuilder().addComponents(
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
      .setDisabled(!isBettings),
    new ButtonBuilder()
      .setCustomId('taixiu_bet_amount')
      .setLabel('Tuỳ chọn 💰')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isBettings)
  );

  const payload = {
    embeds: [embed],
    components: [row1, row2],
    files: [new AttachmentBuilder(boardBuffer, { name: imageName })]
  };

  return payload;
}

// Edit the casino room message safely
async function updateRoomMessage(client, state) {
  try {
    let channel = client.channels.cache.get(state.channelId);
    if (!channel) {
      channel = await client.channels.fetch(state.channelId).catch(() => null);
    }
    if (!channel) return;
    
    let msg = null;
    if (state.messageId) {
      msg = channel.messages.cache.get(state.messageId);
      if (!msg) {
        msg = await channel.messages.fetch(state.messageId).catch(() => null);
      }
    }
    
    const latestState = activeStates.get(state.channelId) || state;
    
    const boardBuffer = drawTaixiuBoard(latestState);
    const payload = renderTaixiuRoom(latestState, boardBuffer);
    
    if (msg) {
      await msg.edit(payload).catch(console.error);
    } else {
      const newMsg = await channel.send(payload).catch(console.error);
      if (newMsg) {
        latestState.messageId = newMsg.id;
        state.messageId = newMsg.id;
        await latestState.save();
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

  // Force reload state from DB on next tick when starting/resuming loop
  activeStates.delete(channelId);

  const intervalId = setInterval(async () => {
    try {
      // 1. Get state from RAM first
      let state = activeStates.get(channelId);
      
      // 2. If not in RAM, fetch from DB and store it
      if (!state) {
        state = await TaixiuState.findOne({ channelId });
        if (!state) return;
        activeStates.set(channelId, state);
      }

      // Handle states
      if (state.status === 'betting') {
        state.countdown -= 1;
        
        let needsUpdate = false;
        if (state.countdown <= 0) {
          state.status = 'rolling';
          state.countdown = 5;
          needsUpdate = true;
          pendingBets.clear();
        } else {
          // Rule: Countdown only updates every 5 seconds (60, 55, 50...)
          // Except for the last 10 seconds: updates every second
          if (state.countdown <= 10) {
            needsUpdate = true;
          } else if (state.countdown % 5 === 0) {
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await TaixiuState.updateOne(
            { channelId },
            { $set: { countdown: state.countdown, status: state.status } }
          ).catch(console.error);
          await updateRoomMessage(client, state);
        }

      } else if (state.status === 'rolling') {
        state.countdown -= 1;
        if (state.countdown <= 0) {
          // Roll dice with Smart Casino RNG algorithm (dynamic anti-streak, scaled pool-balancing, alternating-pattern breaker)
          const getOutcomeOf = (r1, r2, r3) => {
            if (r1 === r2 && r2 === r3) return 'bao';
            const sum = r1 + r2 + r3;
            return sum >= 11 ? 'tai' : 'xiu';
          };

          const taiPool = state.taiPool || 0;
          const xiuPool = state.xiuPool || 0;
          const totalPool = taiPool + xiuPool;
          const diff = Math.abs(taiPool - xiuPool);
          
          let d1 = Math.floor(Math.random() * 6) + 1;
          let d2 = Math.floor(Math.random() * 6) + 1;
          let d3 = Math.floor(Math.random() * 6) + 1;
          let isBao = (d1 === d2 && d2 === d3);
          let total = d1 + d2 + d3;
          let outcome = isBao ? 'bao' : (total >= 11 ? 'tai' : 'xiu');

          let targetOutcome = null;

          // 1. SMART POOL BALANCING (Can thiệp tăng dần dựa trên độ chênh lệch)
          if (totalPool > 20000 && diff > 30000) {
            let balanceChance = 0;
            if (diff > 300000) {
              balanceChance = 0.65; // Chênh lệch cực lớn (>300k): 65% cân cược
            } else if (diff > 150000) {
              balanceChance = 0.50; // Chênh lệch lớn (>150k): 50% cân cược
            } else if (diff > 50000) {
              balanceChance = 0.30; // Chênh lệch vừa (>50k): 30% cân cược
            }
            
            if (Math.random() < balanceChance) {
              targetOutcome = taiPool > xiuPool ? 'xiu' : 'tai';
            }
          }

          // 2. DYNAMIC ANTI-STREAK (Chống cầu bệt linh hoạt theo cấp độ bệt)
          const history = state.history || [];
          if (history.length >= 4) {
            const last4 = history.slice(-4);
            const last5 = history.slice(-5);
            const last6 = history.slice(-6);

            let streakType = null;
            let streakLength = 0;

            if (last6.length === 6 && last6.every(h => h === last6[0])) {
              streakType = last6[0];
              streakLength = 6;
            } else if (last5.length === 5 && last5.every(h => h === last5[0])) {
              streakType = last5[0];
              streakLength = 5;
            } else if (last4.length === 4 && last4.every(h => h === last4[0])) {
              streakType = last4[0];
              streakLength = 4;
            }

            if (streakType && streakType !== 'bao') {
              let breakChance = 0;
              if (streakLength === 4) breakChance = 0.25; // Bệt 4: 25% cơ hội bẻ
              else if (streakLength === 5) breakChance = 0.45; // Bệt 5: 45% cơ hội bẻ
              else if (streakLength === 6) breakChance = 0.70; // Bệt 6: 70% cơ hội bẻ
              else breakChance = 0.85; // Bệt dài hơn: 85% cơ hội bẻ

              if (Math.random() < breakChance) {
                targetOutcome = streakType === 'tai' ? 'xiu' : 'tai';
              }
            }

            // 3. ANTI-PATTERN (Bẻ cầu nhảy 1-1 nếu lặp lại quá 6 lần liên tục)
            if (history.length >= 6) {
              const last6Pattern = history.slice(-6);
              let isAlternating = true;
              for (let i = 1; i < 6; i++) {
                if (last6Pattern[i] === last6Pattern[i - 1] || last6Pattern[i] === 'bao' || last6Pattern[i - 1] === 'bao') {
                  isAlternating = false;
                  break;
                }
              }
              // Nếu cầu dạng T-X-T-X-T-X, có 45% cơ hội bẻ (giữ nguyên kết quả cuối thay vì nhảy tiếp)
              if (isAlternating && Math.random() < 0.45) {
                targetOutcome = last6Pattern[5];
              }
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
            const getMapEntries = (map) => {
              if (!map) return [];
              if (typeof map.entries === 'function') return Array.from(map.entries());
              return Object.entries(map);
            };
            
            const payoutPromises = [];
            for (const [userId, betAmt] of getMapEntries(winnersMap)) {
              // Payout: Double the bet amount (x2 return)
              payoutPromises.push(incBalance(userId, betAmt * 2));
            }
            await Promise.all(payoutPromises).catch(console.error);
          }

          await state.save();
          await updateRoomMessage(client, state);
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
          const formatted = list.map(h => h === 'tai' ? '🔴 Tài' : h === 'bao' ? '🔵 Bão' : '⚪ Xỉu').join(' → ');
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
            content: `💵 Đã thiết lập mức cược nhanh: **${amount.toLocaleString()}** coke.\nNhấn nút **Bet Tài** hoặc **Bet Xỉu** để đặt cược! *(Thông báo này sẽ tự động ẩn sau 15 giây)*`,
            ephemeral: true
          }).catch(() => {});

          setTimeout(() => {
            interaction.deleteReply().catch(() => {});
          }, 15000);
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
          const getPlayerBet = (map, uId) => {
            if (!map) return 0;
            if (typeof map.get === "function") return map.get(uId) || 0;
            return map[uId] || 0;
          };
          const currentBet = side === "tai" 
            ? getPlayerBet(state.playersTai, userId) 
            : getPlayerBet(state.playersXiu, userId);
          
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
          
          // Deduct balance atomatically
          const updatedUser = await User.findOneAndUpdate(
            { userId, coke: { $gte: amt } },
            { $inc: { coke: -amt } },
            { new: true }
          );

          if (!updatedUser) {
            return interaction.followUp({
              content: `❌ Số dư Coke hiện có không đủ để cược **${amt.toLocaleString()}**!`,
              ephemeral: true
            }).catch(() => {});
          }

          const poolField = side === "tai" ? "taiPool" : "xiuPool";
          const updateField = side === "tai" ? "playersTai" : "playersXiu";

          // Update Tài Xỉu state atomatically
          const updatedState = await TaixiuState.findOneAndUpdate(
            { channelId, status: "betting" },
            {
              $inc: {
                [poolField]: amt,
                [`${updateField}.${userId}`]: amt
              }
            },
            { new: true }
          );

          if (!updatedState) {
            // Refund the user if the betting phase closed in this millisecond
            await User.updateOne({ userId }, { $inc: { coke: amt } }).catch(console.error);
            return interaction.followUp({
              content: "❌ Vòng cược đã đóng! Số tiền cược đã được hoàn trả.",
              ephemeral: true
            }).catch(() => {});
          }
          
          // Sync with the in-memory cache
          activeStates.set(channelId, updatedState);
          
          // Immediately update message to show new bet pools
          await updateRoomMessage(client, updatedState);

          // Ephemeral reply to confirm bet placement
          const sideText = side === "tai" ? "🔴 TÀI" : "⚪ XỈU";
          const followUpMsg = await interaction.followUp({
            content: `✅ Bạn đã đặt cược thành công **${amt.toLocaleString()}** coke vào cửa **${sideText}**! *(Thông báo này sẽ tự động ẩn sau 10 giây)*`,
            ephemeral: true
          }).catch(() => {});

          if (followUpMsg) {
            setTimeout(() => {
              interaction.deleteReply(followUpMsg.id).catch(() => {});
            }, 10000);
          }
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
            content: `💵 Đã thiết lập mức cược: **${amount.toLocaleString()}** coke.\nNhấn nút **Bet Tài** hoặc **Bet Xỉu** để chính thức đặt cược! *(Thông báo này sẽ tự động ẩn sau 15 giây)*`,
            ephemeral: true
          }).catch(() => {});

          setTimeout(() => {
            interaction.deleteReply().catch(() => {});
          }, 15000);
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
