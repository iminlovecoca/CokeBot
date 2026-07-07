const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const config = require("../../data/config");
const { checkAndSetCooldown } = require("../../utils/cooldown");
const { getBetAmount } = require("../../utils/gameUtil");
const { runTransactionWithRetry } = require("../../utils/miscUtil");
const User = require("../../models/User");
const HigherLowerGame = require("../../models/HigherLowerGame");

const CONFIG = {
  RTP: 0.9584,
  MIN_BET: 10,
  MAX_BET: config.gamble_settings.max_bet || 250000,
  COOLDOWN_SECONDS: 15,
  SAME_MULTIPLIER_OVERRIDE: 10.0,
  EMOJIS: {
    money: config.emoji.money || "<:cokecy:1509951335016173662>"
  }
};

const rankValues = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13
};

const suits = ['s', 'c', 'h', 'd'];
const ranks = Object.keys(rankValues);
const CARD_ASSET_DIR = path.join(__dirname, "..", "..", "assets", "cards");

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

function calculateMultiplier(type, currentCard) {
  const currentValue = rankValues[currentCard.slice(0, -1)];
  const RTP = CONFIG.RTP;

  if (type === 'same') {
    if (CONFIG.SAME_MULTIPLIER_OVERRIDE !== null) {
      return CONFIG.SAME_MULTIPLIER_OVERRIDE;
    }
    return (51 / 3) * RTP;
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

function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

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
  const cardHeight = 48 * scale;
  const cardWidth = Math.round(cardHeight * (262 / 372));
  const arrowWidth = 40 * scale;
  const paddingX = 12 * scale;
  const paddingY = 12 * scale;

  const width = 450 * scale;
  const height = paddingY * 2 + cardHeight;
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
      ctx.fillStyle = "#8a919e";
      ctx.beginPath();
      const arrowSize = 12 * scale;
      const arrowX = x + (arrowWidth - arrowSize) / 2;
      const arrowY = paddingY + cardHeight / 2;
      ctx.moveTo(arrowX, arrowY - (8 * scale));
      ctx.lineTo(arrowX, arrowY + (8 * scale));
      ctx.lineTo(arrowX + arrowSize, arrowY);
      ctx.closePath();
      ctx.fill();
      x += arrowWidth;
    }
  }

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "higherlower_cards.png" });
}

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

function buildComponentsV2(gameData, state, optionInfo = {}) {
  const userId = gameData.userId;
  let headerText = "";
  
  if (state === 'start') {
    headerText = `${CONFIG.EMOJIS.money} <@${userId}> **started a HighLow game.**`;
  } else if (state === 'correct') {
    headerText = `🎉 <@${userId}> **guessed correctly!!**`;
  } else if (state === 'incorrect') {
    headerText = `👎 <@${userId}> **guessed incorrectly!!**`;
  } else if (state === 'cashout') {
    headerText = `${CONFIG.EMOJIS.money} <@${userId}> **cashed out!**`;
  } else if (state === 'resume') {
    headerText = `🎮 <@${userId}> **resumed a HighLow game.**`;
  }

  const { bet, streak, cashOut, currentCard } = gameData;
  const currentMultiplier = bet > 0 ? (cashOut / bet) : 1.0;
  const isFinished = ['incorrect', 'cashout', 'timeout'].includes(state);

  const topLines = [headerText, ""];
  let statsLine = `-# Bet: \`${formatNumber(bet)}\`  Streak: \`${streak}\`  Cash Out: \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\``;
  if (isFinished) {
    statsLine = `-# ~~Bet: \`${formatNumber(bet)}\`  Streak: \`${streak}\`  Cash Out: \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\`~~`;
  }
  topLines.push(statsLine);

  const textDisplayTop = new TextDisplayBuilder().setContent(topLines.join('\n'));

  let footerText = "";
  if (state === 'incorrect') {
    footerText = `-# You guessed \`${optionInfo.guess}\`. You lost.\n**Current Card: ${getCardDisplayValue(optionInfo.lostCard || currentCard)}**`;
  } else if (state === 'cashout') {
    footerText = `-# You cashed out with ${formatNumber(cashOut)} coke!\n**Current Card: ${getCardDisplayValue(currentCard)}**`;
  } else {
    footerText = `-# Is the next card higher, lower, or the same value?\n**Current Card: ${getCardDisplayValue(currentCard)}**`;
  }

  const textDisplayBottom = new TextDisplayBuilder().setContent(footerText);

  const separator1 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const separator2 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const separator3 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const separator4 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

  const mediaItem = new MediaGalleryItemBuilder().setURL('attachment://higherlower_cards.png');
  const gallery = new MediaGalleryBuilder().addItems(mediaItem);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplayTop)
    .addSeparatorComponents(separator1)
    .addMediaGalleryComponents(gallery)
    .addSeparatorComponents(separator2)
    .addTextDisplayComponents(textDisplayBottom)
    .addSeparatorComponents(separator3);

  const rows = buildButtons(currentCard, cashOut, isFinished, streak);
  container.addActionRowComponents(rows[0]);
  container.addSeparatorComponents(separator4);
  container.addActionRowComponents(rows[1]);

  return container;
}

function setupCollector(collector, replyMsg, gameData, userId, isSlash, context) {
  collector.on('collect', async (i) => {
    await i.deferUpdate().catch(() => {});

    const game = await HigherLowerGame.findOneAndUpdate(
      { userId, status: 'active' },
      { $set: { status: 'processing' } },
      { new: true }
    );

    if (!game) return;

    const guessId = i.customId;

    if (guessId === 'hl_cashout') {
      collector.stop('cashout');

      try {
        const cashOutTxn = async (session) => {
          await User.updateOne(
            { userId },
            { $inc: { coke: Math.round(game.cashOut) } }
          ).session(session);

          await HigherLowerGame.deleteOne({ userId }).session(session);
        };

        await runTransactionWithRetry(cashOutTxn);

        const finishedContainer = buildComponentsV2(game, 'cashout');
        const finishedAttachment = await buildCardsAttachment(game, 'cashout');
        await i.editReply({
          content: null,
          attachments: [],
          embeds: [],
          files: [finishedAttachment],
          components: [finishedContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      } catch (err) {
        console.error("Lỗi khi xử lý rút tiền game Cao Thấp:", err);
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
      const multiplier = calculateMultiplier(guess.toLowerCase(), game.currentCard);
      const newStreak = game.streak + 1;
      const newCashOut = game.cashOut * multiplier;
      const newCardHistory = [...game.cardHistory, nextCard];

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

      const nextContainer = buildComponentsV2(updatedGame, 'correct', { guess });
      const nextAttachment = await buildCardsAttachment(updatedGame, 'correct', { guess });
      await i.editReply({
        content: null,
        attachments: [],
        embeds: [],
        files: [nextAttachment],
        components: [nextContainer],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    } else {
      collector.stop('lost');

      await HigherLowerGame.deleteOne({ userId });

      const lostContainer = buildComponentsV2(game, 'incorrect', { guess, lostCard: nextCard });
      const lostAttachment = await buildCardsAttachment(game, 'incorrect', { guess, lostCard: nextCard });
      await i.editReply({
        content: null,
        attachments: [],
        embeds: [],
        files: [lostAttachment],
        components: [lostContainer],
        flags: MessageFlags.IsComponentsV2
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

    let activeGame = await HigherLowerGame.findOne({ userId });
    
    if (activeGame) {
      const container = buildComponentsV2(activeGame, 'resume');
      const cardAttachment = await buildCardsAttachment(activeGame, 'resume');
      
      let replyMsg;
      if (isSlash) {
        replyMsg = await context.reply({
          content: null,
          embeds: [],
          files: [cardAttachment],
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          fetchReply: true
        });
      } else {
        replyMsg = await context.reply({
          content: null,
          embeds: [],
          files: [cardAttachment],
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const filter = (i) => i.user.id === userId && ['hl_higher', 'hl_lower', 'hl_same', 'hl_cashout'].includes(i.customId);
      const collector = replyMsg.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button
      });

      setupCollector(collector, replyMsg, activeGame, userId, isSlash, context);
      return;
    }

    const finalBetInput = betInput || "10";

    const remainingCooldown = checkAndSetCooldown(userId, "higherlower", CONFIG.COOLDOWN_SECONDS);
    if (remainingCooldown > 0) {
      return context.reply({
        content: `⏱ | Vui lòng chờ **${remainingCooldown}s** để dùng lại lệnh này.`,
        ephemeral: true
      });
    }

    let betAmount;
    try {
      betAmount = await getBetAmount(finalBetInput, userId, CONFIG.MAX_BET, CONFIG.MIN_BET);
    } catch (err) {
      return context.reply({
        content: err.message || "❌ Có lỗi xảy ra khi xác nhận tiền cược.",
        ephemeral: true
      });
    }

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
        await User.updateOne(
          { userId },
          { $inc: { coke: -betAmount } }
        ).session(session);

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

    const container = buildComponentsV2(gameData, 'start');
    const cardAttachment = await buildCardsAttachment(gameData, 'start');
    
    let replyMsg;
    if (isSlash) {
      replyMsg = await context.reply({
        content: null,
        embeds: [],
        files: [cardAttachment],
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        fetchReply: true
      });
    } else {
      replyMsg = await context.reply({
        content: null,
        embeds: [],
        files: [cardAttachment],
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const filter = (i) => i.user.id === userId && ['hl_higher', 'hl_lower', 'hl_same', 'hl_cashout'].includes(i.customId);
    const collector = replyMsg.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button
    });

    setupCollector(collector, replyMsg, gameData, userId, isSlash, context);
  }
};
