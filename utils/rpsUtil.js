const RPSGame = require('../models/RPSGame')

const getGame = async userId => await RPSGame.findOne({ userId })

const addGame = async (userId, bet, botChoice) => {
  await RPSGame.insertOne({ userId, bet, botChoice })
}

const delGame = async userId => {
  await RPSGame.deleteOne({ userId })
}

const claimGame = async (userId) => {
  return await RPSGame.findOneAndUpdate(
    { userId: userId, status: 'active' },
    { $set: { status: 'processing' } }
  )
}

module.exports = {
	getGame, addGame, delGame, claimGame
}