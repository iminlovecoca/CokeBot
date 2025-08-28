const { getGame, addGame, delGame } = require('../../utils/rpsUtil')
const {
	setCooldown,
	getRemainingCooldown,
	notifyCooldown
} = require('../../utils/cooldown')
const { decBalance, incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const config = require('../../data/config.json')

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
        await rps(message, game.bet, game.botChoice)
      } else {
        let bet = args.length == 0 ? 'min' : args[0]
        const betAmount = await getBetAmount(bet, userId, maxBet, minBet)
        botChoice = choices[Math.floor(Math.random() * choices.length)]
        await decBalance(userId, betAmount)
        await addGame(userId, betAmount, botChoice)
        await rps(message, betAmount, botChoice)
      }
    } catch (error) {
      return await message.reply(error.message)
    }
  }
}

const rps = async (message, bet, botChoice) => {
	const userId = message.author.id
	const displayName = message.author.username || 'Bạn'
  const text = `${config.emoji.dice} | **${displayName}** cược **${bet.toLocaleString()}** coke và chọn ...`
  const sentMessage = await message.reply(text)
  for (const emoji of Object.values(EMOJIS)) {
  	await sentMessage.react(emoji)
  }

	const filter = (reaction, user) =>
    Object.values(EMOJIS).includes(reaction.emoji.name) && user.id === userId
  const collector = sentMessage.createReactionCollector({ filter, time: 60000, max: 1 })

  collector.on('collect', async (reaction, userReact) => {
    collector.stop()
    const playerChoice = Object.entries(EMOJIS).find(([k, v]) => v === reaction.emoji.name)[0]
    let resultText = ''
	  let reward = 0

	  if (playerChoice === botChoice) {
	    resultText = `${config.emoji.blank} **| Coke** ra **${botChoice}** và bạn nhận lại **${bet.toLocaleString()} coke.**`
	    reward = bet
	  } else if (
	  	(playerChoice === 'keo' && botChoice === 'bao') ||
	    (playerChoice === 'bua' && botChoice === 'keo') ||
	    (playerChoice === 'bao' && botChoice === 'bua')
	  ) {
	    resultText = `${config.emoji.blank} **| Coke** ra **${botChoice}** và bạn nhận được **${(bet * 2).toLocaleString()} coke.**`
	    reward = bet * 2
	  } else {
	    resultText = `${config.emoji.blank} **| Coke** ra **${botChoice}** và bạn mất **${bet.toLocaleString()} coke.**`
	    reward = 0
	  }

	  if (reward > 0) await incBalance(userId, reward)
	  await delGame(userId)

	  await sentMessage.edit({
	    content:
	      `${config.emoji.dice} | **${displayName}** cược **${bet.toLocaleString()} coke** và chọn **${playerChoice}**\n` +
	      `${resultText}`,
	  })
  })

  collector.on('end', (_, reason) => {
    if (reason == 'time')
      sentMessage.edit('**⏱ |** Đã hết thời gian tương tác. Nhập `!rps` để tiếp tục!')
  })
}