const mongoose = require('mongoose')
const User = require('../models/User')
const Cokemon = require('../models/cokemon/Cokemon')
const shopItems = require('../data/shopItem')
const { runTransactionWithRetry } = require('./miscUtil')
const { formatVNCurrency } = require('./format')
const { getPerDayLimit, getPerTransactionLimit } = require('./transactionUtil')
const config = require('../data/config.json')

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
	} catch (error) {
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
	} catch (error) {
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
	} catch (error) {
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

	const senderPerDayLimit = sender.vipLevel ? Infinity : getPerDayLimit(sender.level || 1)[0];
	const receiverPerDayLimit = receiver.vipLevel ? Infinity : getPerDayLimit(receiver.level || 1)[1];
	const senderPerTransLimit = sender.vipLevel ? Infinity : getPerTransactionLimit(sender.level || 1);
	const senderDailyGive = sender.dailyGive || {};
	const receiverDailyReceive = receiver.dailyReceive || {};
	const sentToday = senderDailyGive[dateKey] || 0;
	const receivedToday = receiverDailyReceive[dateKey] || 0;

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
				$inc: { coke: -amount },
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
				$inc: { coke: amount },
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
	} catch (error) {
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

const buyItem = async (userId, itemId, quantity) => {
	let resultData = {}
	try {
		const buyTransaction = async (session) => {
			const item = shopItems.get(itemId)
			if (!item) {
				throw new Error('❌ | Vật phẩm không tồn tại.')
			}

			const user = await User.findOne({ userId }).session(session)
			const totalCost = item.price * quantity
			if (user.coke < totalCost) {
				throw new Error(`❌ | Bạn không đủ tiền! Bạn cần ${totalCost} coke nhưng chỉ có ${user.coke} coke.`)
			}

			user.coke -= totalCost
			const currentQuantity = user.inventory.get(itemId) || 0
			user.inventory.set(itemId, currentQuantity + quantity)
			await user.save({ session })
			resultData = { item, quantity, cost: totalCost }
		}
		await runTransactionWithRetry(buyTransaction)
		return { success: true, ...resultData}
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const sellItem = async (userId, itemId, quantity) => {
	let resultData = {}
	try {
		const sellTransaction = async (session) => {
			const item = shopItems.get(itemId)
			if (!item) {
				throw new Error('❌ | Vật phẩm không tồn tại.')
			}

			const user = await User.findOne({ userId }).session(session)
			if (!user) {
				throw new Error('❌ | Bạn không có vật phẩm nào để bán.')
			}

			const ownedQuantity = user.inventory.get(itemId) || 0
			if (ownedQuantity < quantity) {
				throw new Error(`❌ | Bạn không có đủ vật phẩm để bán. Bạn chỉ có ${ownedQuantity} ${item.name}.`)
			}

			// Calculate the sell price (75% of original, rounded down)
			const sellPrice = Math.floor(item.price * 0.75)
			const totalGain = sellPrice * quantity
			user.coke += totalGain
			const newQuantity = ownedQuantity - quantity

			if (newQuantity === 0) {
				user.inventory.delete(itemId)
			} else {
				user.inventory.set(itemId, newQuantity)
			}
			await user.save({ session })
			resultData = { item, quantity, gain: totalGain }
		}
		await runTransactionWithRetry(sellTransaction)
		return { success: true, ...resultData }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const useItem = async (client, userId, channelId, itemId) => {
	try {
		let resultData = {}
		const useTransaction = async (session) => {
			const item = shopItems.get(itemId)
			if (!item) {
				throw new Error('❌ | Vật phẩm không tồn tại.')
			}

			const user = await User.findOne({ userId }).session(session)
			if (!user) {
				throw new Error('❌ | Không thể tìm thấy dữ liệu người chơi.')
			}

			const ownedQuantity = user?.inventory?.get(itemId) || 0
			if (ownedQuantity < 1) {
				throw new Error(`❌ | Bạn không có vật phẩm ${item.name} để sử dụng.`)
			}

			let successMessage = ''
			if (item.item_type === 'lure') {
				const isDefaultChannel = !config.channel_themes[channelId]
				if (isDefaultChannel) {
					const cooldownEndTime = client.lureCooldowns.get(userId)
					if (cooldownEndTime && Date.now() < cooldownEndTime) {
						const remainingMinutes = Math.ceil((cooldownEndTime - Date.now()) / 60000)
						throw new Error(`❌ | Bạn đang trong thời gian hồi. Bạn có thể dùng lure tiếp theo sau ${remainingMinutes} phút.`)
					}
				}

				const activeLures = client.activeLures
				if (activeLures.has(channelId)) {
					throw new Error('❌ | Đã có một loại lure đang hoạt động ở kênh này.')
				}

				const channelTheme = config.channel_themes[channelId]
				if (channel_themes && item.boosts_type) {
					const isCompatible = item.boosts_type.some(type => channel_themes.main_types.includes(type))
					if (!isCompatible) {
						throw new Error('❌ | Loại lure này không tương thích với hệ sinh thái ở đây!')
					}
				}

				const expirationTime = Date.now() + (30 * 60 * 1000)
				activeLures.set(channelId, {
					expires_at: expirationTime, boosts_type: item.boosts_type, ownerId: userId 
				})
				successMessage = `✨ **${user.username || userId}** đã sử dụng **${item.name}** ${item.emoji}!`
			} else if (item.item_type === 'tool' && item.id === 'catch-net') {
				const activeNets = client.activeNets
				const currentUses = activeNets.get(userId)?.uses || 0
				const MAX_NET_USES = 100 // more than 5 nets stacked is not allowed
				if (currentUses >= MAX_NET_USES) {
					throw new Error(`❌ | Lưới Bắt Tự Động của bạn đã đầy! Bạn không thể nạp thêm (Tối đa: ${MAX_NET_USES} lượt).`)
				}
				const newTotal = currentUses + 20 // 20 uses per net
				activeNets.set(userId, { uses: newTotal })
				successMessage = `✅ Bạn đã nạp thêm Lưới Bắt Tự Động! Tổng số lượt tự động bắt của bạn bây giờ là **${newTotal}**.`
			} else {
				throw new Error('❌ | Vật phẩm này không thể sử dụng được.')
			}

			user.inventory.set(itemId, ownedQuantity - 1)
			if (user.inventory.get(itemId) === 0) {
				user.inventory.delete(itemId)
			}
			await user.save({ session })
			resultData = { message: successMessage, itemType: item.item_type }
		}
		await runTransactionWithRetry(useTransaction)
		return { success: true, ...resultData }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const getAllCokemon = async userId => {
	return await Cokemon.find({ owner_id: userId }).populate('species_id')
}

const addCokemon = async (cokemonData) => {
	const session = await mongoose.startSession()
	try {
		let newCokemon = null
		await session.withTransaction(async (session) => {
			const user = await User.findOneAndUpdate(
				{ userId: cokemonData.owner_id },
				{ $inc: { last_cokemon_id: 1 } },
				{ new: true, upsert: true, session: session }
			)

			const speciesIdString = cokemonData.species_id.toString()
			const dexEntry = user.cokedex.get(speciesIdString) || { caught: 0, has_shiny: false }
			dexEntry.caught += 1
			if (cokemonData.is_shiny) {
				dexEntry.has_shiny = true
			}
			user.cokedex.set(speciesIdString, dexEntry)

			const newUid = user.last_cokemon_id
			const finalCokemonData = {
				...cokemonData,
				uid: newUid
			}

			const created = await Cokemon.create([finalCokemonData], { session })
			newCokemon = created[0]
			await user.save({ session })
		})
		return { success: true, cokemon: newCokemon }
	} catch (error) {
		console.error(error)
		return { success: false, message: '❌ | Lỗi trong quá trình bắt, hãy thử lại nào.' }
	} finally {
		session.endSession()
	}
}

const removeCokemon = async (userId, cokemonUid) => {
	try {
		let resultData = {}
		const releaseTransaction = async (session) => {
			const deletedCokemon = await Cokemon.findOneAndDelete(
				{ owner_id: userId, uid: cokemonUid }
			).populate('species_id')

			if (!deletedCokemon) {
				throw new Error(`Không tìm thấy cokemon với ID \`${cokemonUid}\` trong bộ sưu tập của bạn.`)
			}

			const reward = 50
			await User.updateOne(
				{ userId: userId },
				{ $inc: { coke: reward } },
				{ session }
			)
			resultData = { releasedCokemon: deletedCokemon, reward: reward }
		}
		await runTransactionWithRetry(releaseTransaction)
		return { success: true, ...resultData }
	} catch (error) {
		return { success: false, message: error.message }
	}
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
	incBalance,
	buyItem,
	sellItem,
	useItem,
	getAllCokemon,
	addCokemon,
	removeCokemon
}