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
const MinesGame = require("../../models/MinesGame");

const CONFIG = {
  MIN_BET: 10,
  MAX_BET: config.gamble_settings.max_bet || 250000,
  COOLDOWN_SECONDS: 15,
  EMOJIS: {
    money: config.emoji.money || "<:cokecy:1509951335016173662>"
  }
};

function choose(n, r) {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = res * (n - i + 1) / i;
  }
  return res;
}

function getMinesMultiplier(minesCount, revealedCount) {
  if (revealedCount === 0) return 0.0;
  const totalCells = 9;
  const diamondsCount = totalCells - minesCount;
  if (revealedCount > diamondsCount) return 0.0;

  if (minesCount === 3) {
    const lut = [0.0, 1.40, 2.20, 3.90, 7.80, 19.50, 78.00];
    return lut[revealedCount] || 0.0;
  }

  const waysTotal = choose(totalCells, revealedCount);
  const waysDiamonds = choose(diamondsCount, revealedCount);
  if (waysDiamonds === 0) return 0.0;

  const fairMultiplier = waysTotal / waysDiamonds;
  const RTP = 0.93;
  return Number((fairMultiplier * RTP).toFixed(2));
}

function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

function generateGrid(minesCount) {
  const grid = [];
  for (let i = 0; i < minesCount; i++) {
    grid.push('mine');
  }
  const diamondsCount = 9 - minesCount;
  for (let i = 0; i < diamondsCount; i++) {
    grid.push('diamond');
  }
  
  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }
  return grid;
}

function buildButtons(grid, revealed, isFinished, activeGame = null) {
  const rows = [];
  
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const btn = new ButtonBuilder().setCustomId(`mines_cell_${idx}`);
      
      const isCellRevealed = revealed[idx];
      const isCellMine = grid[idx] === 'mine';
      
      if (isFinished) {
        btn.setDisabled(true);
        if (isCellMine) {
          if (activeGame && activeGame.explodedCellIndex === idx) {
            btn.setStyle(ButtonStyle.Danger).setEmoji('💥');
          } else {
            btn.setStyle(ButtonStyle.Secondary).setEmoji('💣');
          }
        } else {
          if (isCellRevealed) {
            btn.setStyle(ButtonStyle.Success).setEmoji('💎');
          } else {
            btn.setStyle(ButtonStyle.Secondary).setEmoji('💎');
          }
        }
      } else {
        if (isCellRevealed) {
          btn.setStyle(ButtonStyle.Success).setEmoji('💎').setDisabled(true);
        } else {
          btn.setStyle(ButtonStyle.Secondary).setLabel('?').setDisabled(false);
        }
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }

  const btnCashOut = new ButtonBuilder()
    .setCustomId('mines_cashout')
    .setLabel('Cash Out')
    .setStyle(ButtonStyle.Success)
    .setEmoji(CONFIG.EMOJIS.money);

  const revealedCount = revealed.filter(Boolean).length;
  if (isFinished) {
    btnCashOut.setDisabled(true);
  } else if (revealedCount === 0) {
    btnCashOut.setDisabled(true);
  } else {
    btnCashOut.setDisabled(false);
  }

  const row4 = new ActionRowBuilder().addComponents(btnCashOut);
  rows.push(row4);
  
  return rows;
}

function buildEmbed(userId, gameData, state) {
  const embed = new EmbedBuilder();
  let embedColor = 0x615F5F; // Mặc định xám
  let headerText = "";
  
  if (state === 'start') {
    headerText = `💣 **<@${userId}> started a mines game.**`;
  } else if (state === 'play') {
    headerText = `💣 **<@${userId}> is playing a mines game.**`;
  } else if (state === 'cashout') {
    embedColor = 0x57F287; // Xanh lá
    headerText = `💎 **<@${userId}> cashed out!**`;
  } else if (state === 'lost') {
    embedColor = 0xED4245; // Đỏ
    headerText = `💥 **<@${userId}> touched a mine!**`;
  } else if (state === 'resume') {
    headerText = `💣 **<@${userId}> resumed a mines game.**`;
  }

  const { bet, minesCount, cashOut, revealed } = gameData;
  const revealedCount = revealed.filter(Boolean).length;
  const currentMultiplier = getMinesMultiplier(minesCount, revealedCount);
  const nextMultiplier = getMinesMultiplier(minesCount, revealedCount + 1);
  const nextPayout = bet * nextMultiplier;

  const isFinished = state === 'cashout' || state === 'lost';

  const descriptionLines = [headerText, ""];
  descriptionLines.push(`-# **Bet:** \`${formatNumber(bet)}\`  **Mines:** \`${minesCount}\``);

  if (isFinished) {
    if (state === 'cashout') {
      descriptionLines.push(`-# ~~**Winnings:** \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\`~~`);
    } else {
      descriptionLines.push(`-# ~~**Cash Out:** \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\`~~`);
    }
    descriptionLines.push(`-# ~~**Next:** \`${formatNumber(nextPayout)}\` \`(${nextMultiplier.toFixed(2)}x)\`~~`);
  } else {
    descriptionLines.push(`-# **Cash Out:** \`${formatNumber(cashOut)}\` \`(${currentMultiplier.toFixed(2)}x)\``);
    descriptionLines.push(`-# **Next:** \`${formatNumber(nextPayout)}\` \`(${nextMultiplier.toFixed(2)}x)\``);
  }
  descriptionLines.push("────────────────────────────");

  embed.setDescription(descriptionLines.join('\n'));
  embed.setColor(embedColor);
  
  return embed;
}

function setupCollector(collector, replyMsg, gameData, userId, isSlash, context) {
  collector.on('collect', async (i) => {
    await i.deferUpdate().catch(() => {});

    const game = await MinesGame.findOneAndUpdate(
      { userId, status: 'active' },
      { $set: { status: 'processing' } },
      { new: true }
    );

    if (!game) return;

    const customId = i.customId;

    if (customId === 'mines_cashout') {
      collector.stop('cashout');

      try {
        const cashOutTxn = async (session) => {
          await User.updateOne(
            { userId },
            { $inc: { coke: Math.round(game.cashOut) } }
          ).session(session);

          await MinesGame.deleteOne({ userId }).session(session);
        };

        await runTransactionWithRetry(cashOutTxn);

        const finishedEmbed = buildEmbed(userId, game, 'cashout');
        const finishedComponents = buildButtons(game.grid, game.revealed, true, game);
        await i.editReply({
          embeds: [finishedEmbed],
          components: finishedComponents
        }).catch(() => {});
      } catch (err) {
        console.error("Lỗi khi xử lý rút tiền game Mines:", err);
        await MinesGame.updateOne(
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

    const cellIdx = parseInt(customId.split('_')[2]);
    if (game.revealed[cellIdx]) {
      await MinesGame.updateOne({ userId }, { $set: { status: 'active' } });
      return;
    }

    const nextRevealed = [...game.revealed];
    nextRevealed[cellIdx] = true;

    const isMine = game.grid[cellIdx] === 'mine';

    if (isMine) {
      collector.stop('lost');

      await MinesGame.deleteOne({ userId });

      const updatedData = {
        ...game.toObject(),
        revealed: nextRevealed,
        explodedCellIndex: cellIdx
      };

      const lostEmbed = buildEmbed(userId, updatedData, 'lost');
      const lostComponents = buildButtons(game.grid, nextRevealed, true, updatedData);
      await i.editReply({
        embeds: [lostEmbed],
        components: lostComponents
      }).catch(() => {});
    } else {
      const newRevealedCount = nextRevealed.filter(Boolean).length;
      const newMultiplier = getMinesMultiplier(game.minesCount, newRevealedCount);
      const newCashOut = game.bet * newMultiplier;

      const totalDiamonds = 9 - game.minesCount;

      if (newRevealedCount === totalDiamonds) {
        collector.stop('win');

        try {
          const autoWinTxn = async (session) => {
            await User.updateOne(
              { userId },
              { $inc: { coke: Math.round(newCashOut) } }
            ).session(session);

            await MinesGame.deleteOne({ userId }).session(session);
          };

          await runTransactionWithRetry(autoWinTxn);

          const wonData = {
            ...game.toObject(),
            revealed: nextRevealed,
            cashOut: newCashOut,
            isWon: true
          };

          const finishedEmbed = buildEmbed(userId, wonData, 'cashout');
          const finishedComponents = buildButtons(game.grid, nextRevealed, true, wonData);
          await i.editReply({
            embeds: [finishedEmbed],
            components: finishedComponents
          }).catch(() => {});
        } catch (err) {
          console.error("Lỗi khi tự động thắng game Mines:", err);
          await MinesGame.updateOne(
            { userId },
            { $set: { status: 'active' } }
          );
        }
      } else {
        const updatedGame = await MinesGame.findOneAndUpdate(
          { userId },
          {
            $set: {
              revealed: nextRevealed,
              cashOut: newCashOut,
              status: 'active',
              date: new Date()
            }
          },
          { new: true }
        );

        const playEmbed = buildEmbed(userId, updatedGame, 'play');
        const playComponents = buildButtons(game.grid, nextRevealed, false, updatedGame);
        await i.editReply({
          embeds: [playEmbed],
          components: playComponents
        }).catch(() => {});
      }
    }
  });
}

module.exports = {
  name: "mines",
  aliases: ["min", "ms", "mine"],
  category: "gamble",
  data: new SlashCommandBuilder()
    .setName("mines")
    .setDescription("Chơi trò chơi Dò Mìn (Mines)!")
    .addStringOption((option) =>
      option
        .setName("bet")
        .setDescription("Số coke muốn cược (ví dụ: 10000, all, min)")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("mines")
        .setDescription("Số lượng mìn trong lưới (1 đến 8, mặc định: 3)")
        .setRequired(false)
    ),

  async execute(context, arg2, arg3, arg4) {
    const isSlash = !context.author;
    const userId = isSlash ? context.user.id : context.author.id;
    
    let betInput = null;
    let minesInput = 3;

    if (isSlash) {
      betInput = context.options.getString("bet");
      minesInput = context.options.getInteger("mines") || 3;
    } else {
      betInput = arg2[0] || null;
      if (arg2[1]) {
        const val = parseInt(arg2[1]);
        if (!isNaN(val)) minesInput = val;
      }
    }

    if (minesInput < 1 || minesInput > 8) {
      return context.reply({
        content: "❌ Số lượng mìn chỉ được phép từ 1 đến 8 mìn!",
        ephemeral: true
      });
    }

    let activeGame = await MinesGame.findOne({ userId });

    if (activeGame) {
      const embed = buildEmbed(userId, activeGame, 'resume');
      const components = buildButtons(activeGame.grid, activeGame.revealed, false, activeGame);

      let replyMsg;
      if (isSlash) {
        replyMsg = await context.reply({
          embeds: [embed],
          components: components,
          fetchReply: true
        });
      } else {
        replyMsg = await context.reply({
          embeds: [embed],
          components: components
        });
      }

      const filter = (i) => i.user.id === userId && (i.customId.startsWith('mines_cell_') || i.customId === 'mines_cashout');
      const collector = replyMsg.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button
      });

      setupCollector(collector, replyMsg, activeGame, userId, isSlash, context);
      return;
    }

    const finalBetInput = betInput || "10";

    const remainingCooldown = checkAndSetCooldown(userId, "mines", CONFIG.COOLDOWN_SECONDS);
    if (remainingCooldown > 0) {
      return context.reply({
        content: `⏱ | Vui lòng chờ **${remainingCooldown}s** để chơi tiếp Mines.`,
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

    const grid = generateGrid(minesInput);
    const gameData = {
      userId,
      bet: betAmount,
      minesCount: minesInput,
      grid: grid,
      revealed: [false, false, false, false, false, false, false, false, false],
      cashOut: 0,
      status: 'active'
    };

    try {
      const startMinesTxn = async (session) => {
        await User.updateOne(
          { userId },
          { $inc: { coke: -betAmount } }
        ).session(session);

        await MinesGame.create([gameData], { session });
      };

      await runTransactionWithRetry(startMinesTxn);
    } catch (err) {
      console.error("Lỗi khi bắt đầu game Mines:", err);
      return context.reply({
        content: "❌ Không thể bắt đầu trò chơi dò mìn do lỗi giao dịch dữ liệu. Hãy thử lại!",
        ephemeral: true
      });
    }

    const embed = buildEmbed(userId, gameData, 'start');
    const components = buildButtons(grid, gameData.revealed, false, gameData);

    let replyMsg;
    if (isSlash) {
      replyMsg = await context.reply({
        embeds: [embed],
        components: components,
        fetchReply: true
      });
    } else {
      replyMsg = await context.reply({
        embeds: [embed],
        components: components
      });
    }

    const filter = (i) => i.user.id === userId && (i.customId.startsWith('mines_cell_') || i.customId === 'mines_cashout');
    const collector = replyMsg.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button
    });

    setupCollector(collector, replyMsg, gameData, userId, isSlash, context);
  }
};
