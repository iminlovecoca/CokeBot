const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require("discord.js");
const config = require("../../data/config");
const { checkAndSetCooldown } = require("../../utils/cooldown");
const { getBetAmount } = require("../../utils/gameUtil");
const { runTransactionWithRetry } = require("../../utils/miscUtil");
const User = require("../../models/User");
const HorseRaceGame = require("../../models/HorseRaceGame");

const CONFIG = {
  MIN_BET: 10,
  MAX_BET: config.gamble_settings.max_bet || 250000,
  COOLDOWN_SECONDS: 3,
  EMOJIS: {
    money: config.emoji.money || "<:cokecy:1509951335016173662>"
  }
};

function getRaceMultiplier(round) {
  const multipliers = [0, 1.40, 2.20, 3.90, 7.80, 19.50, 78.00];
  return multipliers[round] || 0;
}

const WIN_PROBABILITIES = [
  0.125, // Round 1
  0.125, // Round 2
  0.125, // Round 3
  0.125, // Round 4
  0.125, // Round 5
  0.125  // Round 6
];

function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

function drawRaceTrack(winningHorse, chosenHorse, roundState, step = 4) {
  const lines = [];
  const trackLength = 10;
  
  for (let h = 1; h <= 8; h++) {
    let pos = trackLength; // far right (start)
    let suffix = "";
    
    if (roundState === 'pending') {
      pos = trackLength;
    } else if (roundState === 'running') {
      if (step === 1) {
        pos = Math.floor(Math.random() * 2) + 8; // 8 to 9
      } else if (step === 2) {
        pos = Math.floor(Math.random() * 2) + 5; // 5 to 6
      } else if (step === 3) {
        pos = Math.floor(Math.random() * 2) + 2; // 2 to 3
      }
    } else if (roundState === 'won' || roundState === 'lost') {
      if (h === winningHorse) {
        pos = 0; // at finish line
        suffix = " (Thắng!)";
      } else if (roundState === 'lost' && h === chosenHorse) {
        pos = Math.floor(Math.random() * 3) + 3; // 3 to 5
        suffix = " (Bạn chọn)";
      } else {
        pos = Math.floor(Math.random() * 5) + 3; // 3 to 7
      }
    }
    
    const prefix = `\`0${h}\` 🏁 `;
    const trackSlots = [];
    for (let i = 0; i < trackLength; i++) {
      if (i === pos) {
        trackSlots.push("🏇");
      } else {
        trackSlots.push("—");
      }
    }
    if (pos === trackLength) {
      trackSlots.push("🏇");
    }
    
    const trackStr = trackSlots.join(" ");
    lines.push(`${prefix}${trackStr}${suffix}`);
  }
  return lines.join('\n');
}

function buildComponentsV2(game, state, optionInfo = {}) {
  const userId = game.userId;
  let headerText = "";
  
  if (state === 'start') {
    headerText = `🏇 <@${userId}> **đã bắt đầu cuộc đua ngựa.**`;
  } else if (state === 'play') {
    headerText = `🏇 <@${userId}> **đang chọn ngựa cho Vòng ${game.round + 1}/6.**`;
  } else if (state === 'running') {
    headerText = `🏇 **Cuộc đua đang diễn ra gay cấn (Vòng ${game.round + 1}/6)...**`;
  } else if (state === 'win_round') {
    headerText = `🎉 <@${userId}> **đã chọn đúng! Ngựa số 0${optionInfo.winningHorse} đã về đích đầu tiên!**`;
  } else if (state === 'lost') {
    headerText = `👎 <@${userId}> **đã chọn sai!**`;
  } else if (state === 'cashout') {
    headerText = `💰 <@${userId}> **đã rút tiền thưởng!**`;
  } else if (state === 'won') {
    headerText = `🏆 <@${userId}> **đã giành chức vô địch Vòng 6/6!**`;
  } else if (state === 'resume') {
    headerText = `🎮 <@${userId}> **đã khôi phục trò chơi đua ngựa.**`;
  }

  const { bet, round, cashOut } = game;
  const currentMultiplier = getRaceMultiplier(round);
  const nextMultiplier = getRaceMultiplier(round + 1);
  const isFinished = ['lost', 'cashout', 'won'].includes(state);
  const isRunning = state === 'running';

  const topLines = [headerText, ""];
  let statsLine = `-# Cược: \`${formatNumber(bet)}\`  Vòng: \`${round}/6\`  Cash Out: \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\`\n-# Tiếp theo: \`${(bet * nextMultiplier).toLocaleString()}\` \`(${nextMultiplier.toFixed(2)}x)\``;
  if (isFinished) {
    statsLine = `-# ~~Cược: \`${formatNumber(bet)}\`  Vòng: \`${round}/6\`  Cash Out: \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\`~~`;
  }
  topLines.push(statsLine);

  const textDisplayTop = new TextDisplayBuilder().setContent(topLines.join('\n'));

  let trackState = 'running';
  if (state === 'start' || state === 'play' || state === 'resume') {
    trackState = 'pending';
  } else if (state === 'win_round' || state === 'won') {
    trackState = 'won';
  } else if (state === 'lost') {
    trackState = 'lost';
  }

  const winningHorse = optionInfo.winningHorse || (game.winningHorses && game.winningHorses[round - 1]) || 0;
  const chosenHorse = optionInfo.chosenHorse || (game.selectedHorses && game.selectedHorses[round - 1]) || 0;

  const trackText = drawRaceTrack(winningHorse, chosenHorse, trackState, optionInfo.step || 4);
  const textDisplayTrack = new TextDisplayBuilder().setContent(trackText);

  let bottomText = "";
  if (state === 'play' || state === 'start' || state === 'resume' || state === 'win_round') {
    bottomText = `-# Chọn 1 trong 8 con ngựa để chạy đua!`;
  } else if (state === 'running') {
    bottomText = `-# Cổ vũ cho con ngựa số 0${chosenHorse} của bạn nào!`;
  } else if (state === 'lost') {
    bottomText = `-# Bạn đã thua hết **${formatNumber(bet)}** coke cược.`;
  } else if (state === 'cashout') {
    bottomText = `-# Bạn đã rút tiền và nhận được **${formatNumber(cashOut)}** coke!`;
  } else if (state === 'won') {
    bottomText = `-# Chúc mừng! Bạn đã hoàn thành 6 vòng và thắng **${formatNumber(cashOut)}** coke!`;
  }
  const textDisplayBottom = new TextDisplayBuilder().setContent(bottomText);

  const separator1 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const separator2 = new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);
  const separator3 = new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small);
  const separator4 = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplayTop)
    .addSeparatorComponents(separator1)
    .addTextDisplayComponents(textDisplayTrack)
    .addSeparatorComponents(separator2)
    .addTextDisplayComponents(textDisplayBottom)
    .addSeparatorComponents(separator3);

  const row1 = new ActionRowBuilder();
  for (let h = 1; h <= 4; h++) {
    const btn = new ButtonBuilder()
      .setCustomId(`race_horse_${h}`)
      .setLabel(`🏇 0${h}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFinished || isRunning);
    row1.addComponents(btn);
  }
  container.addActionRowComponents(row1);

  const row2 = new ActionRowBuilder();
  for (let h = 5; h <= 8; h++) {
    const btn = new ButtonBuilder()
      .setCustomId(`race_horse_${h}`)
      .setLabel(`🏇 0${h}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFinished || isRunning);
    row2.addComponents(btn);
  }
  container.addActionRowComponents(row2);

  container.addSeparatorComponents(separator4);

  const row3 = new ActionRowBuilder();
  const btnCashOut = new ButtonBuilder()
    .setCustomId('race_cashout')
    .setLabel(round > 0 ? `Cash Out: ${formatNumber(cashOut)}` : 'Cash Out')
    .setStyle(ButtonStyle.Success)
    .setDisabled(round === 0 || isFinished || isRunning);
  row3.addComponents(btnCashOut);
  container.addActionRowComponents(row3);

  return container;
}

function setupCollector(collector, replyMsg, activeGame, userId, isSlash, context) {
  collector.on('collect', async (i) => {
    await i.deferUpdate().catch(() => {});

    const game = await HorseRaceGame.findOneAndUpdate(
      { userId, status: 'active' },
      { $set: { status: 'processing' } },
      { new: true }
    );

    if (!game) return;

    const customId = i.customId;

    if (customId === 'race_cashout') {
      collector.stop('cashout');

      try {
        const cashOutTxn = async (session) => {
          await User.updateOne(
            { userId },
            { $inc: { coke: Math.round(game.cashOut) } }
          ).session(session);

          await HorseRaceGame.deleteOne({ userId }).session(session);
        };

        await runTransactionWithRetry(cashOutTxn);

        const finishedContainer = buildComponentsV2(game, 'cashout');
        await i.editReply({
          embeds: [],
          content: null,
          components: [finishedContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      } catch (err) {
        console.error("Lỗi khi xử lý rút tiền game HorseRace:", err);
        await HorseRaceGame.updateOne(
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

    const horseIdx = parseInt(customId.split('_')[2]);
    const currentRound = game.round;

    // Roll result based on Mines win probabilities
    const prob = WIN_PROBABILITIES[currentRound];
    const won = Math.random() < prob;
    const winningHorse = won ? horseIdx : (() => {
      const otherHorses = [1, 2, 3, 4, 5, 6, 7, 8].filter(h => h !== horseIdx);
      return otherHorses[Math.floor(Math.random() * otherHorses.length)];
    })();

    // Play 3-second running animation
    for (let step = 1; step <= 3; step++) {
      const animContainer = buildComponentsV2(game, 'running', { step, chosenHorse: horseIdx });
      await i.editReply({
        embeds: [],
        content: null,
        components: [animContainer],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (won) {
      const nextRound = currentRound + 1;
      const nextMultiplier = getRaceMultiplier(nextRound);
      const newCashOut = game.bet * nextMultiplier;

      if (nextRound === 6) {
        collector.stop('win');

        try {
          const autoWinTxn = async (session) => {
            await User.updateOne(
              { userId },
              { $inc: { coke: Math.round(newCashOut) } }
            ).session(session);

            await HorseRaceGame.deleteOne({ userId }).session(session);
          };

          await runTransactionWithRetry(autoWinTxn);

          const wonData = {
            ...game.toObject(),
            round: nextRound,
            cashOut: newCashOut,
            selectedHorses: [...game.selectedHorses, horseIdx],
            winningHorses: [...game.winningHorses, winningHorse],
            isWon: true
          };

          const finishedContainer = buildComponentsV2(wonData, 'won', { winningHorse, chosenHorse: horseIdx });
          await i.editReply({
            embeds: [],
            content: null,
            components: [finishedContainer],
            flags: MessageFlags.IsComponentsV2
          }).catch(() => {});
        } catch (err) {
          console.error("Lỗi khi tự động thắng game HorseRace:", err);
          await HorseRaceGame.updateOne(
            { userId },
            { $set: { status: 'active' } }
          );
        }
      } else {
        const updatedGame = await HorseRaceGame.findOneAndUpdate(
          { userId },
          {
            $set: {
              round: nextRound,
              cashOut: newCashOut,
              status: 'active',
              date: new Date()
            },
            $push: {
              selectedHorses: horseIdx,
              winningHorses: winningHorse
            }
          },
          { new: true }
        );

        const winRoundContainer = buildComponentsV2(updatedGame, 'win_round', { winningHorse, chosenHorse: horseIdx });
        await i.editReply({
          embeds: [],
          content: null,
          components: [winRoundContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }
    } else {
      collector.stop('lost');

      await HorseRaceGame.deleteOne({ userId });

      const lostData = {
        ...game.toObject(),
        round: currentRound,
        cashOut: 0,
        selectedHorses: [...game.selectedHorses, horseIdx],
        winningHorses: [...game.winningHorses, winningHorse]
      };

      const lostContainer = buildComponentsV2(lostData, 'lost', { winningHorse, chosenHorse: horseIdx });
      await i.editReply({
        embeds: [],
        content: null,
        components: [lostContainer],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }
  });
}

module.exports = {
  name: "race",
  aliases: ["hr", "horserace"],
  category: "gamble",
  data: new SlashCommandBuilder()
    .setName("race")
    .setDescription("Chơi trò chơi đua ngựa (Horse Race)!")
    .addStringOption((option) =>
      option
        .setName("bet")
        .setDescription("Số coke muốn cược (ví dụ: 10000, all, min)")
        .setRequired(false)
    ),

  async execute(context, arg2, arg3, arg4) {
    const isSlash = !context.author;
    const userId = isSlash ? context.user.id : context.author.id;
    
    let betInput = isSlash ? context.options.getString("bet") : (arg2[0] || null);
    let activeGame = await HorseRaceGame.findOne({ userId });

    if (activeGame) {
      const container = buildComponentsV2(activeGame, 'resume');
      let replyMsg;
      if (isSlash) {
        replyMsg = await context.reply({
          embeds: [],
          content: null,
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          fetchReply: true
        });
      } else {
        replyMsg = await context.reply({
          embeds: [],
          content: null,
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const filter = (i) => i.user.id === userId && (i.customId.startsWith('race_horse_') || i.customId === 'race_cashout');
      const collector = replyMsg.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button
      });

      setupCollector(collector, replyMsg, activeGame, userId, isSlash, context);
      return;
    }

    const finalBetInput = betInput || "10";

    const remainingCooldown = checkAndSetCooldown(userId, "race", CONFIG.COOLDOWN_SECONDS);
    if (remainingCooldown > 0) {
      return context.reply({
        content: `⏱ | Vui lòng chờ **${remainingCooldown}s** để chơi tiếp Horse Race.`,
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

    const gameData = {
      userId,
      bet: betAmount,
      winningHorses: [],
      round: 0,
      selectedHorses: [],
      cashOut: 0,
      status: 'active'
    };

    try {
      const startRaceTxn = async (session) => {
        await User.updateOne(
          { userId },
          { $inc: { coke: -betAmount } }
        ).session(session);

        await HorseRaceGame.create([gameData], { session });
      };

      await runTransactionWithRetry(startRaceTxn);
    } catch (err) {
      console.error("Lỗi khi bắt đầu game HorseRace:", err);
      return context.reply({
        content: "❌ Không thể bắt đầu trò chơi đua ngựa do lỗi giao dịch dữ liệu. Hãy thử lại!",
        ephemeral: true
      });
    }

    const container = buildComponentsV2(gameData, 'start');
    let replyMsg;
    if (isSlash) {
      replyMsg = await context.reply({
        embeds: [],
        content: null,
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        fetchReply: true
      });
    } else {
      replyMsg = await context.reply({
        embeds: [],
        content: null,
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const filter = (i) => i.user.id === userId && (i.customId.startsWith('race_horse_') || i.customId === 'race_cashout');
    const collector = replyMsg.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button
    });

    setupCollector(collector, replyMsg, gameData, userId, isSlash, context);
  }
};
