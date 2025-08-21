const mongoose = require('mongoose')
const User = require('../models/User')
const { formatVNCurrency } = require('./format')
const { getPerDayLimit, getPerTransactionLimit } = require('./transactionUtil')

const getOrCreateUser = async userId => {
	let user = await User.findOne({ userId })

	if (!user) {
		user = new User({
			userId,
			coke: 0,
			bank: 0,
			bankLastUpdate: new Date()
		})
		await user.save()
	}

	return user
}

const withdrawCmd = async (userId, amount) => {
	const session = await mongoose.startSession()
  	session.startTransaction()

	try {
		const user = await User.findOne({ userId }).session(session)
		if (!amount || amount <= 0 || user.bank < amount) {
			return '❌ | Số tiền không hợp lệ hoặc bạn không đủ coke!'
		}

		await User.updateOne(
			{ userId },
			{ $inc: { bank: -amount, coke: amount } }
		).session(session)
		await session.commitTransaction()
		return `✅ | Đã rút **${formatVNCurrency(amount)} coke** từ ngân hàng.`
	} catch(error) {
		await session.abortTransaction()
		return 'Lỗi giao dịch, vui lòng thử lại.'
	} finally {
		session.endSession()
	}
	
}

const sendCmd = async (userId, amount) => {
	const session = await mongoose.startSession()
  	session.startTransaction()

	try {
		const user = await User.findOne({ userId }).session(session)
		if (!amount || amount <= 0 || user.coke < amount) {
			return '❌ | Số tiền không hợp lệ hoặc bạn không đủ coke!'
		}

  		await User.updateOne(
			{ userId, coke: { $gte: amount } },
			{ $inc: { bank: amount, coke: -amount } }
		).session(session)
		await session.commitTransaction()
		return `✅ | Đã gửi **${formatVNCurrency(amount)} coke** vào ngân hàng.`
	} catch(error) {
		await session.abortTransaction()
		return '❌ | Lỗi giao dịch, vui lòng thử lại.'
	} finally {
		session.endSession()
	}
}

const computeInterest = async (userId, daysPassed) => {
	const DAILY_INTEREST_RATE = 0.0001096
	const session = await mongoose.startSession()
  	session.startTransaction()

	try {
		const user = await User.findOne({ userId }).session(session)
		if (user.bank == 0 || daysPassed == 0) {
			return 0
		}

		interest = Math.floor(user.bank * DAILY_INTEREST_RATE * daysPassed)
		const now = DateTime.now().setZone('Asia/Ho_Chi_Minh')

		await User.updateOne(
			{ userId },
			{
				$inc: { bank: interest },
				$set: { bankLastUpdate: now.toJSDate() }
			}
		).session(session)
		await session.commitTransaction()
		return interest
	} catch(error) {
		await session.abortTransaction()
		return 0
	} finally {
		session.endSession()
	}
}

const validateBeforeGiving = async (senderId, receiverId, amount, dateKey) => {
	const sender = await User.findOne({ userId: senderId })
	const receiver = await User.findOne({ userId: receiverId })

	if (senderId === receiverId) {
		return '❌ | Không thể tự chuyển cho chính mình.'
	}
	if (!sender || sender.coke < amount) {
		return ':dollar: | Bạn không đủ coke để chuyển.'
	}
	if (!sender || sender.coke < amount) {
		return '❌ | Người nhận chưa có tài khoản trong hệ thống.'
	}
	if (!receiver) {
		return '❌ | Người nhận chưa có tài khoản trong hệ thống.'
	}
	if (receiver.bannedUntil && receiver.bannedUntil > Date.now()) {
		return '❌ | Người nhận hiện đang bị cấm sử dụng bot.'
	}

	const senderPerDayLimit = sender.vipLevel ? Infinity : getPerDayLimit(sender.level || 1)[0]
	const receiverPerDayLimit = receiver.vipLevel ? Infinity : getPerDayLimit(receiver.level || 1)[1]
	const senderPerTransLimit = sender.vipLevel ? Infinity : getPerTransactionLimit(sender.level || 1)
	const senderDailyGive = sender.dailyGive || {}
	const receiverDailyReceive = receiver.dailyReceive || {}
	const sentToday = senderDailyGive[dateKey] || 0
	const receivedToday = receiverDailyReceive[dateKey] || 0

	if (amount > senderPerTransLimit) {
		return `❌ | Vượt giới hạn giao dịch (**${senderPerTransLimit.toLocaleString()}**).`
	}
	if (sentToday + amount > senderPerDayLimit && receiverPerDayLimit < Infinity) {
		return `❌ | Vượt giới hạn chuyển hôm nay (**${senderPerDayLimit.toLocaleString()}**).`
	}
	if (receivedToday + amount > receiverPerDayLimit && senderPerDayLimit < Infinity) {
		return `❌ | Người nhận đã vượt giới hạn nhận hôm nay (**${receiverPerDayLimit.toLocaleString()}**).`
	}
	return
}

const giveCmd = async (senderId, receiverId, amount, vnNow, dateKey) => {
	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const sender = await User.findOne({ userId: senderId }).session(session)
		const receiver = await User.findOne({ userId: receiverId }).session(session)

		if (!sender.vipLevel) {
			await User.updateOne(
				{ userId: receiverId },
				{ $inc: { [`dailyReceive.${dateKey}`]: amount } }
			).session(session)
		}
		if (!receiver.vipLevel) {
			await User.updateOne(
				{ userId: senderId },
				{ $inc: { [`dailyGive.${dateKey}`]: amount } }
			).session(session)
		}
		await User.updateOne(
			{ userId: senderId },
			{
				$inc: { coke: -amount},
				$push: {
					transferHistory: {
						to: receiverId,
						amount,
						date: vnNow
					}
				}
			}
		).session(session)
		await User.updateOne(
			{ userId: receiverId },
			{
				$inc: { coke: amount},
				$push: {
					receiveHistory: {
						from: senderId,
						amount,
						date: vnNow
					}
				},
			}
		).session(session)
		await session.commitTransaction()
		return true
	} catch(error) {
		await session.abortTransaction()
		return false
	} finally {
		session.endSession()
	}
}

const decBalance = async (userId, amount) => {
	await User.updateOne(
		{ userId },
		{ $inc: { coke: -amount } }
	)
}

const incBalance = async (userId, amount) => {
	await User.updateOne(
		{ userId },
		{ $inc: { coke: amount } }
	)
}

const daysToMilliseconds = days => days * 24 * 60 * 60 * 1000

const removeTransferalOlderThanNDays = async (userId, n) => {
	await User.updateOne(
		{ userId },
		{
			$pull: {
				transferHistory: {
					date: { $gte: Date.now() - daysToMilliseconds(n) }
				}
			}
		}
	)
}

const removeReceiptOlderThanNDays = async (userId, n) => {
	await User.updateOne(
		{ userId },
		{
			$pull: {
				receiveHistory: {
					date: { $gte: Date.now() - daysToMilliseconds(n) }
				}
			}
		}
	)
}

module.exports = {
	getOrCreateUser,
	withdrawCmd,
	sendCmd,
	giveCmd,
	removeTransferalOlderThanNDays,
	removeReceiptOlderThanNDays,
	computeInterest,
	validateBeforeGiving,
	decBalance,
	incBalance
}