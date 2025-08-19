const RPSGame = require('../models/RPSGame')

const getGame = async userId => await RPSGame.findOne({ userId })

const addGame = async (userId, bet, botChoice) => {
  await RPSGame.insertOne({ userId, bet, botChoice })
}

const delGame = async userId => {
  await RPSGame.deleteOne({ userId })
}

module.exports = {
	getGame, addGame, delGame
}