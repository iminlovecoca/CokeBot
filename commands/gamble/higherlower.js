const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder
} = require("discord.js");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const config = require("../../data/config");
const { checkAndSetCooldown } = require("../../utils/cooldown");
const { getBetAmount } = require("../../utils/gameUtil");
const { runTransactionWithRetry } = require("../../utils/miscUtil");
const User = require("../../models/User");
const HigherLowerGame = require("../../models/HigherLowerGame");

// Cấu hình trò chơi Cao Thấp (Higher Lower)
const CONFIG = {
  RTP: 0.97,
  TIMEOUT_MS: 30000,
  MIN_BET: config.gamble_settings.min_bet || 1,
  MAX_BET: config.gamble_settings.max_bet || 250000,
  COOLDOWN_SECONDS: 15,
  SAME_MULTIPLIER_OVERRIDE: 10.0,
  EMOJIS: {
    money: config.emoji.money || "<:cokecy:1509951335016173662>"
  }
};

// Giá trị xếp hạng của các lá bài từ A (1) đến K (13)
const rankValues = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13
};

const suits = ['s', 'c', 'h', 'd']; // Spades, Clubs, Hearts, Diamonds
const ranks = Object.keys(rankValues);
const CARD_ASSET_DIR = path.join(__dirname, "..", "..", "assets", "cards");

/**
 * Tạo một lá bài mới ngẫu nhiên loại trừ lá bài hiện tại (còn lại 51 lá bài)
 */
function drawNextCard(currentCard) {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }
  
  if (!currentCard) {
    const randomIndex = Math.floor(Math.random() * deck.length);
    return deck[randomIndex];
  }
  
  const remaining = deck.filter(card => card !== currentCard);
  const randomIndex = Math.floor(Math.random() * remaining.length);
  return remaining[randomIndex];
}

/**
 * Tính toán hệ số nhân dựa trên xác suất toán học và cấu hình RTP
 */
function calculateMultiplier(type, currentCard) {
  const currentValue = rankValues[currentCard.slice(0, -1)];
  const RTP = CONFIG.RTP;

  if (type === 'same') {
    if (CONFIG.SAME_MULTIPLIER_OVERRIDE !== null) {
      return CONFIG.SAME_MULTIPLIER_OVERRIDE;
    }
    return (51 / 3) * RTP; // ≈ 16.49x
  }

  if (type === 'higher') {
    const higherCount = (13 - currentValue) * 4;
    if (higherCount === 0) return 0;
    const probability = higherCount / 51;
    return (1 / probability) * RTP;
  }

  if (type === 'lower') {
    const lowerCount = (currentValue - 1) * 4;
    if (lowerCount === 0) return 0;
    const probability = lowerCount / 51;
    return (1 / probability) * RTP;
  }

  return 0;
}

/**
 * Định dạng số hiển thị có dấu phẩy phân tách
 */
function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

/**
 * Lấy giá trị hiển thị dạng số của lá bài (ví dụ "J" -> 11)
 */
function getCardDisplayValue(card) {
  const rank = card.slice(0, -1);
  return rankValues[rank] || rank;
}

function getDisplayedCards(cardHistory, isFinished, isLost, lostCard) {
  if (isFinished) {
    if (isLost && lostCard) {
      const tempHistory = [...cardHistory];
      if (tempHistory[tempHistory.length - 1] !== lostCard) {
        tempHistory.push(lostCard);
      }
      return tempHistory.slice(-3);
    }
    return cardHistory.slice(-3);
  }

  return [...cardHistory.slice(-2), "back"];
}

async function buildCardsAttachment(gameData, state, optionInfo = {}) {
  const isFinished = ['incorrect', 'cashout', 'timeout'].includes(state);
  const displayedCards = getDisplayedCards(
    gameData.cardHistory,
    isFinished,
    state === 'incorrect',
    optionInfo.lostCard
  );

  const cardHeight = 140; // Tăng chiều cao lá bài từ 70 lên 140 để hiển thị to rõ nét
  const cardWidth = Math.round(cardHeight * (262 / 372)); // 99px
  const arrowWidth = 50;
  const paddingX = 15;
  const paddingY = 15;
  const textGap = 18;
  const textLineHeight = 24;
  const minWidth = 420;
  const cardRowWidth = displayedCards.length * cardWidth + Math.max(0, displayedCards.length - 1) * arrowWidth;
  const bodyLines = [];

  if (state === 'incorrect') {
    bodyLines.push(`You guessed ${optionInfo.guess} . You lost.`);
    bodyLines.push(`Current Card: ${getCardDisplayValue(optionInfo.lostCard || gameData.currentCard)}`);
  } else if (state === 'cashout') {
    bodyLines.push(`You cashed out with ${formatNumber(gameData.cashOut)} coke!`);
    bodyLines.push(`Current Card: ${getCardDisplayValue(gameData.currentCard)}`);
  } else if (state === 'timeout') {
    bodyLines.push("Game timed out. You lost the bet!");
  } else {
    bodyLines.push("Is the next card higher, lower, or the same value?");
    bodyLines.push(`Current Card: ${getCardDisplayValue(gameData.currentCard)}`);
  }

  const width = Math.max(minWidth, paddingX * 2 + cardRowWidth);
  const height = paddingY * 2 + cardHeight + textGap + bodyLines.length * textLineHeight;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let x = paddingX;
  for (let i = 0; i < displayedCards.length; i++) {
    const cardKey = String(displayedCards[i]).toLowerCase();
    const imgPath = path.join(CARD_ASSET_DIR, `${cardKey}.png`);
    const img = await loadImage(imgPath);
    ctx.drawImage(img, x, paddingY, cardWidth, cardHeight);
    x += cardWidth;

    if (i < displayedCards.length - 1) {
      // Vẽ dấu mũi tên màu xám phân tách giữa các quân bài
      ctx.fillStyle = "#8a919e";
      ctx.beginPath();
      const arrowX = x + (arrowWidth - 14) / 2;
      const arrowY = paddingY + cardHeight / 2;
      ctx.moveTo(arrowX, arrowY - 10);
      ctx.lineTo(arrowX, arrowY + 10);
      ctx.lineTo(arrowX + 14, arrowY);
      ctx.closePath();
      ctx.fill();
      x += arrowWidth;
    }
  }

  // Tăng font chữ thông tin lên bold 18px để cân xứng với bài lớn
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#f2f3f5";
  let textY = paddingY + cardHeight + textGap + 15;
  for (let i = 0; i < bodyLines.length; i++) {
    ctx.fillStyle = i === 0 ? "#f2f3f5" : "#b9bbbe";
    ctx.fillText(bodyLines[i], paddingX, textY);
    textY += textLineHeight;
  }

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "higherlower_cards.png" });
}

/**
 * Tạo dãy nút lựa chọn và nút rút tiền
 */
function buildButtons(currentCard, currentCashOut, isFinished, isLost = false) {
  const higherMultiplier = calculateMultiplier('higher', currentCard);
  const lowerMultiplier = calculateMultiplier('lower', currentCard);
  const sameMultiplier = calculateMultiplier('same', currentCard);

  // Tính tiền lãi hiển thị trên nhãn nút
  const higherProfit = higherMultiplier > 0 ? Math.round(currentCashOut * (higherMultiplier - 1)) : 0;
  const lowerProfit = lowerMultiplier > 0 ? Math.round(currentCashOut * (lowerMultiplier - 1)) : 0;
  const sameProfit = sameMultiplier > 0 ? Math.round(currentCashOut * (sameMultiplier - 1)) : 0;

  const btnHigher = new ButtonBuilder()
    .setCustomId('hl_higher')
    .setLabel(`Higher (+${formatNumber(higherProfit)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isFinished || higherMultiplier === 0);

  const btnLower = new ButtonBuilder()
    .setCustomId('hl_lower')
    .setLabel(`Lower (+${formatNumber(lowerProfit)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isFinished || lowerMultiplier === 0);

  const btnSame = new ButtonBuilder()
    .setCustomId('hl_same')
    .setLabel(`Same (+${formatNumber(sameProfit)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isFinished);

  const btnCashOut = new ButtonBuilder()
    .setCustomId('hl_cashout')
    .setStyle(ButtonStyle.Success)
    .setDisabled(isFinished || currentCashOut === 0);

  if (isFinished) {
    if (isLost) {
      btnCashOut.setLabel("Cash Out");
    } else {
      btnCashOut.setLabel(`Cash Out: ${formatNumber(currentCashOut)}`);
    }
  } else {
    btnCashOut.setLabel(`Cash Out: ${formatNumber(currentCashOut)}`);
  }

  const row1 = new ActionRowBuilder().addComponents(btnHigher, btnLower, btnSame);
  const row2 = new ActionRowBuilder().addComponents(btnCashOut);

  return [row1, row2];
}

/**
 * Dựng nội dung embed hiển thị trò chơi
 */
function buildEmbed(userId, gameData, state, optionInfo = {}) {
  const embed = new EmbedBuilder();
  let embedColor = 0x615F5F; // Mặc định là màu xám (khi hết giờ)
  let titleText = "";
  
  if (state === 'start') {
    embedColor = 0x5865F2; // Xanh dương đậm
    titleText = `${CONFIG.EMOJIS.money} <@${userId}> started a HighLow game.`;
  } else if (state === 'correct') {
    embedColor = 0x57F287; // Xanh lá
    titleText = `🎉 <@${userId}> guessed correctly!!`;
  } else if (state === 'incorrect') {
    embedColor = 0xED4245; // Đỏ
    titleText = `👎 <@${userId}> guessed incorrectly!!`;
  } else if (state === 'cashout') {
    embedColor = 0x57F287; // Xanh lá
    titleText = `${CONFIG.EMOJIS.money} <@${userId}> cashed out!`;
  } else if (state === 'timeout') {
    embedColor = 0x95A5A6; // Xám
    titleText = `⏱ | <@${userId}>'s game timed out!`;
  } else if (state === 'resume') {
    embedColor = 0x5865F2; // Xanh dương đậm
    titleText = `🎮 <@${userId}> resumed a HighLow game.`;
  }

  const { bet, streak, cashOut } = gameData;
  const currentMultiplier = bet > 0 ? (cashOut / bet) : 1.0;
  
  // 1. Phần mô tả chứa thông tin cược (Bet, Streak, Cash Out) ở trên
  const descriptionLines = [];
  if (titleText) {
    descriptionLines.push(titleText);
  }
  descriptionLines.push(`**Bet:** \`${formatNumber(bet)}\`  **Streak:** \`${streak}\`  **Cash Out:** \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\``);
  descriptionLines.push("────────────────────────────");
  
  embed.setDescription(descriptionLines.join('\n'));
  embed.setImage("attachment://higherlower_cards.png");
  embed.setColor(embedColor);
  
  return embed;
}

/**
 * Thiết lập bộ lắng nghe nút bấm (Collector) dùng chung cho Start và Resume
 */
function setupCollector(collector, replyMsg, gameData, userId, isSlash, context) {
  collector.on('collect', async (i) => {
    // Phản hồi Discord lập tức để tránh quá giờ phản hồi của nút
    await i.deferUpdate();

    // Kiểm tra trạng thái và chuyển status sang 'processing' để lock game tránh bấm nút liên tiếp
    const game = await HigherLowerGame.findOneAndUpdate(
      { userId, status: 'active' },
      { $set: { status: 'processing' } },
      { new: true }
    );

    // Nếu không tìm thấy game ở trạng thái 'active', nghĩa là game đang được xử lý hoặc đã kết thúc
    if (!game) return;

    const guessId = i.customId;

    // Xử lý cút/rút tiền (CASH OUT)
    if (guessId === 'hl_cashout') {
      collector.stop('cashout');

      try {
        const cashOutTxn = async (session) => {
          // Cộng tiền thưởng tích lũy cho người chơi
          await User.updateOne(
            { userId },
            { $inc: { coke: game.cashOut } }
          ).session(session);

          // Xóa dữ liệu game Cao Thấp
          await HigherLowerGame.deleteOne({ userId }).session(session);
        };

        await runTransactionWithRetry(cashOutTxn);

        // Cập nhật Embed thông báo thắng cuộc
        const finishedEmbed = buildEmbed(userId, game, 'cashout');
        const finishedAttachment = await buildCardsAttachment(game, 'cashout');
        const finishedComponents = buildButtons(game.currentCard, game.cashOut, true);
        await i.editReply({
          content: null,
          attachments: [],
          embeds: [finishedEmbed],
          files: [finishedAttachment],
          components: finishedComponents
        });
      } catch (err) {
        console.error("Lỗi khi xử lý rút tiền game Cao Thấp:", err);
        // Trả lại trạng thái active nếu lỗi db để người chơi thử lại
        await HigherLowerGame.updateOne(
          { userId },
          { $set: { status: 'active' } }
        );
        await i.followUp({
          content: "❌ Rút tiền thất bại. Hãy bấm Cash Out lại!",
          ephemeral: true
        });
      }
      return;
    }

    // Xử lý đoán (Higher, Lower, Same)
    const guessMap = {
      'hl_higher': 'Higher',
      'hl_lower': 'Lower',
      'hl_same': 'Same'
    };
    const guess = guessMap[guessId];

    const nextCard = drawNextCard(game.currentCard);
    const currentValue = rankValues[game.currentCard.slice(0, -1)];
    const nextValue = rankValues[nextCard.slice(0, -1)];

    let isCorrect = false;
    if (guess === 'Higher') {
      isCorrect = nextValue > currentValue;
    } else if (guess === 'Lower') {
      isCorrect = nextValue < currentValue;
    } else if (guess === 'Same') {
      isCorrect = nextValue === currentValue;
    }

    if (isCorrect) {
      // Đoán đúng! Tiếp tục trò chơi
      const multiplier = calculateMultiplier(guess.toLowerCase(), game.currentCard);
      const newStreak = game.streak + 1;
      const newCashOut = Math.round(game.cashOut * multiplier);
      const newCardHistory = [...game.cardHistory, nextCard];

      // Lưu trạng thái mới vào DB & unlock
      const updatedGame = await HigherLowerGame.findOneAndUpdate(
        { userId },
        {
          $set: {
            streak: newStreak,
            cashOut: newCashOut,
            currentCard: nextCard,
            cardHistory: newCardHistory,
            status: 'active',
            date: new Date()
          }
        },
        { new: true }
      );

      // Reset thời gian đếm ngược của collector
      collector.resetTimer();

      // Cập nhật Embed
      const nextEmbed = buildEmbed(userId, updatedGame, 'correct', { guess });
      const nextAttachment = await buildCardsAttachment(updatedGame, 'correct', { guess });
      const nextComponents = buildButtons(nextCard, newCashOut, false);
      await i.editReply({
        content: null,
        attachments: [],
        embeds: [nextEmbed],
        files: [nextAttachment],
        components: nextComponents
      });
    } else {
      // Đoán sai! Mất hết tiền cược & kết thúc game
      collector.stop('lost');

      // Xóa game khỏi database
      await HigherLowerGame.deleteOne({ userId });

      // Cập nhật Embed
      const lostEmbed = buildEmbed(userId, game, 'incorrect', { guess, lostCard: nextCard });
      const lostAttachment = await buildCardsAttachment(game, 'incorrect', { guess, lostCard: nextCard });
      const lostComponents = buildButtons(nextCard, 0, true, true);
      await i.editReply({
        content: null,
        attachments: [],
        embeds: [lostEmbed],
        files: [lostAttachment],
        components: lostComponents
      });
    }
  });

  collector.on('end', async (collected, reason) => {
    // Nếu kết thúc do người chơi chủ động đoán sai hoặc cashout thì bỏ qua
    if (reason === 'cashout' || reason === 'lost') return;

    // Hết thời gian chờ (Timeout)
    const game = await HigherLowerGame.findOne({ userId });
    if (game) {
      // Xóa game
      await HigherLowerGame.deleteOne({ userId });

      // Sửa giao diện sang dạng hết giờ cược
      const timeoutEmbed = buildEmbed(userId, game, 'timeout');
      const timeoutAttachment = await buildCardsAttachment(game, 'timeout');
      const timeoutComponents = buildButtons(game.currentCard, 0, true, true);
      await replyMsg.edit({
        content: null,
        attachments: [],
        embeds: [timeoutEmbed],
        files: [timeoutAttachment],
        components: timeoutComponents
      }).catch(() => {});
    }
  });
}

module.exports = {
  name: "higherlower",
  aliases: ["hl", "caothap"],
  category: "gamble",
  data: new SlashCommandBuilder()
    .setName("higherlower")
    .setDescription("Chơi trò chơi Cao Thấp (Higher Lower)!")
    .addStringOption((option) =>
      option
        .setName("bet")
        .setDescription("Số coke muốn cược (ví dụ: 10000, all, min)")
        .setRequired(true)
    ),

  async execute(context, arg2, arg3, arg4) {
    const isSlash = !context.author;
    const userId = isSlash ? context.user.id : context.author.id;
    const betInput = isSlash ? context.options.getString("bet") : (arg2[0] || null);

    // 1. Kiểm tra game trùng lặp/active trước tiên để thực hiện Resume
    let activeGame = await HigherLowerGame.findOne({ userId });
    
    if (activeGame) {
      const isAbandoned = Date.now() - new Date(activeGame.date || activeGame.createdAt || Date.now()).getTime() > 120000;
      if (isAbandoned) {
        // Tự động giải phóng game treo trên 2 phút và tiếp tục luồng để tạo game mới
        await HigherLowerGame.deleteOne({ userId });
        activeGame = null;
      } else {
        // RESUME GAME!
        const embed = buildEmbed(userId, activeGame, 'resume');
        const cardAttachment = await buildCardsAttachment(activeGame, 'resume');
        const components = buildButtons(activeGame.currentCard, activeGame.cashOut, false);
        
        let replyMsg;
        if (isSlash) {
          replyMsg = await context.reply({
            embeds: [embed],
            files: [cardAttachment],
            components: components,
            fetchReply: true
          });
        } else {
          replyMsg = await context.reply({
            embeds: [embed],
            files: [cardAttachment],
            components: components
          });
        }

        // Tạo collector nhận tín hiệu nhấn nút cho ván bài được tiếp tục
        const filter = (i) => i.user.id === userId && ['hl_higher', 'hl_lower', 'hl_same', 'hl_cashout'].includes(i.customId);
        const collector = replyMsg.createMessageComponentCollector({
          filter,
          time: CONFIG.TIMEOUT_MS,
          componentType: ComponentType.Button
        });

        setupCollector(collector, replyMsg, activeGame, userId, isSlash, context);
        return;
      }
    }

    // Nếu không có game để resume, yêu cầu nhập tiền cược để bắt đầu game mới
    if (!betInput) {
      return context.reply({
        content: `❌ Vui lòng nhập số tiền cược để bắt đầu ván mới! Ví dụ: \`xhl 10000\``,
        ephemeral: true
      });
    }

    // 2. Kiểm tra cooldown (chỉ áp dụng khi tạo game mới)
    const remainingCooldown = checkAndSetCooldown(userId, "higherlower", CONFIG.COOLDOWN_SECONDS);
    if (remainingCooldown > 0) {
      return context.reply({
        content: `⏱ | Vui lòng chờ **${remainingCooldown}s** để dùng lại lệnh này.`,
        ephemeral: true
      });
    }

    // 3. Phân tích tiền cược & kiểm tra số dư
    let betAmount;
    try {
      betAmount = await getBetAmount(betInput, userId, CONFIG.MAX_BET, CONFIG.MIN_BET);
    } catch (err) {
      return context.reply({
        content: err.message || "❌ Có lỗi xảy ra khi xác nhận tiền cược.",
        ephemeral: true
      });
    }

    // 4. Bắt đầu trò chơi & trừ tiền ngay (Dùng transaction)
    const firstCard = drawNextCard(null);
    const gameData = {
      userId,
      bet: betAmount,
      streak: 0,
      cashOut: betAmount,
      currentCard: firstCard,
      cardHistory: [firstCard],
      status: 'active'
    };

    try {
      const startGameTxn = async (session) => {
        // Trừ tiền của user ngay lập tức
        await User.updateOne(
          { userId },
          { $inc: { coke: -betAmount } }
        ).session(session);

        // Lưu thông tin game vào db
        await HigherLowerGame.create([gameData], { session });
      };

      await runTransactionWithRetry(startGameTxn);
    } catch (err) {
      console.error("Lỗi khi tạo game Cao Thấp:", err);
      return context.reply({
        content: "❌ Không thể bắt đầu trò chơi do lỗi giao dịch dữ liệu. Hãy thử lại!",
        ephemeral: true
      });
    }

    // 5. Gửi giao diện bắt đầu game
    const embed = buildEmbed(userId, gameData, 'start');
    const cardAttachment = await buildCardsAttachment(gameData, 'start');
    const components = buildButtons(firstCard, betAmount, false);
    
    let replyMsg;
    if (isSlash) {
      replyMsg = await context.reply({
        embeds: [embed],
        files: [cardAttachment],
        components: components,
        fetchReply: true
      });
    } else {
      replyMsg = await context.reply({
        embeds: [embed],
        files: [cardAttachment],
        components: components
      });
    }

    // 6. Tạo collector nhận tín hiệu nhấn nút
    const filter = (i) => i.user.id === userId && ['hl_higher', 'hl_lower', 'hl_same', 'hl_cashout'].includes(i.customId);
    const collector = replyMsg.createMessageComponentCollector({
      filter,
      time: CONFIG.TIMEOUT_MS,
      componentType: ComponentType.Button
    });

    setupCollector(collector, replyMsg, gameData, userId, isSlash, context);
  }
};
