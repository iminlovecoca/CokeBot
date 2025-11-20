const mongoose = require('mongoose')
const Cokemon = require('../models/cokemon/Cokemon')
const Species = require('../models/cokemon/Species')
const Item = require('../models/cokemon/Item')
const User = require('../models/User')
const { formatDuration } = require('./miscUtil')
const config = require('../data/config')
const natureNames = Object.keys(config.natures)

const generateRandomIVs = () => {
	return {
		hp: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		atk: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		def: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		spatk: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		spdef: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		spd: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1))
	}
}

const calculateIVPercentage = (ivs) => {
	const totalIVs = ivs.hp + ivs.atk + ivs.def + ivs.spatk + ivs.spdef + ivs.spd
	const maxIVs = config.cokemon_settings.max_iv * 6
	const percentage = (totalIVs / maxIVs) * 100
	return parseFloat(percentage.toFixed(2))
}

const calculateStat = (base, iv, level, natureName, statName) => {
	const nature = config.natures[natureName]
	let natureMultiplier = 1.0
	if (nature) {
		if (nature.plus === statName) {
			natureMultiplier = 1.1
		} else if (nature.minus === statName) {
			natureMultiplier = 0.9
		}
	}
	const stat = Math.floor(((2 * base + iv) * level) / 100 + 5)
	return Math.floor(stat * natureMultiplier)
}

const getRandomGender = species => {
	const availableGenders = species.available_genders
	return availableGenders[Math.floor(Math.random() * availableGenders.length)]
}

const getRandomAbility = species => {
	const availableAbilities = species.available_abilities.filter(a => !a.is_hidden)
	if (availableAbilities.length > 0) {
		const randomAbilityData = availableAbilities[Math.floor(Math.random() * availableAbilities.length)]
		return randomAbilityData.ability._id
	} else {
		return availableAbilities[0].ability._id
	}
}

const createRandomCokemon = async (speciesName = null, level = null, shiny = false) => {
	let selectedSpecies
	if (speciesName) {
		selectedSpecies = await Species.findOne({ name: new RegExp(`^${speciesName}$`, 'i') })
			.populate('available_abilities')
		if (!selectedSpecies) {
			throw new Error(`${config.emoji.no} Không tìm thấy loài Cokemon nào có tên \`${selectedSpecies}\`.`)
		}
	} else {
		const spawnPool = await Species.find({}).populate('available_abilities')
		if (spawnPool.length === 0) return null

		const totalWeight = spawnPool.reduce((sum, s) => sum + (config.cokemon_settings.tier_weights[s.tier] || 0), 0)
		let randomWeight = Math.random() * totalWeight

		for (const species of spawnPool) {
			randomWeight -= (config.cokemon_settings.tier_weights[species.tier] || 0)
			if (randomWeight <= 0) {
				selectedSpecies = species
				break
			}
		}
		if (!selectedSpecies) {
			selectedSpecies = spawnPool[spawnPool.length - 1]
		}
	}

	const finalLevel = level !== null ? level : (Math.floor(Math.random() * 10) + 1)
	const nature = natureNames[Math.floor(Math.random() * natureNames.length)]
	const gender = getRandomGender(selectedSpecies)
	const ivs = generateRandomIVs()
	const iv_percent = calculateIVPercentage(ivs)
	const ability = getRandomAbility(selectedSpecies)
	const isShiny = shiny ? shiny : (Math.random() < (1 / config.cokemon_settings.shiny_rate))
	return {
		species_id: selectedSpecies._id,
		name: selectedSpecies.name,
		gender: gender,
		ivs: ivs,
		iv_percent: iv_percent,
		ability: ability._id,
		level: finalLevel,
		speciesData: selectedSpecies,
		nature: nature,
		is_shiny: isShiny
	}
}

const createRandomCokemonByTheme = async (lure, theme) => {
	const query = { tier: { $ne: 'Mythical' } }

	if (lure && lure.boosts_type) {
		query.type = { $in: lure.boosts_type }
	} else if (theme && theme.main_types) {
		if (Math.random() < theme.weight) {
			query.type = { $in: theme.main_types }
		} else {
			query.type = { $nin: theme.main_types }
		}
	}

	const spawnPool = await Species.find(query).populate('available_abilities')
	if (spawnPool.length === 0) {
		// console.error('No possible spawns found at all.')
		return null
	}

	const totalWeight = spawnPool.reduce(
		(sum, species) => sum + (config.cokemon_settings.tier_weights[species.tier] || 0), 0)
	let randomWeight = Math.random() * totalWeight

	let selectedSpecies = null
	for (const species of spawnPool) {
		randomWeight -= (config.cokemon_settings.tier_weights[species.tier] || 0)
		if (randomWeight <= 0) {
			selectedSpecies = species
			break
		}
	}
	if (!selectedSpecies) {
		selectedSpecies = spawnPool[spawnPool.length - 1]
	}
	const nature = natureNames[Math.floor(Math.random() * natureNames.length)]
	const gender = getRandomGender(selectedSpecies)
	const ivs = generateRandomIVs()
	const iv_percent = calculateIVPercentage(ivs)
	const ability = getRandomAbility(selectedSpecies)
	const level = Math.floor(Math.random() * 10) + 1 // level 1-10
	return {
		species_id: selectedSpecies._id,
		name: selectedSpecies.name,
		catch_rate: selectedSpecies.catch_rate,
		flee_rate: selectedSpecies.flee_rate,
		gender: gender,
		ivs: ivs,
		iv_percent: iv_percent,
		ability: ability._id,
		level: level,
		speciesData: selectedSpecies,
		nature: nature,
		emoji: selectedSpecies.emoji,
		shiny_emoji: selectedSpecies.shiny_emoji
	}
}

const getCokemonXpNeeded = level => {
	if (level <= 1) return 0
	return Math.pow(level, 3)
}

const addCokemonXp = async (cokemon, amount) => {
	if (cokemon.level >= config.cokemon_settings.max_level) {
		return { levelsGained: 0 }
	}

	cokemon.experience += amount
	let levelsGained = 0
	let xpForNextLevel = getCokemonXpNeeded(cokemon.level + 1)

	while (cokemon.experience >= xpForNextLevel) {
		cokemon.level++
		levelsGained++
		cokemon.friendship = (cokemon.friendship || 0) + 2
		xpForNextLevel = getCokemonXpNeeded(cokemon.level + 1)
	}

	if (cokemon.friendship > config.cokemon_settings.max_friendship) {
		cokemon.friendship = config.cokemon_settings.max_friendship
	}
	await cokemon.save()
	return { levelsGained }
}

const getSpecies = async speciesId => {
	return await Species.findById(speciesId)
}

const getCokemonEmoji = (cokemon, species = null) => {
	const species_ = species === null ? cokemon.species_id : species
	return cokemon.is_shiny ? (species_.shiny_emoji || `${species_.emoji}✨`) : species_.emoji
}

const getGenderEmoji = cokemon => {
	return cokemon.gender === 'Male' ? config.emoji.male : cokemon.gender === 'Female' ? config.emoji.female : config.emoji.genderless
}

const getGenderEmojiByText = gender => {
	switch (gender) {
		case 'Male': return config.emoji.male
		case 'Female': return config.emoji.female
		case 'Genderless': return config.emoji.genderless
	}
}

const getCokemonName = cokemon => {
	return cokemon.nickname || cokemon.species_id.name
}

const setNickname = async (cokemon, nickname) => {
	let message
	const cokemonName = getCokemonName(cokemon)
	const cokemonEmoji = getCokemonEmoji(cokemon)

	try {
		if (!nickname) {
			cokemon.nickname = null
			await cokemon.save()
			message = `${config.emoji.yes} Bạn đã xóa biệt danh của **${cokemonName}** ${cokemonEmoji}.`
		}

		if (nickname.length > config.cokemon_settings.max_nickname_len) {
			throw new Error(`${config.emoji.no} Biệt danh không được dài quá ${config.cokemon_settings.max_nickname_len} ký tự.`)
		}

		cokemon.nickname = nickname
		await cokemon.save()
		message = `${config.emoji.yes} Bạn đã đổi biệt danh của **${cokemonName}** ${cokemonEmoji} thành **${nickname}**.`
		return { success: true, message }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const giveHeldItem = async (userId, cokemon, itemIdToGive) => {
	const session = await mongoose.startSession()
	try {
		let message
		await session.withTransaction(async () => {
			const user = await User.findOne({ userId }).session(session)
			if (!user) {
				throw new Error(`${config.emoji.no} Không thể tìm thấy dữ liệu người chơi.`)
			}

			const itemToGive = await Item.findOne({ item_id: itemIdToGive }).session(session)
			if (!itemToGive) {
				throw new Error(`${config.emoji.no} Không tìm thấy vật phẩm nào có ID \`${itemIdToGive}\`.`)
			}

			const ownedQuantity = user.inventory.get(itemIdToGive) || 0
			if (ownedQuantity < 1) {
				throw new Error(`${config.emoji.no} Bạn không có vật phẩm \`${itemIdToGive}\`.`)
			}

			const newQuantity = ownedQuantity - 1
			if (newQuantity === 0) {
				user.inventory.delete(itemIdToGive)
			} else {
				user.inventory.set(itemIdToGive, newQuantity)
			}

			await cokemon.populate('held_item_id')
			const heldItem = cokemon.held_item_id
			const cokemonName = getCokemonName(cokemon)
			const cokemonEmoji = getCokemonEmoji(cokemon)
			if (heldItem) {
				user.inventory.set(heldItem.item_id, (user.inventory.get(heldItem.item_id) || 0) + 1)
				message = `${config.emoji.yes} Bạn đã lấy lại **${heldItem.name}** ${heldItem.emoji} và đưa **${itemToGive.name}** ${itemToGive.emoji} cho **${cokemonName}** ${cokemonEmoji} giữ.`
			} else {
				message = `${config.emoji.yes} Bạn đã đưa **${itemToGive.name}** ${itemToGive.emoji} cho **${cokemonName}** ${cokemonEmoji} giữ.`
			}

			cokemon.held_item_id = itemToGive._id
			await user.save({ session })
			await cokemon.save({ session })
		})
		return { success: true, message: message }
	} catch (error) {
		return { success: false, message: error.message }
	} finally {
		session.endSession()
	}
}

const takeHeldItem = async (userId, cokemon) => {
	const session = await mongoose.startSession()

	try {
		const cokemonName = getCokemonName(cokemon)
		await cokemon.populate('held_item_id')
		const itemToTake = cokemon.held_item_id
		if (!itemToTake) {
			throw new Error(`${cokemonName} đang không giữ vật phẩm nào.`)
		}

		await session.withTransaction(async () => {
			const user = await User.findOne({ userId }).session(session)
			if (!user) {
				throw new Error(`${config.emoji.no} Không thể tìm thấy dữ liệu người chơi.`)
			}

			user.inventory.set(itemToTake.item_id, (user.inventory.get(itemToTake.item_id) || 0) + 1)
			cokemon.held_item_id = null
			await user.save({ session })
			await cokemon.save({ session })
		})
		return { success: true, message: `${config.emoji.yes} Bạn đã lấy lại **${itemToTake.name}** ${itemToTake.emoji} từ **${cokemonName}** ${getCokemonEmoji(cokemon)}.` }
	} catch (error) {
		return { success: false, message: error.message }
	} finally {
		session.endSession()
	}
}

const cuddleCokemon = async (client, userId, cokemon) => {
	try {
		const now = Date.now()
		const cooldown = client.cuddleCooldowns.get(userId) || 0
		const cokemonName = getCokemonName(cokemon)
		if (now < cooldown) {
			const remaining = Math.ceil((cooldown - now) / 1000)
			throw new Error(`${config.emoji.no} Bạn có thể âu yếm ${cokemonName} lại sau ${formatDuration(remaining)}.`)
		}

		cokemon.friendship = Math.min((cokemon.friendship || 0) + 2, config.cokemon_settings.max_friendship)
		await cokemon.save()
		client.cuddleCooldowns.set(userId, now + config.cokemon_settings.cuddle_cooldown_ms)
		return { success: true, message: `♥️ Bạn vừa âu yếm **${cokemonName}** ${getCokemonEmoji(cokemon)}, tình bạn càng thêm khăng khít!` }
	} catch (error) {
		return { success: false, message: error.message }
	}
}

const giftCokemon = async (cokemon, originalOwnerId, newOwnerId) => {
	const session = await mongoose.startSession()
	const cokemonName = getCokemonName(cokemon)

	try {
		await session.withTransaction(async () => {
			const freshCokemon = await Cokemon.findById(cokemon._id).session(session)

			if (freshCokemon.owner_id !== originalOwnerId) {
				return `${cokemonName} đã được tặng hoặc trao đổi với người khác rồi.`
			}

			const newOwner = await User.findOne({ userId: newOwnerId }).session(session)
			if (!newOwner) {
				throw new Error(`${config.emoji.no} Không tìm thấy người nhận Cokemon.`)
			}

			newOwner.last_cokemon_id++
			freshCokemon.owner_id = newOwnerId
			freshCokemon.catch_method = 'gifted'
			freshCokemon.uid = newOwner.last_cokemon_id
			freshCokemon.acquiredAt = new Date()
			freshCokemon.friendship = config.cokemon_settings.base_friendship
			await freshCokemon.save({ session })
			await newOwner.save({ session })
		})
		return `🐶 ${cokemonName} đã được gửi thành công!`
	} catch (error) {
		throw error
	} finally {
		session.endSession()
	}
}

const swapCokemonOwnership = async (p1Cokemon, p2Cokemon) => {
	const p1Id = p1Cokemon.owner_id
	const p2Id = p2Cokemon.owner_id

	const session = await mongoose.startSession()
	let evolutionResults = { p1CokemonEvolvedTo: null, p2CokemonEvolvedTo: null }
	try {
		await session.withTransaction(async () => {
			const p1 = await User.findOne({ userId: p1Id }).session(session)
			const p2 = await User.findOne({ userId: p2Id }).session(session)
			const freshP1Cokemon = await Cokemon.findById(p1Cokemon._id).session(session)
			const freshP2Cokemon = await Cokemon.findById(p2Cokemon._id).session(session)

			p1.last_cokemon_id++
			p2.last_cokemon_id++

			freshP1Cokemon.owner_id = p2Id
			freshP1Cokemon.uid = p2.last_cokemon_id
			freshP1Cokemon.catch_method = 'traded'
			freshP1Cokemon.acquiredAt = new Date()
			freshP1Cokemon.friendship = config.cokemon_settings.base_friendship

			freshP2Cokemon.owner_id = p1Id
			freshP2Cokemon.uid = p1.last_cokemon_id
			freshP2Cokemon.catch_method = 'traded'
			freshP2Cokemon.acquiredAt = new Date()
			freshP2Cokemon.friendship = config.cokemon_settings.base_friendship

			const processTradeEvolution = async (cokemon) => {
				await cokemon.populate('species_id held_item_id')
				const species = await cokemon.species_id
				if (species.evolution && species.evolution.length > 0) {
					let evolutionTargetId = null

					for (const evo of species.evolution) {
						const tradeCondition = evo.conditions.find(c => c.type === 'trade')
						const tradeItemCondition = evo.conditions.find(c => c.type === 'trade_item')
						if (tradeCondition) {
							evolutionTargetId = evo.species_id
							break
						}

						if (tradeItemCondition) {
							if (cokemon.held_item_id && cokemon.held_item_id.item_id === tradeItemCondition.value) {
								evolutionTargetId = evo.species_id
								break
							}
						}
					}

					if (evolutionTargetId) {
						const newSpecies = await Species.findById(evolutionTargetId).populate('available_abilities').session(session)
						if (newSpecies) {
							const hasAbility = newSpecies.available_abilities.some(a => a._id.equals(cokemon.ability))
							if (!hasAbility) {
								cokemon.ability = getRandomAbility(newSpecies)
							}
							cokemon.species_id = newSpecies._id
							return newSpecies
						}
					}
				}
				return null
			}

			evolutionResults.p1CokemonEvolvedTo = await processTradeEvolution(freshP2Cokemon)
			evolutionResults.p2CokemonEvolvedTo = await processTradeEvolution(freshP1Cokemon)
			await p1.save({ session })
			await p2.save({ session })
			await freshP1Cokemon.save({ session })
			await freshP2Cokemon.save({ session })
		})
		return { success: true, ...evolutionResults }
	} catch (error) {
		return { success: false, message: `${config.emoji.no} Lỗi trong quá trình trao đổi, hãy thử lại nào.` }
	} finally {
		session.endSession()
	}
}

const getPersonalityValue = cokemon => {
	const ivSum = Object.values(cokemon.ivs).reduce((sum, value) => sum + value, 0)
	return ivSum % 10
}

const getCatchMethodText = method => {
	switch (method) {
		case 'manual': return 'Bắt 🤚'
		case 'net': return 'Lưới 🕸️'
		case 'gifted': return 'Được tặng 🎁'
		case 'traded': return 'Trao đổi 🔄'
		default: return 'Không rõ'
	}
}

const getTypeText = type => {
	switch (type) {
		case 'Fire': return 'Lửa'
		case 'Water': return 'Nước'
		case 'Grass': return 'Cỏ'
		case 'Electric': return 'Điện'
		case 'Flying': return 'Bay'
		case 'Rock': return 'Đá'
		case 'Ground': return 'Đất'
		case 'Bug': return 'Bọ'
		case 'Fighting': return 'Giác đấu'
		case 'Psychic': return 'Tâm linh'
		case 'Dragon': return 'Rồng'
		case 'Steel': return 'Thép'
		case 'Normal': return 'Thường'
		case 'Poison': return 'Độc'
		case 'Ice': return 'Băng'
		case 'Fairy': return 'Tiên'
		case 'Ghost': return 'Ma'
		case 'Dark': return 'Bóng tối'
		default: return 'Không rõ'
	}
}

const getGenderText = gender => {
	switch (gender) {
		case 'Male': return 'Đực'
		case 'Female': return 'Cái'
		case 'Genderless': return 'Vô giới'
		default: return 'Không rõ'
	}
}

const getStatText = stat => {
	switch (stat) {
		case 'hp': return 'máu'
		case 'atk': return 'tấn công'
		case 'def': return 'phòng thủ'
		case 'spatk': return 'tấn công Đ.B'
		case 'spdef': return 'phòng thủ Đ.B'
		case 'spd': return 'tốc độ'
		default: return 'Không rõ'
	}
}

const getItem = (client, itemId) => {
	const item = client.allItems.find(i => i.item_id === itemId)
	if (!item) {
		throw new Error(`${config.emoji.no} Vật phẩm không tồn tại.`)
	}
	return item
}

module.exports = {
	calculateIVPercentage,
	calculateStat,
	getRandomAbility,
	createRandomCokemon,
	createRandomCokemonByTheme,
	getCokemonXpNeeded,
	addCokemonXp,
	getSpecies,
	getCokemonEmoji,
	getGenderEmoji,
	getGenderEmojiByText,
	getCokemonName,
	setNickname,
	giveHeldItem,
	takeHeldItem,
	cuddleCokemon,
	giftCokemon,
	swapCokemonOwnership,
	getPersonalityValue,
	getCatchMethodText,
	getTypeText,
	getGenderText,
	getStatText,
	getItem
}