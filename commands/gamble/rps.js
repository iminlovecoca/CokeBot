const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
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

class RpsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'rps',
      aliases: ['keobuabao', 'kbb'],
      description: 'Chơi kéo-búa-bao có cược sử dụng nút bấm tương tác',
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

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rps_keo')
        .setLabel('Kéo ✌️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rps_bua')
        .setLabel('Búa 👊')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rps_bao')
        .setLabel('Bao 🖐️')
        .setStyle(ButtonStyle.Primary)
    );

    let text = `${config.emoji.dice} **|** **${displayName}** cược ${currency} **${bet.toLocaleString()}** và chọn ...`;
    if (resume) text = '▷ Tiếp tục ván chơi cũ\n' + text;

    const sentMessage = await message.reply({
      content: text,
      components: [row]
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
        await sentMessage.edit({
          content: `${emoji.no} Ván chơi đã kết thúc!`,
          components: []
        }).catch(() => {});
        isProcessing = false;
        return;
      }

      const playerChoice = i.customId.replace('rps_', '');
      const playerEmoji = EMOJIS[playerChoice];
      let currentBotChoice = game.botChoice;

      let resultText = '';
      let reward = 0;
      const debuffPercentage = await getDebuffPercentage(userId);

      if (playerChoice === currentBotChoice) {
        resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[currentBotChoice]} và bạn nhận lại ${currency} **${bet.toLocaleString()}.**`;
        reward = bet;
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
        } else {
          resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[currentBotChoice]} và bạn nhận được ${currency} **${(bet * 2).toLocaleString()}.**`;
          reward = bet * 2;
        }
      } else {
        resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[currentBotChoice]} và bạn mất ${currency} **${bet.toLocaleString()}.**`;
        reward = 0;
      }

      if (reward > 0) await incBalance(userId, reward);
      await delGame(userId);

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rps_keo')
          .setLabel('Kéo ✌️')
          .setStyle(playerChoice === 'keo' ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('rps_bua')
          .setLabel('Búa 👊')
          .setStyle(playerChoice === 'bua' ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('rps_bao')
          .setLabel('Bao 🖐️')
          .setStyle(playerChoice === 'bao' ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await sentMessage.edit({
        content: `${config.emoji.dice} **| ${displayName}** cược ${currency} **${bet.toLocaleString()}** và chọn ${playerEmoji}\n${resultText}`,
        components: [disabledRow]
      }).catch(() => {});

      collector.stop('finished');
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await delGame(userId);
        const timeoutRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('rps_keo').setLabel('Kéo ✌️').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('rps_bua').setLabel('Búa 👊').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('rps_bao').setLabel('Bao 🖐️').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        await sentMessage.edit({
          content: `${emoji.no} Hết thời gian. Trò chơi đã kết thúc và bạn bị trừ ${currency} **${bet.toLocaleString()}**.`,
          components: [timeoutRow]
        }).catch(() => {});
      }
    });
  }
}

module.exports = new RpsCommand();
