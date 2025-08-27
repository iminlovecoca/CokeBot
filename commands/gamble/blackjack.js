const {
  formatCards,
  createNewDeck,
  drawNewCard,
  getBestHandValue,
  getGame,
  addGame,
  delGame,
  updateGame,
  isBust,
  isBlackJack,
  isDoubleAce,
  isFiveCard,
  isDealerStay
} = require('../../utils/blackJackUtil')
const {
  setCooldown,
  getRemainingCooldown,
  notifyCooldown
} = require('../../utils/cooldown')
const { decBalance, incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const config = require('../../data/config.json')
const emoji = config.emoji

const hitEmoji = '👊'
const standEmoji = '🛑'
const maxBet = 250000
const minBet = 1
const cooldownSeconds = 15

module.exports = {
  name: 'bj',
  description: 'Chơi bài xì dách (blackjack) bằng emoji',
  execute: async (message, args) => {
    try {
      const userId = message.author.id
      const game = await getGame(userId)

      const cooldown = getRemainingCooldown(userId, 'bj')
      if (cooldown > 0) return notifyCooldown(message, cooldown)
      setCooldown(userId, 'bj', cooldownSeconds)

      if (game) {
        const playerHand = game.player
        const dealerHand = game.dealer
        const deck = game.deck
        await blackjack(message, playerHand, dealerHand, deck, game.bet, true)
      } else {
        let bet = args.length == 0 ? 'min' : args[0]
        const betAmount = await getBetAmount(bet, userId, maxBet, minBet)
        const deck = createNewDeck()
        const playerHand = [drawNewCard(deck), drawNewCard(deck)]
        const dealerHand = [drawNewCard(deck), drawNewCard(deck)]
        await decBalance(userId, betAmount)
        await addGame(userId, betAmount, playerHand, dealerHand, deck)
        await blackjack(message, playerHand, dealerHand, deck, betAmount)
      }
    } catch (error) {
      return await message.reply(error.message)
    }
  }
}

const blackjack = async (message, playerHand, dealerHand, deck, bet, resume) => {
  const embed = generateEmbed(message.author, playerHand, dealerHand, bet)
  const filter = (reaction, user) =>
    [hitEmoji, standEmoji].includes(reaction.emoji.name) && user.id === message.author.id
  if (resume) {
    embed.footer.text = `🎲 ~ Tiếp tục ván bài cũ!`
  }

  const sentMessage = await message.reply({ embeds: [embed] })
  await sentMessage.react(hitEmoji)
  await sentMessage.react(standEmoji)

  const collector = sentMessage.createReactionCollector({ filter, time: 60000 })

  collector.on('collect', async (react) => {
    if (react.emoji.name === hitEmoji) {
      await handleHit(sentMessage, message.author, playerHand, dealerHand, deck, bet, collector)
    } else {
      collector.stop()
      await handleStand(sentMessage, message.author, playerHand, dealerHand, deck, bet, collector)
    }
    await react.users.remove(message.author.id).catch(() => { })
  })

  collector.on('end', (_, reason) => {
    if (reason == 'time')
      sentMessage.edit('**⏱ |** Đã hết thời gian tương tác. Nhập `!bj` để tiếp tục!')
  })
}

const generateEmbed = (author, playerHand, dealerHand, bet, hide = true, result, embedColor) => {
  let color = 8240363
  let footer = '🎲 ~ Ván bài đang diễn ra'
  let dealerValue = getBestHandValue(dealerHand, hide)
  if (result) {
    color = embedColor
    footer = `🎲 ~ ${result}`
  } else {
    dealerValue += '+?'
  }

  const embed = {
    color: color,
    footer: { text: footer },
    author: {
      name: `${author.username}, bạn cược ${bet} coke để chơi xì dách`,
      iconURL: author.displayAvatarURL({ dynamic: true, size: 1024 })
    },
    fields: [
      {
        name: `Dealer [${dealerValue}]`,
        value: formatCards(dealerHand, hide),
        inline: true
      },
      {
        name: `${author.username} [${getBestHandValue(playerHand)}]`,
        value: formatCards(playerHand),
        inline: true
      },
    ]
  }
  return embed
}

const handleHit = async (message, author, playerHand, dealerHand, deck, bet, collector) => {
  const card = drawNewCard(deck)
  playerHand.push(card)
  if (isBust(playerHand) || isFiveCard(playerHand)) {
    collector.stop()
    await handleStand(message, author, playerHand, dealerHand, deck, bet, collector)
  } else {
    await updateGame(author.id, card)
    await message.edit({
      embeds: [generateEmbed(author, playerHand, dealerHand, bet)]
    })
  }
}

const handleStand = async (message, author, playerHand, dealerHand, deck, bet, collector) => {
  while (!isDealerStay(dealerHand) && dealerHand.length < 5) {
    card = drawNewCard(deck)
    dealerHand.push(card)
  }

  const playerValue = getBestHandValue(playerHand)
  const dealerValue = getBestHandValue(dealerHand)

  const playerSpecial = isDoubleAce(playerHand)
    ? 'Xì bàng'
    : isBlackJack(playerHand)
      ? 'Xì dách'
      : isFiveCard(playerHand)
        ? 'Ngũ linh'
        : null
  const dealerSpecial = isDoubleAce(dealerHand)
    ? 'Xì bàng'
    : isBlackJack(dealerHand)
      ? 'Xì dách'
      : isFiveCard(dealerHand)
        ? 'Ngũ linh'
        : null

  let reward = 0;
  let net = 0;
  let result = '';

  if (playerSpecial && !dealerSpecial) {
    reward = bet * 3;
    net = reward - bet;
    result = `${playerSpecial}, bạn thắng **${net.toLocaleString()} coke**!`;
  } else if (!playerSpecial && dealerSpecial) {
    reward = 0;
    net = -bet;
    result = `Dealer thắng với ${dealerSpecial}! Bạn mất **${bet.toLocaleString()} coke**.`;
  } else if (playerSpecial && dealerSpecial) {
    const rank = { 'Xì bàng': 3, 'Xì dách': 2, 'Ngũ linh': 1 };
    if (rank[playerSpecial] > rank[dealerSpecial]) {
      reward = bet * 3;
      net = reward - bet;
      result = `${playerSpecial}, bạn thắng **${net.toLocaleString()} coke**!`;
    } else if (rank[playerSpecial] < rank[dealerSpecial]) {
      reward = 0;
      net = -bet;
      result = `Dealer thắng với ${dealerSpecial}! Bạn mất **${bet.toLocaleString()} coke**.`;
    } else {
      reward = bet;
      net = 0;
      result = `Hoà! cả hai cùng có ${playerSpecial}, bạn nhận lại **${bet.toLocaleString()} coke**.`;
    }
  } else if (isBust(playerHand) && isBust(dealerHand)) {
    reward = bet;
    net = 0;
    result = `Hoà! Cả hai đều ngoắc, bạn nhận lại **${bet.toLocaleString()} coke**.`;
  } else if (isBust(playerHand)) {
    reward = 0;
    net = -bet;
    result = `Bạn mất **${bet.toLocaleString()} coke**!`;
  } else if (isBust(dealerHand) || playerValue > dealerValue) {
    reward = bet * 2;
    net = reward - bet;
    result = `Bạn thắng **${net.toLocaleString()} coke**!`;
  } else if (playerValue < dealerValue) {
    reward = 0;
    net = -bet;
    result = `Bạn mất **${bet.toLocaleString()} coke**!`;
  } else {
    reward = bet;
    net = 0;
    result = `Hoà, bạn nhận lại **${bet.toLocaleString()} coke**.`;
  }

  if (reward > 0) await incBalance(author.id, reward);

  const color = net > 0 ? 0x00FF00 : net < 0 ? 0xFF0000 : 0x615F5F;
  await message.edit({
    embeds: [generateEmbed(author, playerHand, dealerHand, bet, false, result, color)]
  });
  await delGame(author.id)
}
