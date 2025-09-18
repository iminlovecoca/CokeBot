const mongoose = require('mongoose')
const User = require('../models/User')
const Cokemon = require('../models/cokemon/Cokemon')
const shopItems = require('../data/shopItem')
const { runTransactionWithRetry } = require('./miscUtil')
const { formatVNCurrency } = require('./format')
const { getPerDayLimit, getPerTransactionLimit } = require('./transactionUtil')
const config = require('../data/config')
const settings = config.cokemon_settings

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

			const sellPrice = Math.floor(item.price * settings.sell_percentage)
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

const useItem = async (client, user, channelId, itemId) => {
	try {
		item = shopItems.get(itemId)
		if (!item) {
			throw new Error('❌ | Vật phẩm không tồn tại.')
		}

		const userData = await User.findOne({ userId: user.id })
		if (!userData) {
			throw new Error('❌ | Không thể tìm thấy dữ liệu người chơi.')
		}

		const ownedQuantity = userData.inventory.get(itemId) || 0
		if (ownedQuantity < 1) {
			throw new Error(`❌ | Bạn không có vật phẩm ${item.name} để sử dụng.`)
		}

		let successMessage = ''
		if (item.item_type === 'lure') {
			const isDefaultChannel = !config.channel_themes[channelId]
			if (isDefaultChannel) {
				const cooldownEndTime = client.lureCooldowns.get(user.id)
				if (cooldownEndTime && Date.now() < cooldownEndTime) {
					const remainingMinutes = Math.ceil((cooldownEndTime - Date.now()) / 60000)
					throw new Error(`❌ | Bạn đang trong thời gian hồi. Bạn có thể dùng bả tiếp theo sau ${remainingMinutes} phút.`)
				}
			}

			if (client.activeLures.has(channelId)) {
				throw new Error('❌ | Đã có một loại bả đang hoạt động ở kênh này.')
			}

			const channelTheme = config.channel_themes[channelId]
			if (channelTheme && item.boosts_type) {
				const isCompatible = item.boosts_type.some(type => channelTheme.main_types.includes(type))
				if (!isCompatible) {
					throw new Error('❌ | Loại bả này không tương thích với hệ sinh thái ở đây!')
				}
			}
		} else if (item.item_type === 'tool' && itemId === 'catch-net') {
			const activeNets = client.activeNets
			const currentUses = activeNets.get(user.id)?.uses || 0
			if (currentUses > (settings.max_stacked_nets - 1) * settings.catch_net_uses) {
				throw new Error(`❌ | Lưới Bắt Tự Động của bạn đã đầy! Bạn không thể nạp thêm.`)
			}
		} else {
			throw new Error('❌ | Vật phẩm này không thể sử dụng được.')
		}

		const consumeTransaction = async (session) => {
			const userInSession = await User.findOne({ userId: user.id }).session(session)
			const currentQuantity = userInSession.inventory.get(itemId) || 0
			if (currentQuantity < 1) {
				throw new Error('Không thể sử dụng vật phẩm, số lượng đã thay đổi.')
			}

			const newQuantity = currentQuantity - 1
			if (newQuantity === 0) {
				userInSession.inventory.delete(itemId);
			} else {
				userInSession.inventory.set(itemId, newQuantity);
			}
			await userInSession.save({ session })
		}
		await runTransactionWithRetry(consumeTransaction)

		if (item.item_type === 'lure') {
			const expirationTime = Date.now() + settings.lure_duration_ms
			client.activeLures.set(channelId, { expires_at: expirationTime, boosts_type: item.boosts_type, ownerId: user.id })
			successMessage = `✨ **${user.username || user.id}** đã sử dụng **${item.name}** ${item.emoji}!`
		} else if (item.item_type === 'tool' && itemId === 'catch-net') {
			const activeNets = client.activeNets
			const currentNetState = activeNets.get(user.id) || { uses: 0, caught: new Map() }
			const newTotal = currentNetState.uses + settings.catch_net_uses
			activeNets.set(user.id, { uses: newTotal, caught: currentNetState.caught })
			successMessage = `✅ Bạn đã nạp thêm Lưới Bắt! Tổng số lượt tự động bắt của bạn bây giờ là **${newTotal}**. Một bản tổng kết sẽ được gửi khi hết lượt.`
		}
		return { success: true, message: successMessage, itemType: item.item_type }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const getAllCokemon = async userId => {
	return await Cokemon.find({ owner_id: userId }).populate('species_id')
}

const getAllCokemonWithUids = async (userId, Uids) => {
	return await Cokemon.find({ owner_id: userId, uid: { $in: Uids } }).populate('species_id')
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
		return { success: false, message: '❌ | Lỗi trong quá trình bắt, hãy thử lại nào.' }
	} finally {
		session.endSession()
	}
}

const removeCokemon = async (userId, cokemonUids) => {
	try {
		let resultData = {}
		const releaseTransaction = async (session) => {
			const cokemonToDelete = await Cokemon.find(
				{ owner_id: userId, uid: { $in: cokemonUids } },
				null,
				{ session }
			)
			if (cokemonToDelete.length !== cokemonUids.length) {
				throw new Error('Một hoặc nhiều ID cokemon không hợp lệ hoặc không thuộc về bạn.')
			}
			if (cokemonToDelete.length === 0) {
				throw new Error('Không có cokemon nào được chọn để thả.')
			}

			const idsToDelete = cokemonToDelete.map(c => c._id)
			await Cokemon.deleteMany({ _id: { $in: idsToDelete } }, { session })

			const totalReward = cokemonToDelete.length * settings.release_reward
			await User.updateOne(
				{ userId: userId },
				{ $inc: { coke: totalReward } },
				{ session }
			)
			resultData = { releasedCount: cokemonToDelete.length, reward: totalReward }
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
	getAllCokemonWithUids,
	removeCokemon
}