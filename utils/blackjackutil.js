const BlackJackGame = require('../models/BlackJackGame')
const config = require('../data/config')
const emoji = config.emoji

const suits = ['s', 'c', 'h', 'd']; 
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createNewDeck = () => {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }
  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function drawNewCard(deck) {
  if (!deck || !Array.isArray(deck)) {
    throw new Error("Deck không hợp lệ");
  }
  if (deck.length === 0) {
    throw new Error("Deck đã hết bài");
  }
  return deck.pop();
}

const getBestHandValue = (hand, hide=false) => {
  let value = 0
  let aceCount = 0
  let cards = JSON.parse(JSON.stringify(hand))
  if (hide) cards.pop()

  for (const card of cards) {
    const cardVal = card.slice(0, -1)

    if (isNaN(cardVal)) {
      if (cardVal === 'A') {
        aceCount++
        value += 11
      } else {
        value += 10
      }
    } else {
      value += +cardVal
    }
  }

  while (value > 21 && aceCount > 0) {
    value -= 10
    aceCount--
  }
  return value
}

const formatCards = (hand, hide=false) => {
  let cards = [...hand]
  if (hide) {
    cards = cards.map((c, idx) => idx === 0 ? emoji[c] : emoji.back)
  } else {
    cards = cards.map(c => emoji[c])
  }
  return cards.join(' ')
}

const getGame = async userId => {
  return await BlackJackGame.findOne({ userId }).lean()
}

const addGame = async (userId, bet, player, dealer, deck) => {
  await BlackJackGame.insertOne({ userId, bet, player, dealer, deck })
}

const delGame = async userId => {
  await BlackJackGame.deleteOne({ userId })
}

const updateGame = async (userId, card) => {
  await BlackJackGame.updateOne(
    { userId },
    { $push: { player: card } }
  )
}

const isBust = cards => getBestHandValue(cards) > 21

const isBlackJack = cards => getBestHandValue(cards) === 21 && cards.length == 2

const isDoubleAce = cards => cards.length === 2 && cards.every((c) => c.startsWith('A'))

const isDealerStay = cards => {
  if (isDoubleAce(cards)) return true
  return getBestHandValue(cards) >= 17
}

module.exports = {
  createNewDeck,
  drawNewCard,
  getBestHandValue,
  formatCards,
  getGame,
  addGame,
  delGame,
  updateGame,
  isBust,
  isBlackJack,
  isDoubleAce,
  isDealerStay
};
