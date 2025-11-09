const mongoose = require('mongoose')
const User = require('../models/User')
const Cokemon = require('../models/cokemon/Cokemon')
const ActiveNet = require('../models/cokemon/ActiveNet')
const { runTransactionWithRetry } = require('./miscUtil')
const { formatVNCurrency } = require('./format')
const { getPerDayLimit, getPerTransactionLimit } = require('./transactionUtil')
const { getCokemonName, getCokemonEmoji, getCokemonXpNeeded, addCokemonXp, getItem } = require('./cokemonUtil')
const config = require('../data/config')
const settings = config.cokemon_settings

const getUser = async (userId, session = null) => {
	const query = User.findOne({ userId })
	if (session) query.session(session)
	const user = await query
	if (!user) {
		throw new Error(`${config.emoji.no} Không thể tìm thấy dữ liệu người chơi.`)
	}
	return user
}

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
			return `${config.emoji.no} Số tiền không hợp lệ hoặc bạn không đủ coke!`
		}

		await User.updateOne(
			{ userId },
			{ $inc: { bank: -amount, coke: amount } }
		).session(session)
		await session.commitTransaction()
		return `${config.emoji.yes} Đã rút **${formatVNCurrency(amount)} coke** từ ngân hàng.`
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
			return `${config.emoji.no} Số tiền không hợp lệ hoặc bạn không đủ coke!`
		}

		await User.updateOne(
			{ userId, coke: { $gte: amount } },
			{ $inc: { bank: amount, coke: -amount } }
		).session(session)
		await session.commitTransaction()
		return `${config.emoji.yes} Đã gửi **${formatVNCurrency(amount)} coke** vào ngân hàng.`
	} catch (error) {
		await session.abortTransaction()
		return `${config.emoji.no} Lỗi giao dịch, vui lòng thử lại.`
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
		return `${config.emoji.no} Không thể tự chuyển cho chính mình.`
	}
	if (!sender || sender.coke < amount) {
		return `${config.emoji.no} Bạn không đủ coke để chuyển.`
	}
	if (!sender || sender.coke < amount) {
		return `${config.emoji.no} Người nhận chưa có tài khoản trong hệ thống.`
	}
	if (!receiver) {
		return `${config.emoji.no} Người nhận chưa có tài khoản trong hệ thống.`
	}
	if (receiver.bannedUntil && receiver.bannedUntil > Date.now()) {
		return `${config.emoji.no} Người nhận hiện đang bị cấm sử dụng bot.`
	}

	const senderPerDayLimit = sender.vipLevel ? Infinity : getPerDayLimit(sender.level || 1)[0]
	const receiverPerDayLimit = receiver.vipLevel ? Infinity : getPerDayLimit(receiver.level || 1)[1]
	const senderPerTransLimit = sender.vipLevel ? Infinity : getPerTransactionLimit(sender.level || 1)
	const senderDailyGive = sender.dailyGive || {}
	const receiverDailyReceive = receiver.dailyReceive || {}
	const sentToday = senderDailyGive[dateKey] || 0
	const receivedToday = receiverDailyReceive[dateKey] || 0

	if (amount > senderPerTransLimit) {
		return `${config.emoji.no} Vượt giới hạn giao dịch (**${senderPerTransLimit.toLocaleString()}**).`
	}
	if (sentToday + amount > senderPerDayLimit && receiverPerDayLimit < Infinity) {
		return `${config.emoji.no} Vượt giới hạn chuyển hôm nay (**${senderPerDayLimit.toLocaleString()}**).`
	}
	if (receivedToday + amount > receiverPerDayLimit && senderPerDayLimit < Infinity) {
		return `${config.emoji.no} Người nhận đã vượt giới hạn nhận hôm nay (**${receiverPerDayLimit.toLocaleString()}**).`
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

const getTotalCoke = async userId => {
	const user = await User.findOne({ userId })
	const totalCoke = (user?.coke || 0) + (user?.bank || 0)
	return totalCoke
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

const buyItem = async (client, userId, itemId, quantity) => {
	let resultData = {}
	try {
		const buyTransaction = async (session) => {
			const item = client.allItems.find(i => i.item_id === itemId)
			if (!item) {
				throw new Error(`${config.emoji.no} Vật phẩm không tồn tại.`)
			}

			const user = await User.findOne({ userId }).session(session)
			const totalCost = item.price * quantity
			if (user.coke < totalCost) {
				throw new Error(`${config.emoji.no} Bạn không đủ tiền! Bạn cần ${totalCost} coke nhưng chỉ có ${user.coke} coke.`)
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

const sellItem = async (client, userId, itemId, quantity) => {
	let resultData = {}
	try {
		const sellTransaction = async (session) => {
			const item = client.allItems.find(i => i.item_id === itemId)
			if (!item) {
				throw new Error(`${config.emoji.no} Vật phẩm không tồn tại.`)
			}

			const user = await User.findOne({ userId }).session(session)
			if (!user) {
				throw new Error(`${config.emoji.no} Bạn không có vật phẩm nào để bán.`)
			}

			const ownedQuantity = user.inventory.get(itemId) || 0
			if (ownedQuantity < quantity) {
				throw new Error(`${config.emoji.no} Bạn không có đủ vật phẩm để bán. Bạn chỉ có ${ownedQuantity} ${item.name}.`)
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

const useItem = async (client, user, channelId, itemId, targetId, quantity) => {
	try {
		const item = getItem(client, itemId)
		let quantityToUse = quantity
		let successMessage = ''
		if (item.item_type === 'lure') {
			const spawningChannels = Object.keys(config.channel_themes || {})
			if (!spawningChannels.includes(channelId)) {
				throw new Error(`${config.emoji.no} Bạn không thể dùng bả ở kênh này!`)
			}

			const isDefaultChannel = !config.channel_themes[channelId]
			if (isDefaultChannel) {
				const cooldownEndTime = client.lureCooldowns.get(user.id)
				if (cooldownEndTime && Date.now() < cooldownEndTime) {
					const remainingMinutes = Math.ceil((cooldownEndTime - Date.now()) / 60000)
					throw new Error(`${config.emoji.no} Bạn đang trong thời gian hồi. Bạn có thể dùng bả tiếp theo sau ${remainingMinutes} phút.`)
				}
			}

			if (quantity > 1) {
				throw new Error(`${config.emoji.no} Bạn chỉ có thể sử dụng một bả mỗi lần.`)
			}

			if (client.activeLures.has(channelId)) {
				throw new Error(`${config.emoji.no} Đã có một loại bả đang hoạt động ở kênh này.`)
			}

			const channelTheme = config.channel_themes[channelId]
			if (channelTheme && item.boosts_type) {
				const isCompatible = item.boosts_type.some(type => channelTheme.main_types.includes(type))
				if (!isCompatible) {
					throw new Error(`${config.emoji.no} Loại bả này không tương thích với hệ sinh thái ở đây!`)
				}
			}
		} else if (item.item_type === 'tool' && itemId === 'catch-net') {
			const currentNet = await ActiveNet.findOne({ userId: user.id })
			const maxUses = settings.max_stacked_nets * settings.catch_net_uses
			if (currentNet && currentNet.uses > maxUses - settings.catch_net_uses) {
				throw new Error(`${config.emoji.no} ${item.name} của bạn đã đầy! Bạn không thể nạp thêm.`)
			}

			const remainingCapacity = maxUses - currentNet.uses
			const usesToAdd = settings.catch_net_uses * quantity
			if (usesToAdd > remainingCapacity) {
				quantityToUse = Math.floor(remainingCapacity / settings.catch_net_uses)
				successMessage = `${config.emoji.warning} Chỉ nạp thêm ${quantityToUse} lần do số lượng ${item.name}${item.emoji} tối đa cho phép là ${settings.max_stacked_nets}.\n`
			}
		} else if (item.item_type === 'consumable' && itemId === 'rare-candy') {
			const cokemonId = parseInt(targetId)
			if (isNaN(cokemonId)) {
				throw new Error(`${config.emoji.no} Bạn phải cung cấp ID của Cokemon để cho ăn ${item.name}.`)
			}

			const cokemon = await getCokemon(user.id, cokemonId)
			if (!cokemon) {
				throw new Error(`${config.emoji.no} Không tìm thấy Cokemon với ID ${cokemonId}.`)
			}

			const maxLevel = config.cokemon_settings.max_level
			if (cokemon.level >= maxLevel) {
				throw new Error(`${config.emoji.no} **${cokemon.nickname || cokemon.species_id.name}** đã đạt cấp độ tối đa!`)
			}

			const levelsToMax = maxLevel - cokemon.level
			if (quantity > levelsToMax) {
				quantityToUse = levelsToMax
				successMessage = `${config.emoji.warning} **${getCokemonName(cokemon)}** chỉ cần ${levelsToMax} cấp nữa để đạt cấp độ tối đa. Chỉ sử dụng **${quantityToUse} ${item.name} ${item.emoji}**.\n`
			}
		} else {
			throw new Error(`${config.emoji.no} Vật phẩm này không thể sử dụng được.`)
		}

		if (quantityToUse > 0) {
			await consumeItem(user.id, itemId, quantityToUse)
		} else {
			return { success: true, message: `${config.emoji.no} Không có vật phẩm nào được sử dụng.` }
		}

		if (item.item_type === 'lure') {
			const expirationTime = Date.now() + settings.lure_duration_ms
			client.activeLures.set(channelId, { expires_at: expirationTime, boosts_type: item.boosts_type, ownerId: user.id })
			successMessage += `✨ **${user.username || user.id}** đã sử dụng **${item.name}**${item.emoji}!`
		} else if (item.item_type === 'tool' && itemId === 'catch-net') {
			const updatedNet = await ActiveNet.findOneAndUpdate(
				{ userId: user.id },
				{
					$inc: { uses: settings.catch_net_uses },
					$setOnInsert: { caught: new Map() }
				},
				{ upsert: true, new: true }
			)
			if (successMessage === '') {
				successMessage += `${config.emoji.yes} Bạn đã nạp thêm **${quantityToUse} x ${item.name}**${item.emoji}!\n`
			}
			successMessage += `Tổng số lượt của bạn bây giờ là **${updatedNet.uses}**. Một bản tổng kết sẽ được gửi khi hết lượt.`
		} else if (item.item_type === 'consumable' && itemId === 'rare-candy') {
			const cokemon = await getCokemon(user.id, parseInt(targetId))
			const originalLevel = cokemon.level

			for (let i = 0; i < quantityToUse; i++) {
				if (cokemon.level >= config.cokemon_settings.max_level) break
				const xpNeeded = getCokemonXpNeeded(cokemon.level + 1) - cokemon.experience
				await addCokemonXp(cokemon, xpNeeded)
			}
			successMessage += `🎉 **${getCokemonName(cokemon)}** ${getCokemonEmoji(cokemon)} đã ăn ${quantityToUse} ${item.name} ${item.emoji} và tăng từ **cấp ${originalLevel}** lên **cấp ${cokemon.level}**!`
		}
		return { success: true, message: successMessage, itemType: item.item_type }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const consumeItem = async (userId, itemId, quantity = 1) => {
	try {
		const consumeTransaction = async (session) => {
			const user = await getUser(userId, session)
			const ownedQuantity = user.inventory.get(itemId) || 0
			if (ownedQuantity < quantity) {
				throw new Error(`${config.emoji.no} Bạn không có đủ vật phẩm. Cần ${quantity}, đang có ${ownedQuantity}.`)
			}
			
			const newQuantity = ownedQuantity - quantity
			if (newQuantity === 0) {
				user.inventory.delete(itemId)
			} else {
				user.inventory.set(itemId, newQuantity)
			}
			await user.save({ session })
		}
		await runTransactionWithRetry(consumeTransaction)
	} catch (error) {
		throw error
	}
}

const getCokemon = async (userId, cokemonUid) => {
	return await Cokemon.findOne({ owner_id: userId, uid: cokemonUid })
		.populate('species_id')
		.populate('ability')
		.populate('held_item_id')
}

const getAllCokemonWithUids = async (userId, Uids) => {
	return await Cokemon.find({ owner_id: userId, uid: { $in: Uids } })
		.populate('species_id')
		.populate('ability')
		.populate('held_item_id')
}

const getFilteredCokemon = async (userId, cokemonQuery, speciesQuery) => {
	const finalCokemonQuery = { ...cokemonQuery, owner_id: userId }
	let userCokemon = await Cokemon.find(finalCokemonQuery).populate({
		path: 'species_id',
		match: speciesQuery
	})
	
	// Because a 'match' on a populated field can leave nulls, we must filter them out.
	// This ensures we only return cokemon where the species also matched the filter.
	userCokemon = userCokemon.filter(c => c.species_id)
	return userCokemon
}

const registerDexEntry = async (userId, speciesId, isShiny) => {
	const user = await getUser(userId)
	const speciesIdString = speciesId.toString()
	const dexEntry = user.cokedex.get(speciesIdString) || { caught: 0, has_shiny: false, owned: false }
	dexEntry.owned = true
	if (isShiny && !dexEntry.has_shiny) {
		dexEntry.has_shiny = true
	}
	user.cokedex.set(speciesIdString, dexEntry)
	await user.save()
}

const addCokemon = async cokemonData => {
	const session = await mongoose.startSession()
	try {
		let newCokemon = null
		let bonusReward = 0
		let isFirstCatch = false

		await session.withTransaction(async session => {
			const user = await getUser(cokemonData.owner_id, session)
			user.last_cokemon_id++

			const newCokemon = new Cokemon({
				...cokemonData,
				uid: user.last_cokemon_id,
			})

			const speciesIdString = cokemonData.species_id.toString()
			const dexEntry = user.cokedex.get(speciesIdString) || { caught: 0, has_shiny: false, owned: false }
			if (['manual', 'net'].includes(cokemonData.catch_method)) {
				dexEntry.caught += 1
			}
			if (cokemonData.is_shiny && !dexEntry.has_shiny) {
				dexEntry.has_shiny = true
			}
			if (!dexEntry.owned) {
				await newCokemon.populate('species_id')
				const tier = newCokemon.species_id.tier
				bonusReward = config.cokemon_settings.tier_release_rewards[tier]
				user.coke += bonusReward
				dexEntry.owned = true
				isFirstCatch = true
			}
			user.cokedex.set(speciesIdString, dexEntry)
			await newCokemon.save({ session })
			await user.save({ session })
		})
		return { success: true, cokemon: newCokemon, bonusReward, isFirstCatch }
	} catch (error) {
		return { success: false, message: `${config.emoji.no} Lỗi trong quá trình bắt, hãy thử lại nào.` }
	} finally {
		session.endSession()
	}
}

const addCokemons = async cokemonDataArray => {
	if (!cokemonDataArray || cokemonDataArray.length === 0) return

	const cokemonByOwner = new Map()
	for (const data of cokemonDataArray) {
		if (!cokemonByOwner.has(data.owner_id)) {
			cokemonByOwner.set(data.owner_id, [])
		}
		cokemonByOwner.get(data.owner_id).push(data)
	}

	for (const [userId, userCokemons] of cokemonByOwner.entries()) {
		const user = await getUser(userId)
		let currentUid = user.last_cokemon_id
		const cokemons = []

		for (const data of userCokemons) {
			currentUid++
			cokemons.push({ ...data, uid: currentUid })
			const speciesIdString = data.species_id.toString()
			const dexEntry = user.cokedex.get(speciesIdString) || { caught: 0, has_shiny: false, owned: false }
			if (['manual', 'net'].includes(data.catch_method)) {
				dexEntry.caught++
			}
			if (data.is_shiny && !dexEntry.has_shiny) {
				dexEntry.has_shiny = true
			}
			dexEntry.owned = true
			user.cokedex.set(speciesIdString, dexEntry)
		}

		await Cokemon.insertMany(cokemons)
		user.last_cokemon_id = currentUid
		await user.save()
	}
}

const removeCokemon = async (userId, cokemonUids, totalReward) => {
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
				throw new Error(`${config.emoji.no} Không có cokemon nào được chọn để thả.`)
			}

			const idsToDelete = cokemonToDelete.map(c => c._id)
			await Cokemon.deleteMany({ _id: { $in: idsToDelete } }, { session })
			await User.updateOne(
				{ userId: userId },
				{ $inc: { coke: totalReward } },
				{ session }
			)
			resultData = { releasedCount: cokemonToDelete.length }
		}
		await runTransactionWithRetry(releaseTransaction)
		return { success: true, ...resultData }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const toggleFavorite = async (userId, cokemonUid) => {
	try {
		let resultData = {}
		const favoriteTransaction = async (session) => {
			const cokemon = await Cokemon.findOne({ owner_id: userId, uid: cokemonUid }).session(session)
			if (!cokemon) {
				throw new Error(`${config.emoji.no} Không tìm thấy cokemon với ID ${cokemonUid} trong bộ sưu tập của bạn.`)
			}

			const newStatus = !cokemon.is_favorite
			cokemon.is_favorite = newStatus
			await cokemon.save({ session })

			const species = await cokemon.populate('species_id')
			resultData = {
				is_favorite: newStatus,
				cokemonName: getCokemonName(cokemon)
			}
		}
		await runTransactionWithRetry(favoriteTransaction)
		return { success: true, ...resultData }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const getActiveCokemon = async userId => {
	const user = await getUser(userId)
	if (!user.active_cokemon_id) {
		throw new Error(`${config.emoji.no} Bạn chưa chọn bạn đồng hành nào. Dùng \`!select <ID>\` để chọn một cokemon.`)
	}
	return await Cokemon.findById(user.active_cokemon_id).populate('species_id')
}

const selectActiveCokemon = async (userId, cokemonUid) => {
	const session = await mongoose.startSession()
	try {
		const resultData = await session.withTransaction(async (session) => {
			const cokemonToSelect = await Cokemon.findOne({ owner_id: userId, uid: cokemonUid }).session(session)
			if (!cokemonToSelect) {
				throw new Error(`${config.emoji.no} Không tìm thấy cokemon với ID ${cokemonUid} trong bộ sưu tập của bạn.`)
			}

			await User.updateOne(
				{ userId: userId },
				{ $set: { active_cokemon_id: cokemonToSelect._id } },
				{ upsert: true, session: session }
			)
			const species = await cokemonToSelect.populate('species_id')
			return {
				cokemonName: cokemonToSelect.nickname || species.species_id.name,
				emoji: cokemonToSelect.is_shiny ? (species.species_id.shiny_emoji || `${species.species_id.emoji}✨`) : species.species_id.emoji
			}
		})
		return { success: true, ...resultData }
	} catch (error) {
		console.error(error)
		return { success: false, message: error.message }
	} finally {
		session.endSession()
	}
}

const getUserXpNeeded = level => 2000 + (level - 1) * 1000

const addUserXp = async (user, amount) => {
	const dailyXpMax = 3000
	const today = new Date().toISOString().split('T')[0]
	if (user.lastXpReset?.toISOString().split('T')[0] !== today) {
		user.dailyXp = 0
		user.lastXpReset = new Date()
	}

	if (user.dailyXp >= dailyXpMax) {
		return { leveledUp: false }
	}

	const gain = Math.min(amount, dailyXpMax - user.dailyXp)
	user.xp += gain
	user.dailyXp += gain

	let leveledUp = false
	let oldLevel = user.level
	let totalReward = 0

	while (user.xp >= getUserXpNeeded(user.level)) {
		user.xp -= getUserXpNeeded(user.level)
		user.level++
		const reward = 10000 + (user.level - 1) * 5000
		totalReward += reward
		user.coke += reward
		leveledUp = true
	}

	if (leveledUp || gain > 0) {
		await user.save()
	}
	return { leveledUp, oldLevel, newLevel: user.level, totalReward }
}

const getRankEmoji = level => {
	if (level <= 10) return '<:Common:1390024512774471902>'
	if (level <= 20) return '<:Uncommon:1390024590347997245>'
	if (level <= 30) return '<:Rare:1390024624380706916>'
	if (level <= 40) return '<:Epic:1390024749517770832>'
	if (level <= 50) return '<:Mysthic:1390024772200567026>'
	if (level <= 60) return '<:Legendary:1390024789279772833>'
	return '<:Ancient:1390024806535004333>'
}

module.exports = {
	getUser,
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
	getTotalCoke,
	buyItem,
	sellItem,
	useItem,
	consumeItem,
	getCokemon,
	getAllCokemonWithUids,
	getFilteredCokemon,
	registerDexEntry,
	addCokemon,
	addCokemons,
	removeCokemon,
	toggleFavorite,
	getActiveCokemon,
	selectActiveCokemon,
	getUserXpNeeded,
	addUserXp,
	getRankEmoji
}