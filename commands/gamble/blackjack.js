const {
  formatCards,
  createNewDeck,
  drawNewCard,
  getBestHandValue,
  getGame,
  addGame,
  claimGame,
  delGame,
  updateGame,
  isBust,
  isBlackJack,
  isDoubleAce,
  isDealerStay
} = require('../../utils/blackJackUtil.js')
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown')
const { decBalance, incBalance } = require('../../utils/userUtil')
const { getBetAmount } = require('../../utils/gameUtil')
const { getDebuffPercentage } = require('../../utils/miscUtil')
const config = require('../../data/config')
const emoji = config.emoji
const settings = config.gamble_settings

const hitEmoji = '👊'
const standEmoji = '🛑'

module.exports = {
  name: 'bj',
  aliases: ['blackjack'],
  description: 'Chơi bài xì dách (blackjack).',
  usage: '`!bj [tiền cược|all]`',
  examples: '`!bj all`\n`!blackjack 10000`',
  execute: async (message, args) => {
    try {
      const userId = message.author.id
      const game = await getGame(userId)

      const remainingCooldown = checkAndSetCooldown(userId, 'bj', settings.cooldown_second)
      if (remainingCooldown > 0) {
        return notifyCooldown(message, remainingCooldown)
      }

      if (game) {
        const playerHand = game.player
        const dealerHand = game.dealer
        const deck = game.deck
        await blackjack(message, playerHand, dealerHand, deck, game.bet, true)
      } else {
        let bet = args.length == 0 ? 'min' : args[0]
        const betAmount = await getBetAmount(bet, userId, settings.max_bet, settings.min_bet)
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
    const game = await getGame(message.author.id)
    if (!game) {
      collector.stop()
      return sentMessage.edit(`${emoji.no} Ván bài đã kết thúc!`)
    }

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
  if (isBust(playerHand)) {
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
  const game = await claimGame(author.id)
  if (!game) {
    return message.edit(`${emoji.no} Ván bài đã kết thúc!`)
  }

  const playerValue = getBestHandValue(playerHand)
  const debuffPercentage = await getDebuffPercentage(message.client, author.id)
  while (!isDealerStay(dealerHand)) {
    if (Math.random() < debuffPercentage) {
      const nextCard = deck[deck.length - 1]
      const potentialHandValue = getBestHandValue([...dealerHand, nextCard])

      if (isBust(playerHand)) {
        if (potentialHandValue > 21) {
          for (let i = deck.length - 2; i >= 0; i--) {
            if (getBestHandValue([...dealerHand, deck[i]]) <= 21) {
              [deck[deck.length - 1], deck[i]] = [deck[i], deck[deck.length - 1]]
              break
            }
          }
        }
      } else {
        if (potentialHandValue > 21 || potentialHandValue < playerValue) {
          for (let i = deck.length - 2; i >= 0; i--) {
            const testValue = getBestHandValue([...dealerHand, deck[i]])
            if (testValue <= 21 && testValue >= playerValue) {
              [deck[deck.length - 1], deck[i]] = [deck[i], deck[deck.length - 1]]
              break
            }
          }
        }
      }
    }
    const card = drawNewCard(deck)
    dealerHand.push(card)
  }

  const dealerValue = getBestHandValue(dealerHand)

  const playerSpecial = isDoubleAce(playerHand)
    ? 'Xì bàng'
    : isBlackJack(playerHand)
      ? 'Xì dách'
        : null
  const dealerSpecial = isDoubleAce(dealerHand)
    ? 'Xì bàng'
    : isBlackJack(dealerHand)
      ? 'Xì dách'
        : null

  let reward = 0;
  let net = 0;
  let result = '';

  if (playerSpecial && !dealerSpecial) {
    reward = bet * 2;
    net = reward - bet;
    result = `${playerSpecial}, bạn thắng ${net.toLocaleString()} coke!`;
  } else if (!playerSpecial && dealerSpecial) {
    reward = 0;
    net = -bet;
    result = `Dealer thắng với ${dealerSpecial}! Bạn mất ${bet.toLocaleString()} coke.`;
  } else if (playerSpecial && dealerSpecial) {
    const rank = { 'Xì bàng': 2, 'Xì dách': 1 };
    if (rank[playerSpecial] > rank[dealerSpecial]) {
      reward = bet * 2;
      net = reward - bet;
      result = `${playerSpecial}, bạn thắng ${net.toLocaleString()} coke!`;
    } else if (rank[playerSpecial] < rank[dealerSpecial]) {
      reward = 0;
      net = -bet;
      result = `Dealer thắng với ${dealerSpecial}! Bạn mất ${bet.toLocaleString()} coke.`;
    } else {
      reward = bet;
      net = 0;
      result = `Hoà! cả hai cùng có ${playerSpecial}, bạn nhận lại ${bet.toLocaleString()} coke.`;
    }
  } else if (isBust(playerHand) && isBust(dealerHand)) {
    reward = bet;
    net = 0;
    result = `Hoà! Cả hai đều ngoắc, bạn nhận lại ${bet.toLocaleString()} coke.`;
  } else if (isBust(playerHand)) {
    reward = 0;
    net = -bet;
    result = `Bạn mất ${bet.toLocaleString()} coke!`;
  } else if (isBust(dealerHand) || playerValue > dealerValue) {
    reward = bet * 2;
    net = reward - bet;
    result = `Bạn thắng ${net.toLocaleString()} coke!`;
  } else if (playerValue < dealerValue) {
    reward = 0;
    net = -bet;
    result = `Bạn mất ${bet.toLocaleString()} coke!`;
  } else {
    reward = bet;
    net = 0;
    result = `Hoà, bạn nhận lại ${bet.toLocaleString()} coke.`;
  }

  if (reward > 0) await incBalance(author.id, reward);

  const color = net > 0 ? 0x00FF00 : net < 0 ? 0xFF0000 : 0x615F5F;
  await message.edit({
    embeds: [generateEmbed(author, playerHand, dealerHand, bet, false, result, color)]
  });
  await delGame(author.id)
}
