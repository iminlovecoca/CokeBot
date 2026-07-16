const { getUser } = require('./userUtil')
const { UserFriendlyError } = require('./errors')
const config = require('../data/config')

const getBetAmount = async (bet, userId, maxBet, minBet) => {
	const user = await getUser(userId)
	let amount

	let normalizedBet = bet;
	if (typeof bet === 'string') {
		normalizedBet = bet.trim().toLowerCase();
	}

	if (normalizedBet === 'all') {
		amount = maxBet
	} else if (normalizedBet !== undefined && normalizedBet !== null && normalizedBet !== '' && !isNaN(normalizedBet) && Number(normalizedBet) > 0) {
		amount = parseInt(normalizedBet)
	} else {
		amount = 1
	}

	if (normalizedBet === 'all') {
		amount = Math.min(user.coke, amount)
	}
	if (amount == 0 || amount > user.coke) {
		throw new UserFriendlyError(`${config.emoji.no} Bạn không có đủ coke để cược!`)
	}
	return Math.min(amount, maxBet)
}

const checkAndClearExpiredGame = async (userId, model, timeoutMs = 10 * 60 * 1000) => {
	const activeGame = await model.findOne({ userId });
	if (activeGame) {
		const age = Date.now() - new Date(activeGame.date || Date.now()).getTime();
		if (age > timeoutMs) {
			await model.deleteOne({ userId });
			return null;
		}
	}
	return activeGame;
}

module.exports = {
	getBetAmount,
	checkAndClearExpiredGame
}