const Species = require('../models/cokemon/Species')
const config = require('../data/config')
const tierWeights = {
	'Common': 100,
	'Rare': 25,
	'Epic': 5,
	'Ancient': 2,
	'Legendary': 0.2
}
const natureNames = Object.keys(config.natures)

const generateRandomIVs = () => {
	return {
		hp: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		atk: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		def: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1)),
		spd: Math.floor(Math.random() * (config.cokemon_settings.max_iv + 1))
	}
}

const calculateIVPercentage = (ivs) => {
	const totalIVs = ivs.hp + ivs.atk + ivs.def + ivs.spd
	const maxIVs = config.cokemon_settings.max_iv * 4
	const percentage = (totalIVs / maxIVs) * 100
	return parseFloat(percentage.toFixed(2))
}

const calculateStat = (base, iv, level, natureName, statName) => {
	const nature = config.natures[natureName]
	let natureMultiplier = 1.0
	if (nature) {
		if (nature.plus === statName) {
			natureMultiplier = 1.1;
		} else if (nature.minus === statName) {
			natureMultiplier = 0.9;
		}
	}
	const stat = Math.floor(((2 * base + iv) * level) / 100 + 5)
	return Math.floor(stat * natureMultiplier)
}

const createRandomCokemon = async (lure, theme) => {
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

	const spawnPool = await Species.find(query)
	if (spawnPool.length === 0) {
		// console.error('No possible spawns found at all.')
		return null
	}

	const totalWeight = spawnPool.reduce((sum, species) => sum + (tierWeights[species.tier] || 0), 0)
	let randomWeight = Math.random() * totalWeight

	let selectedSpecies = null
	for (const species of spawnPool) {
		randomWeight -= (tierWeights[species.tier] || 0)
		if (randomWeight <= 0) {
			selectedSpecies = species
			break
		}
	}
	if (!selectedSpecies) {
		selectedSpecies = spawnPool[spawnPool.length - 1]
	}
	const assignedNature = natureNames[Math.floor(Math.random() * natureNames.length)]

	const availableGenders = selectedSpecies.available_genders
	const gender = availableGenders[Math.floor(Math.random() * availableGenders.length)]
	const ivs = generateRandomIVs()
	const level = Math.floor(Math.random() * 10) + 1 // level 1-10
	return {
		species_id: selectedSpecies._id,
		name: selectedSpecies.name,
		catch_rate: selectedSpecies.catch_rate,
		flee_rate: selectedSpecies.flee_rate,
		gender: gender,
		ivs: ivs,
		level: level,
		speciesData: selectedSpecies,
		nature: assignedNature
	}
}

module.exports = {
	calculateIVPercentage,
	calculateStat,
	createRandomCokemon
}