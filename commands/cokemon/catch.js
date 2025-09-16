const { addCokemon } = require('../../utils/userUtil')
const config = require('../../data/config')
const { setCooldown, getRemainingCooldown, notifyCooldown } = require('../../utils/cooldown')

const cooldownSeconds = 5

module.exports = {
	name: 'catch',
	aliases: ['c', 'h'],
	description: 'Thử bắt cokemon.',
	async execute(message) {
		const userId = message.author.id

		// Check cooldown
		const cooldown = getRemainingCooldown(userId, 'catch')
		if (cooldown > 0) {
			return notifyCooldown(message, cooldown)
		}
		setCooldown(userId, 'catch', cooldownSeconds)

		if (message.client.actionLocks.has(userId)) {
			return await message.reply('❌ | Bạn đang thực hiện một hành động khác! Vui lòng đợi một lát.')
		}

		try {
			message.client.actionLocks.add(userId)
			const spawnState = message.client.activeSpawns.get(message.channel.id)
			if (!spawnState) {
				throw new Error('Không có gì ở đây để ném cả.')
			}

			let userState = spawnState.userStates.get(userId) || { catchRateModifier: 1.0, fleeRateModifier: 1.0, hasFled: false }
			if (userState.hasFled) {
				throw new Error(`**${spawnState.cokemon.name}** đã chạy mất khỏi bạn rồi!`)
			}

			const finalCatchChance = spawnState.cokemon.catch_rate * userState.catchRateModifier
			if (Math.random() <= finalCatchChance) {
				const isShiny = (Math.random() < (1 / config.cokemon_settings.shiny_rate))
				const cokemonData = {
					owner_id: userId,
					species_id: spawnState.cokemon.species_id,
					gender: spawnState.cokemon.gender,
					ivs: spawnState.cokemon.ivs,
					level: spawnState.cokemon.level,
					is_shiny: isShiny
				}
				const result = await addCokemon(cokemonData)
				if (result.success) {
					userState.hasFled = true
					spawnState.userStates.set(userId, userState)
					const speciesData = spawnState.cokemon.speciesData
					const displayEmoji = isShiny ? (speciesData.shiny_emoji || `${speciesData.emoji}✨`) : speciesData.emoji
					await message.reply(
						isShiny
							? `✨ UNBELIEVABLE! ✨ **${message.author.username}** đã bắt được một **SHINY ${speciesData.name}** ${displayEmoji}!`
							: `Chúc mừng! **${message.author.username}** đã bắt được **${speciesData.name}** ${displayEmoji}!`
					)
				} else {
					throw new Error(result.message)
				}
			} else {
				await message.reply(`Oh no! **${spawnState.cokemon.name}** đã thoát ra!`)
				if (Math.random() < (spawnState.cokemon.flee_rate * userState.fleeRateModifier)) {
					userState.hasFled = true
					spawnState.userStates.set(userId, userState)
					await message.channel.send(`**${spawnState.cokemon.name}** đã chạy mất khỏi ${message.author.username}!`)
				}
			}
		} catch (error) {
			await message.reply(error.message)
		} finally {
			message.client.actionLocks.delete(userId)
		}
	}
}
