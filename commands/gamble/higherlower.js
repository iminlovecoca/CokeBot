const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const config = require("../../data/config");
const { checkAndSetCooldown } = require("../../utils/cooldown");
const { getBetAmount } = require("../../utils/gameUtil");
const { runTransactionWithRetry } = require("../../utils/miscUtil");
const User = require("../../models/User");
const HigherLowerGame = require("../../models/HigherLowerGame");

// Cấu hình trò chơi Cao Thấp (Higher Lower)
const CONFIG = {
  // Tỷ lệ hoàn trả (RTP). Mặc định là 0.97 theo yêu cầu mô tả.
  // Bạn có thể đổi sang 0.9584 để khớp chính xác với hình ảnh của Owo bot.
  RTP: 0.97,
  
  // Thời gian chờ cho mỗi lượt tương tác (mili giây)
  TIMEOUT_MS: 30000,
  
  // Điểm cược tối đa và tối thiểu lấy từ cấu hình chung của hệ thống
  MIN_BET: config.gamble_settings.min_bet || 1,
  MAX_BET: config.gamble_settings.max_bet || 250000,
  
  // Thời gian hồi lệnh (cooldown) tính bằng giây
  COOLDOWN_SECONDS: 15,

  // Ghi đè hệ số nhân cho cược "Same" (bằng nhau).
  // Trong hình ảnh của Owo bot, hệ số Same luôn là 10.0x (lợi nhuận +9.0x).
  // Đặt giá trị này thành null để sử dụng công thức tính xác suất toán học thực tế (17 * RTP = 16.49x).
  SAME_MULTIPLIER_OVERRIDE: 10.0,

  EMOJIS: {
    back: config.emoji.back || "<:back:1387747558880841789>",
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

/**
 * Tạo một lá bài mới ngẫu nhiên loại trừ lá bài hiện tại (còn lại 51 lá bài)
 * @param {string|null} currentCard - Lá bài hiện tại (ví dụ "Ad")
 * @returns {string} Lá bài tiếp theo
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
 * @param {string} type - Loại dự đoán: 'higher', 'lower', 'same'
 * @param {string} currentCard - Lá bài hiện tại
 * @returns {number} Hệ số nhân nhận được nếu đoán trúng
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

/**
 * Dựng chuỗi biểu thị hàng lá bài
 */
function buildCardRow(cardHistory, isFinished, isLost, lostCard) {
  const emojiBack = CONFIG.EMOJIS.back;
  const emojiDict = config.emoji;
  const arrow = " ▶️ ";
  
  if (isFinished) {
    if (isLost && lostCard) {
      const tempHistory = [...cardHistory];
      if (tempHistory[tempHistory.length - 1] !== lostCard) {
        tempHistory.push(lostCard);
      }
      // Hiển thị tối đa 3 lá bài cuối
      const displayed = tempHistory.slice(-3);
      return displayed.map(c => emojiDict[c] || c).join(arrow);
    } else {
      // Đã cash out: Hiển thị tối đa 3 lá bài đã chơi
      const displayed = cardHistory.slice(-3);
      return displayed.map(c => emojiDict[c] || c).join(arrow);
    }
  } else {
    // Game đang diễn ra: Hiển thị tối đa 2 lá bài và lá Úp ở cuối
    const displayed = cardHistory.slice(-2);
    return [...displayed.map(c => emojiDict[c] || c), emojiBack].join(arrow);
  }
}

function buildMessageContent(gameData, state, optionInfo = {}) {
  const isFinished = ['incorrect', 'cashout', 'timeout'].includes(state);
  return buildCardRow(gameData.cardHistory, isFinished, state === 'incorrect', optionInfo.lostCard);
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
  const embedColor = 0x4A4D55;
  const divider = "━━━━━━━━━━━━━━━━━━━━";
  let titleText = "";
  
  if (state === 'correct') {
    titleText = `🎉 <@${userId}> guessed correctly!!`;
  } else if (state === 'incorrect') {
    titleText = `👎 <@${userId}> guessed incorrectly!!`;
  } else if (state === 'cashout') {
    titleText = `${CONFIG.EMOJIS.money} <@${userId}> cashed out!`;
  } else if (state === 'timeout') {
    titleText = `⏱ | <@${userId}>'s game timed out!`;
  }

  const { bet, streak, cashOut, currentCard } = gameData;
  const currentMultiplier = bet > 0 ? (cashOut / bet) : 1.0;
  
  // 1. Phần mô tả chứa thông tin cược (Bet, Streak, Cash Out) ở trên
  const descriptionLines = [];
  if (titleText) {
    descriptionLines.push(titleText);
  }
  descriptionLines.push(`**Bet:** \`${formatNumber(bet)}\`  **Streak:** \`${streak}\`  **Cash Out:** \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\``);
  descriptionLines.push(divider);
  embed.setDescription(descriptionLines.join('\n'));

  // 2. Chứa kết quả đoán và Current Card (Văn bản thường)
  const fieldValueLines = [];
  if (state === 'incorrect') {
    fieldValueLines.push(`You guessed \`${optionInfo.guess}\`. You lost.`);
    fieldValueLines.push(`Current Card: ${getCardDisplayValue(optionInfo.lostCard || currentCard)}`);
  } else if (state === 'cashout') {
    fieldValueLines.push(`You cashed out with **${formatNumber(cashOut)}** coke!`);
    fieldValueLines.push(`Current Card: ${getCardDisplayValue(currentCard)}`);
  } else if (state === 'timeout') {
    fieldValueLines.push(`Game timed out. You lost the bet!`);
  } else {
    // Trạng thái bắt đầu và đoán đúng: Chỉ hiển thị giá trị lá bài hiện tại
    fieldValueLines.push(`Current Card: ${getCardDisplayValue(currentCard)}`);
  }
  
  embed.addFields({
    name: "\u200b",
    value: fieldValueLines.join('\n'),
    inline: false
  });

  embed.setColor(embedColor);
  
  return embed;
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
    const betInput = isSlash ? context.options.getString("bet") : (arg2[0] || "min");

    // 1. Kiểm tra cooldown
    const remainingCooldown = checkAndSetCooldown(userId, "higherlower", CONFIG.COOLDOWN_SECONDS);
    if (remainingCooldown > 0) {
      return context.reply({
        content: `⏱ | Vui lòng chờ **${remainingCooldown}s** để dùng lại lệnh này.`,
        ephemeral: true
      });
    }

    // 2. Phân tích tiền cược & kiểm tra số dư
    let betAmount;
    try {
      betAmount = await getBetAmount(betInput, userId, CONFIG.MAX_BET, CONFIG.MIN_BET);
    } catch (err) {
      return context.reply({
        content: err.message || "❌ Có lỗi xảy ra khi xác nhận tiền cược.",
        ephemeral: true
      });
    }

    // 3. Kiểm tra game trùng lặp (Game Lock)
    const activeGame = await HigherLowerGame.findOne({ userId });
    if (activeGame) {
      const isAbandoned = Date.now() - new Date(activeGame.date || activeGame.createdAt || Date.now()).getTime() > 120000;
      if (isAbandoned) {
        // Tự động giải phóng game treo trên 2 phút
        await HigherLowerGame.deleteOne({ userId });
      } else {
        return context.reply({
          content: "❌ Bạn đang có một ván chơi Higher Lower đang diễn ra!",
          ephemeral: true
        });
      }
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
    const content = buildMessageContent(gameData, 'start');
    const components = buildButtons(firstCard, betAmount, false);
    
    let replyMsg;
    if (isSlash) {
      replyMsg = await context.reply({
        content,
        embeds: [embed],
        components: components,
        fetchReply: true
      });
    } else {
      replyMsg = await context.reply({
        content,
        embeds: [embed],
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
          const finishedContent = buildMessageContent(game, 'cashout');
          const finishedComponents = buildButtons(game.currentCard, game.cashOut, true);
          await i.editReply({
            content: finishedContent,
            embeds: [finishedEmbed],
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
        const nextContent = buildMessageContent(updatedGame, 'correct', { guess });
        const nextComponents = buildButtons(nextCard, newCashOut, false);
        await i.editReply({
          content: nextContent,
          embeds: [nextEmbed],
          components: nextComponents
        });
      } else {
        // Đoán sai! Mất hết tiền cược & kết thúc game
        collector.stop('lost');

        // Xóa game khỏi database
        await HigherLowerGame.deleteOne({ userId });

        // Cập nhật Embed
        const lostEmbed = buildEmbed(userId, game, 'incorrect', { guess, lostCard: nextCard });
        const lostContent = buildMessageContent(game, 'incorrect', { guess, lostCard: nextCard });
        const lostComponents = buildButtons(nextCard, 0, true, true);
        await i.editReply({
          content: lostContent,
          embeds: [lostEmbed],
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
        const timeoutContent = buildMessageContent(game, 'timeout');
        const timeoutComponents = buildButtons(game.currentCard, 0, true, true);
        await replyMsg.edit({
          content: timeoutContent,
          embeds: [timeoutEmbed],
          components: timeoutComponents
        }).catch(() => {});
      }
    });
  }
};
