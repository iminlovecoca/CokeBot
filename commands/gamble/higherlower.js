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
  RTP: 0.9584, // Cập nhật sang RTP chuẩn của Owo để tỷ lệ cược khớp chính xác từng số đơn vị
  MIN_BET: 10, // Thiết lập mức cược tối thiểu là 10
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

  const scale = 4;
  const cardHeight = 40 * scale; // 160px
  const cardWidth = Math.round(cardHeight * (262 / 372)); // 113px
  const arrowWidth = 40 * scale; // 160px (khoảng cách rộng hơn cho thoáng)
  const paddingX = 10 * scale; // 40px
  const paddingY = 10 * scale; // 40px
  const cardRowWidth = displayedCards.length * cardWidth + Math.max(0, displayedCards.length - 1) * arrowWidth;

  const width = Math.round(cardRowWidth * 1.8); // Chiếm khoảng 55% Embed để lá bài to và dễ nhìn hơn
  const height = paddingY * 2 + cardHeight;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let x = Math.round((width - cardRowWidth) / 2);
  for (let i = 0; i < displayedCards.length; i++) {
    const cardKey = String(displayedCards[i]).toLowerCase();
    const imgPath = path.join(CARD_ASSET_DIR, `${cardKey}.png`);
    const img = await loadImage(imgPath);
    ctx.drawImage(img, x, paddingY, cardWidth, cardHeight);
    x += cardWidth;

    if (i < displayedCards.length - 1) {
      ctx.fillStyle = "#8a919e";
      ctx.beginPath();
      const arrowSize = 10 * scale; // 40px
      const arrowX = x + (arrowWidth - arrowSize) / 2;
      const arrowY = paddingY + cardHeight / 2;
      ctx.moveTo(arrowX, arrowY - (6 * scale));
      ctx.lineTo(arrowX, arrowY + (6 * scale));
      ctx.lineTo(arrowX + arrowSize, arrowY);
      ctx.closePath();
      ctx.fill();
      x += arrowWidth;
    }
  }

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "higherlower_cards.png" });
}

/**
 * Tạo dãy nút lựa chọn và nút rút tiền
 */
function buildButtons(currentCard, currentCashOut, isFinished, streak = 0) {
  const higherMultiplier = calculateMultiplier('higher', currentCard);
  const lowerMultiplier = calculateMultiplier('lower', currentCard);
  const sameMultiplier = calculateMultiplier('same', currentCard);

  const higherPayout = higherMultiplier > 0 ? Math.round(currentCashOut * higherMultiplier) : 0;
  const lowerPayout = lowerMultiplier > 0 ? Math.round(currentCashOut * lowerMultiplier) : 0;
  const samePayout = sameMultiplier > 0 ? Math.round(currentCashOut * sameMultiplier) : 0;

  const btnHigher = new ButtonBuilder()
    .setCustomId('hl_higher')
    .setLabel(`Higher (+${formatNumber(higherPayout)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isFinished || higherMultiplier === 0);

  const btnLower = new ButtonBuilder()
    .setCustomId('hl_lower')
    .setLabel(`Lower (+${formatNumber(lowerPayout)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isFinished || lowerMultiplier === 0);

  const btnSame = new ButtonBuilder()
    .setCustomId('hl_same')
    .setLabel(`Same (+${formatNumber(samePayout)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(isFinished);

  const btnCashOut = new ButtonBuilder()
    .setCustomId('hl_cashout')
    .setStyle(ButtonStyle.Success);

  if (isFinished) {
    btnCashOut.setDisabled(true);
    if (currentCashOut === 0) {
      btnCashOut.setLabel("Cash Out");
    } else {
      btnCashOut.setLabel(`Cash Out: ${formatNumber(currentCashOut)}`);
    }
  } else if (streak === 0) {
    btnCashOut.setLabel("Cash Out").setDisabled(true);
  } else {
    btnCashOut.setLabel(`Cash Out: ${formatNumber(currentCashOut)}`).setDisabled(false);
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
    titleText = `**${CONFIG.EMOJIS.money} <@${userId}> started a HighLow game.**`;
  } else if (state === 'correct') {
    embedColor = 0x57F287; // Xanh lá
    titleText = `**🎉 <@${userId}> guessed correctly!!**`;
  } else if (state === 'incorrect') {
    embedColor = 0xED4245; // Đỏ
    titleText = `**👎 <@${userId}> guessed incorrectly!!**`;
  } else if (state === 'cashout') {
    embedColor = 0x57F287; // Xanh lá
    titleText = `**${CONFIG.EMOJIS.money} <@${userId}> cashed out!**`;
  } else if (state === 'resume') {
    embedColor = 0x5865F2; // Xanh dương đậm
    titleText = `**🎮 <@${userId}> resumed a HighLow game.**`;
  }

  const { bet, streak, cashOut, currentCard } = gameData;
  const currentMultiplier = bet > 0 ? (cashOut / bet) : 1.0;
  
  const descriptionLines = [];
  if (titleText) {
    descriptionLines.push(titleText);
    descriptionLines.push(""); // cách 1 dòng so với dòng dưới
  }
  descriptionLines.push(`-# **Bet:** \`${formatNumber(bet)}\`  **Streak:** \`${streak}\`  **Cash Out:** \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\``);
  descriptionLines.push("────────────────────────────");
  
  embed.setDescription(descriptionLines.join('\n'));
  embed.setImage("attachment://higherlower_cards.png");
  embed.setColor(embedColor);

  // 2. Di chuyển các chữ này xuống phía dưới ảnh bài và hiển thị chữ nhỏ (Embed Footer)
  let footerText = "";
  if (state === 'incorrect') {
    footerText = `You guessed \`${optionInfo.guess}\`. You lost.\nCurrent Card: ${getCardDisplayValue(optionInfo.lostCard || currentCard)}`;
  } else if (state === 'cashout') {
    footerText = `You cashed out with ${formatNumber(cashOut)} coke!\nCurrent Card: ${getCardDisplayValue(currentCard)}`;
  } else {
    footerText = `Is the next card higher, lower, or the same value?\nCurrent Card: ${getCardDisplayValue(currentCard)}`;
  }
  embed.setFooter({ text: footerText });
  
  return embed;
}

/**
 * Thiết lập bộ lắng nghe nút bấm (Collector) dùng chung cho Start và Resume
 */
function setupCollector(collector, replyMsg, gameData, userId, isSlash, context) {
  collector.on('collect', async (i) => {
    // Phản hồi Discord lập tức để tránh quá giờ phản hồi của nút
    await i.deferUpdate().catch(() => {});

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
          // Cộng tiền thưởng tích lũy cho người chơi (Làm tròn ở giao dịch cuối)
          await User.updateOne(
            { userId },
            { $inc: { coke: Math.round(game.cashOut) } }
          ).session(session);

          // Xóa dữ liệu game Cao Thấp
          await HigherLowerGame.deleteOne({ userId }).session(session);
        };

        await runTransactionWithRetry(cashOutTxn);

        // Cập nhật Embed thông báo thắng cuộc
        const finishedEmbed = buildEmbed(userId, game, 'cashout');
        const finishedAttachment = await buildCardsAttachment(game, 'cashout');
        const finishedComponents = buildButtons(game.currentCard, game.cashOut, true, game.streak);
        await i.editReply({
          content: null,
          attachments: [],
          embeds: [finishedEmbed],
          files: [finishedAttachment],
          components: finishedComponents
        }).catch(() => {});
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
        }).catch(() => {});
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
      const newCashOut = game.cashOut * multiplier; // Lưu ở dạng số thực không làm tròn trung gian
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

      // Cập nhật Embed
      const nextEmbed = buildEmbed(userId, updatedGame, 'correct', { guess });
      const nextAttachment = await buildCardsAttachment(updatedGame, 'correct', { guess });
      const nextComponents = buildButtons(nextCard, newCashOut, false, newStreak);
      await i.editReply({
        content: null,
        attachments: [],
        embeds: [nextEmbed],
        files: [nextAttachment],
        components: nextComponents
      }).catch(() => {});
    } else {
      // Đoán sai! Mất hết tiền cược & kết thúc game
      collector.stop('lost');

      // Xóa game khỏi database
      await HigherLowerGame.deleteOne({ userId });

      // Cập nhật Embed
      const lostEmbed = buildEmbed(userId, game, 'incorrect', { guess, lostCard: nextCard });
      const lostAttachment = await buildCardsAttachment(game, 'incorrect', { guess, lostCard: nextCard });
      const lostComponents = buildButtons(nextCard, 0, true, game.streak);
      await i.editReply({
        content: null,
        attachments: [],
        embeds: [lostEmbed],
        files: [lostAttachment],
        components: lostComponents
      }).catch(() => {});
    }
  });

  // Không có timeout logic nữa, game kéo dài vĩnh viễn đến khi hoàn thành
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
      // RESUME GAME! (Không còn giới hạn 2 phút hết hạn nữa)
      const embed = buildEmbed(userId, activeGame, 'resume');
      const cardAttachment = await buildCardsAttachment(activeGame, 'resume');
      const components = buildButtons(activeGame.currentCard, activeGame.cashOut, false, activeGame.streak);
      
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

      // Tạo collector nhận tín hiệu nhấn nút cho ván bài được tiếp tục (không dùng time timeout)
      const filter = (i) => i.user.id === userId && ['hl_higher', 'hl_lower', 'hl_same', 'hl_cashout'].includes(i.customId);
      const collector = replyMsg.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button
      });

      setupCollector(collector, replyMsg, activeGame, userId, isSlash, context);
      return;
    }

    // Nếu không có game để resume, tự động gán cược là 10 nếu người chơi gõ hl không có đối số cược
    const finalBetInput = betInput || "10";

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
      betAmount = await getBetAmount(finalBetInput, userId, CONFIG.MAX_BET, CONFIG.MIN_BET);
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
    const components = buildButtons(firstCard, betAmount, false, 0);
    
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

    // 6. Tạo collector nhận tín hiệu nhấn nút (không dùng time timeout)
    const filter = (i) => i.user.id === userId && ['hl_higher', 'hl_lower', 'hl_same', 'hl_cashout'].includes(i.customId);
    const collector = replyMsg.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button
    });

    setupCollector(collector, replyMsg, gameData, userId, isSlash, context);
  }
};
