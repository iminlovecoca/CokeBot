const { getUser } = require('./userUtil')
const { UserFriendlyError } = require('./errors')
const config = require('../data/config')

const getBetAmount = async (bet, userId, maxBet, minBet) => {
	const user = await getUser(userId)
	let amount

	if (bet === 'min') {
		amount = minBet
	} else if (bet === 'all') {
		amount = maxBet
	} else if (!isNaN(bet) && bet > 0) {
		amount = parseInt(bet)
	} else {
		throw UserFriendlyError(`${config.emoji.no} Số tiền cược không hợp lệ!`)
	}

	if (bet === 'all' || bet === 'min') {
		amount = Math.min(user.coke, amount)
	}
	if (amount == 0 || amount > user.coke) {
		throw UserFriendlyError(`${config.emoji.no} Bạn không có đủ coke để cược!`)
	}
	return Math.min(amount, maxBet)
}

module.exports = {
	getBetAmount
}