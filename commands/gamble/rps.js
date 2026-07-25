const {
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
const BaseCommand = require('../../core/BaseCommand');
const { getGame, addGame, delGame, claimGame } = require('../../utils/rpsUtil');
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown');
const { decBalance, incBalance } = require('../../utils/userUtil');
const { getBetAmount, checkAndClearExpiredGame } = require('../../utils/gameUtil');
const { getDebuffPercentage } = require('../../utils/miscUtil');
const RPSGame = require('../../models/RPSGame');
const config = require('../../data/config');
const emoji = config.emoji;
const currency = emoji.money;
const settings = config.gamble_settings;

const EMOJIS = { keo: '✌️', bua: '👊', bao: '🖐️' };
const choices = ['keo', 'bua', 'bao'];

function buildRpsComponentsV2(game, username, state = 'play', playerChoice = null, resultText = '') {
  const { bet } = game;

  let accentColor = 0x5865F2; // Default blue
  let text = `${config.emoji.dice} **|** **${username}** cược ${currency} **${bet.toLocaleString()}** và chọn ...`;

  if (state === 'resume') {
    text = '▷ Tiếp tục ván chơi cũ\n' + text;
  } else if (state === 'win') {
    accentColor = 0x57F287; // Green
    const playerEmoji = EMOJIS[playerChoice];
    text = `${config.emoji.dice} **| ${username}** cược ${currency} **${bet.toLocaleString()}** và chọn ${playerEmoji}\n${resultText}`;
  } else if (state === 'lost') {
    accentColor = 0xED4245; // Red
    const playerEmoji = EMOJIS[playerChoice];
    text = `${config.emoji.dice} **| ${username}** cược ${currency} **${bet.toLocaleString()}** và chọn ${playerEmoji}\n${resultText}`;
  } else if (state === 'draw') {
    accentColor = 0x9E9E9E; // Grey
    const playerEmoji = EMOJIS[playerChoice];
    text = `${config.emoji.dice} **| ${username}** cược ${currency} **${bet.toLocaleString()}** và chọn ${playerEmoji}\n${resultText}`;
  } else if (state === 'timeout') {
    accentColor = 0xED4245; // Red
    text = `${emoji.no} Hết thời gian. Trò chơi đã kết thúc và bạn bị trừ ${currency} **${bet.toLocaleString()}**.`;
  }

  const textDisplay = new TextDisplayBuilder().setContent(text);
  const separator = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(textDisplay)
    .addSeparatorComponents(separator);

  const isFinished = ['win', 'lost', 'draw', 'timeout'].includes(state);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rps_keo')
      .setLabel('Kéo ✌️')
      .setStyle(isFinished ? (playerChoice === 'keo' && state !== 'timeout' ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Primary)
      .setDisabled(isFinished),
    new ButtonBuilder()
      .setCustomId('rps_bua')
      .setLabel('Búa 👊')
      .setStyle(isFinished ? (playerChoice === 'bua' && state !== 'timeout' ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Primary)
      .setDisabled(isFinished),
    new ButtonBuilder()
      .setCustomId('rps_bao')
      .setLabel('Bao 🖐️')
      .setStyle(isFinished ? (playerChoice === 'bao' && state !== 'timeout' ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Primary)
      .setDisabled(isFinished)
  );

  container.addActionRowComponents(row);

  return container;
}

class RpsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'rps',
      aliases: ['keobuabao', 'kbb'],
      description: 'Chơi kéo-búa-bao có cược sử dụng Component V2',
      usage: `${config.prefix}rps [tiền cược|all]`,
      examples: [
        { intent: 'Chơi kéo-búa-bao cược tất cả tiền', command: `${config.prefix}rps all` },
        { intent: 'Chơi cược 100,000 coke', command: `${config.prefix}rps 100000` }
      ],
      cooldown: 0
    });
  }

  async execute(message, args) {
    const userId = message.author.id;
    const game = await checkAndClearExpiredGame(userId, RPSGame);

    const remainingCooldown = checkAndSetCooldown(userId, 'rps', settings.cooldown_second);
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown);
    }

    if (game) {
      await this.rps(message, game.bet, game.botChoice, true);
    } else {
      let bet = args.length == 0 ? 'min' : args[0];
      const betAmount = await getBetAmount(bet, userId, settings.max_bet, settings.min_bet);
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      await decBalance(userId, betAmount);
      await addGame(userId, betAmount, botChoice);
      await this.rps(message, betAmount, botChoice);
    }
  }

  async rps(message, bet, botChoice, resume = false) {
    const userId = message.author.id;
    const displayName = message.member?.displayName || message.author.username || 'Bạn';

    const gameData = { bet, botChoice };
    const container = buildRpsComponentsV2(gameData, displayName, resume ? 'resume' : 'play');

    const sentMessage = await message.reply({
      content: "",
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const filter = (i) => i.user.id === userId && ['rps_keo', 'rps_bua', 'rps_bao'].includes(i.customId);
    const collector = sentMessage.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

    let isProcessing = false;

    collector.on('collect', async (i) => {
      if (isProcessing) return;
      isProcessing = true;

      await i.deferUpdate().catch(() => {});

      const game = await claimGame(userId);
      if (!game) {
        collector.stop('claimed');
        await i.editReply({
          content: `${emoji.no} Ván chơi đã kết thúc!`,
          components: []
        }).catch(() => {});
        isProcessing = false;
        return;
      }

      const playerChoice = i.customId.replace('rps_', '');
      let currentBotChoice = game.botChoice;

      let resultText = '';
      let reward = 0;
      let stateResult = 'draw';
      const debuffPercentage = await getDebuffPercentage(userId);

      if (playerChoice === currentBotChoice) {
        resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[currentBotChoice]} và bạn nhận lại ${currency} **${bet.toLocaleString()}.**`;
        reward = bet;
        stateResult = 'draw';
      } else if (
        (playerChoice === 'keo' && currentBotChoice === 'bao') ||
        (playerChoice === 'bua' && currentBotChoice === 'keo') ||
        (playerChoice === 'bao' && currentBotChoice === 'bua')
      ) {
        if (Math.random() < debuffPercentage) {
          const winningMoves = { keo: 'bua', bua: 'bao', bao: 'keo' };
          currentBotChoice = winningMoves[playerChoice];
          resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[currentBotChoice]} và bạn mất ${currency} **${bet.toLocaleString()}.**`;
          reward = 0;
          stateResult = 'lost';
        } else {
          resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[currentBotChoice]} và bạn nhận được ${currency} **${(bet * 2).toLocaleString()}.**`;
          reward = bet * 2;
          stateResult = 'win';
        }
      } else {
        resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[currentBotChoice]} và bạn mất ${currency} **${bet.toLocaleString()}.**`;
        reward = 0;
        stateResult = 'lost';
      }

      if (reward > 0) await incBalance(userId, reward);
      await delGame(userId);

      const finishedContainer = buildRpsComponentsV2(
        { bet, botChoice: currentBotChoice },
        displayName,
        stateResult,
        playerChoice,
        resultText
      );

      await i.editReply({
        content: "",
        components: [finishedContainer],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});

      collector.stop('finished');
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await delGame(userId);
        const timeoutContainer = buildRpsComponentsV2({ bet, botChoice }, displayName, 'timeout');
        await sentMessage.edit({
          content: "",
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }
    });
  }
}

module.exports = new RpsCommand();
