const { getGame, addGame, delGame, claimGame } = require('../../utils/rpsUtil')
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown')
const { decBalance, incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const { getDebuffPercentage } = require('../../utils/miscUtil')
const config = require('../../data/config')
const emoji = config.emoji
const currency = emoji.money
const settings = config.gamble_settings

const EMOJIS = { keo: '✌️', bua: '👊', bao: '🖐️' }
const choices = ['keo', 'bua', 'bao']

module.exports = {
  name: 'rps',
  aliases: ['keobuabao', 'kbb'],
  description: 'Chơi kéo-búa-bao có cược, react emoji để chơi',
  usage: '`!rps [tiền cược|all]`',
  examples: '`!rps all`\n`!kbb 100000`',
  async execute(message, args) {
    const userId = message.author.id
    const game = await getGame(userId)

    const remainingCooldown = checkAndSetCooldown(userId, 'rps', settings.cooldown_second)
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown)
    }

    if (game) {
      await rps(message, game.bet, game.botChoice, true)
    } else {
      let bet = args.length == 0 ? 'min' : args[0]
      const betAmount = await getBetAmount(bet, userId, settings.max_bet, settings.min_bet)
      const botChoice = choices[Math.floor(Math.random() * choices.length)]
      await decBalance(userId, betAmount)
      await addGame(userId, betAmount, botChoice)
      await rps(message, betAmount, botChoice)
    }
  }
}

const rps = async (message, bet, botChoice, resume) => {
  const userId = message.author.id
  const displayName = message.member?.displayName || message.author.username || 'Bạn';
  const botEmoji = EMOJIS[botChoice]

  let text = `${config.emoji.dice} **|** **${displayName}** cược ${currency} **${bet.toLocaleString()}** và chọn ...`
  if (resume) text = '▷ Tiếp tục ván chơi cũ\n' + text

  const sentMessage = await message.reply(text)
  for (const emoji of Object.values(EMOJIS)) {
    await sentMessage.react(emoji)
  }

  const filter = (reaction, user) =>
    Object.values(EMOJIS).includes(reaction.emoji.name) && user.id === userId
  const collector = sentMessage.createReactionCollector({ filter, time: 60000, max: 1 })

  collector.on('collect', async (reaction) => {
    collector.stop()
    const game = await claimGame(message.author.id)
    if (!game) {
      return sentMessage.edit(`${emoji.no} Ván chơi đã kết thúc!`)
    }
    const { bet, botChoice } = game

    const playerChoice = Object.entries(EMOJIS).find(([k, v]) => v === reaction.emoji.name)[0]
    const playerEmoji = EMOJIS[playerChoice]

    let resultText = ''
    let reward = 0
    const debuffPercentage = await getDebuffPercentage(userId)

    if (playerChoice === botChoice) {
      resultText = `${config.emoji.blank} **| Coke** ra ${botEmoji} và bạn nhận lại ${currency} **${bet.toLocaleString()}.**`
      reward = bet
    } else if (
      (playerChoice === 'keo' && botChoice === 'bao') ||
      (playerChoice === 'bua' && botChoice === 'keo') ||
      (playerChoice === 'bao' && botChoice === 'bua')
    ) {
      if (Math.random() < debuffPercentage) {
        const winningMoves = { keo: 'bua', bua: 'bao', bao: 'keo' };
        botChoice = winningMoves[playerChoice];
        resultText = `${config.emoji.blank} **| Coke** ra ${EMOJIS[botChoice]} và bạn mất ${currency} **${bet.toLocaleString()}.**`
        reward = 0
      } else {
        resultText = `${config.emoji.blank} **| Coke** ra ${botEmoji} và bạn nhận được ${currency} **${(bet * 2).toLocaleString()}.**`
        reward = bet * 2
      }
    } else {
      resultText = `${config.emoji.blank} **| Coke** ra ${botEmoji} và bạn mất ${currency} **${bet.toLocaleString()}.**`
      reward = 0
    }

    if (reward > 0) await incBalance(userId, reward)
    await delGame(userId)

    await sentMessage.edit(
        `${config.emoji.dice} **|** **${displayName}** cược ${currency} **${bet.toLocaleString()}** và chọn ${playerEmoji}\n` +
        `${resultText}`
    )
  })

  collector.on('end', (_, reason) => {
    if (reason == 'time')
      sentMessage.edit('**⏱ |** Đã hết thời gian tương tác. Nhập `!rps` để tiếp tục!')
  })
}
