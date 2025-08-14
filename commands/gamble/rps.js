const User = require('../../models/User');
const RPSGame = require('../../models/RPSGame');
const { setCooldown, getRemainingCooldown } = require('../../utils/cooldown');
const { getCoke, debitIfEnough, credit, adjustCoke } = require('../../utils/cokeManager');

const EMOJIS = { keo: '✌️', bua: '👊', bao: '🖐️' };
const choices = ['keo', 'bua', 'bao'];
const cooldownSeconds = 15;
const maxBet = 250_000;

const games = new Map();

module.exports = {
  name: 'rps',
  description: 'Chơi kéo-búa-bao có cược, react emoji để chơi, resume được',
  async execute(message, args) {
    try {
      const userId = message.author.id;
      const cooldown = getRemainingCooldown(userId, 'rps');
      if (cooldown > 0) return notifyCooldown(message, cooldown);
      setCooldown(userId, 'rps', cooldownSeconds);

      let ongoingGame = await RPSGame.findOne({ userId, active: true });
      if (ongoingGame) return resumeGame(message, userId, ongoingGame);

      const balance = await getCoke(userId);
      const bet = parseBet(args[0], balance);
      if (!bet) return message.reply('❌ Số tiền cược không hợp lệ hoặc bạn không đủ coke!');

      const deb = await debitIfEnough(userId, bet);
      if (!deb.ok) return message.reply('❌ | Bạn không đủ coke để cược!');

      const newGame = await RPSGame.create({
        userId,
        bet,
        playerChoice: null,
        botChoice: null,
        active: true,
        date: new Date(),
      });

      games.set(userId, newGame);
      return startGame(message, userId, newGame);
    } catch (err) {
      console.error('RPS Command Error:', err);
      message.reply('❌ Có lỗi xảy ra khi bắt đầu ván kéo-búa-bao.');
    }
  },
};

function parseBet(arg, coke) {
  if (!arg) return null;
  if (arg === 'all') return Math.min(coke, maxBet);
  const bet = parseInt(String(arg).replace(/[,\.]/g, ''));
  if (isNaN(bet) || bet <= 0 || bet > coke) return null;
  return Math.min(bet, maxBet);
}

function notifyCooldown(message, cooldown) {
  return message.reply(`⏱ | Vui lòng chờ **${cooldown}s** để chơi lại.`).then((msg) => {
    let remaining = cooldown;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) msg.edit(`⏱ | Vui lòng chờ **${remaining}s** để chơi lại.`);
      else {
        clearInterval(interval);
        msg.delete().catch(() => {});
      }
    }, 1000);
  });
}

async function resumeGame(message, userId, gameData) {
  if (gameData.playerChoice) {
    return finishGame(message, userId, gameData);
  }

  const displayName = message.author.username || 'Bạn';
  const text = `<:rice:1396919696581857290> | **${displayName}** cược **${gameData.bet.toLocaleString()}** coke và chọn ...`;
  const msg = await message.reply(text);

  for (const emoji of Object.values(EMOJIS)) await msg.react(emoji);

  games.set(userId, { ...gameData.toObject?.() ?? gameData, message: msg });
  setupCollector(message, userId, msg);
}

async function startGame(message, userId, game) {
  const displayName = message.author.username || 'Bạn';
  const text = `<:rice:1396919696581857290> | **${displayName}** cược **${game.bet.toLocaleString()}** coke và chọn ...`;
  const msg = await message.reply(text);

  for (const emoji of Object.values(EMOJIS)) await msg.react(emoji);

  games.set(userId, { ...game.toObject?.() ?? game, message: msg });
  setupCollector(message, userId, msg);
}

function setupCollector(message, userId, msg) {
  const filter = (reaction, userReact) =>
    Object.values(EMOJIS).includes(reaction.emoji.name) && userReact.id === userId;

  const collector = msg.createReactionCollector({ filter, time: 60_000, max: 1 });

  collector.on('collect', async (reaction, userReact) => {
    collector.stop();

    const playerChoice = Object.entries(EMOJIS).find(([k, v]) => v === reaction.emoji.name)[0];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let game = games.get(userId);
    if (!game) return;

    game.playerChoice = playerChoice;
    game.botChoice = botChoice;

    await RPSGame.updateOne({ userId, active: true }, { playerChoice, botChoice });
    await finishGame(message, userId, game);
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'time') {
      const game = games.get(userId);
      if (!game) return;

      await credit(userId, game.bet); 
      await message.channel.send(`⏱ | Hết thời gian chọn, cược đã được hoàn lại cho bạn.`);

      games.delete(userId);
      await RPSGame.deleteOne({ userId, active: true });
      try { await game.message.delete().catch(() => {}); } catch {}
    }
  });
}

async function finishGame(message, userId, game) {
  const { playerChoice, botChoice, bet } = game;
  const displayName = message.author.username || 'Bạn';

  let resultText = '';
  let reward = 0;

  if (playerChoice === botChoice) {
    resultText = `<:blank:1403928807395819671> **| Coke** ra **${botChoice}** và bạn nhận lại **${bet.toLocaleString()} coke.**`;
    reward = bet;
  } else if (
    (playerChoice === 'keo' && botChoice === 'bao') ||
    (playerChoice === 'bua' && botChoice === 'keo') ||
    (playerChoice === 'bao' && botChoice === 'bua')
  ) {
    resultText = `<:blank:1403928807395819671> **| Coke** ra **${botChoice}** và bạn nhận được **${(bet * 2).toLocaleString()} coke.**`;
    reward = bet * 2;
  } else {
    resultText = `<:blank:1403928807395819671> **| Coke** ra **${botChoice}** và bạn mất **${bet.toLocaleString()} coke.**`;
    reward = 0;
  }

  if (reward > 0) await adjustCoke(userId, reward);

  games.delete(userId);
  await RPSGame.deleteOne({ userId, active: true });

  await game.message.edit({
    content:
      `<:rice:1396919696581857290> | **${displayName}** cược **${bet.toLocaleString()} coke** và chọn **${playerChoice}**\n` +
      `${resultText}`,
  });
}
