const { getGame, addGame, delGame } = require('../../utils/rpsUtil')
const {
  setCooldown,
  getRemainingCooldown,
  notifyCooldown
} = require('../../utils/cooldown')
const { decBalance, incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const config = require('../../data/config')
const emoji = config.emoji
const currency = emoji.money

const EMOJIS = { keo: '✌️', bua: '👊', bao: '🖐️' }
const choices = ['keo', 'bua', 'bao']
const maxBet = 250000
const minBet = 1
const cooldownSeconds = 15

module.exports = {
  name: 'rps',
  aliases: ['keobuabao', 'kbb'],
  description: 'Chơi kéo-búa-bao có cược, react emoji để chơi',
  async execute(message, args) {
    try {
      const userId = message.author.id
      const game = await getGame(userId)

      const cooldown = getRemainingCooldown(userId, 'rps')
      if (cooldown > 0) return notifyCooldown(message, cooldown)
      setCooldown(userId, 'rps', cooldownSeconds)

      if (game) {
        await rps(message, game.bet, game.botChoice, true)
      } else {
        let bet = args.length == 0 ? 'min' : args[0]
        const betAmount = await getBetAmount(bet, userId, maxBet, minBet)
        const botChoice = choices[Math.floor(Math.random() * choices.length)]
        await decBalance(userId, betAmount)
        await addGame(userId, betAmount, botChoice)
        await rps(message, betAmount, botChoice)
      }
    } catch (error) {
      return await message.reply(error.message)
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
    const game = await getGame(message.author.id)
    if (!game) {
      sentMessage.edit('**❌ |** Ván chơi đã kết thúc!')
      return
    } 

    const playerChoice = Object.entries(EMOJIS).find(([k, v]) => v === reaction.emoji.name)[0]
    const playerEmoji = EMOJIS[playerChoice]

    let resultText = ''
    let reward = 0

    if (playerChoice === botChoice) {
      resultText = `${config.emoji.blank} **| Coke** ra ${botEmoji} và bạn nhận lại ${currency} **${bet.toLocaleString()}.**`
      reward = bet
    } else if (
      (playerChoice === 'keo' && botChoice === 'bao') ||
      (playerChoice === 'bua' && botChoice === 'keo') ||
      (playerChoice === 'bao' && botChoice === 'bua')
    ) {
      resultText = `${config.emoji.blank} **| Coke** ra ${botEmoji} và bạn nhận được ${currency} **${(bet * 2).toLocaleString()}.**`
      reward = bet * 2
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
