const { addCokemon } = require('../../utils/userUtil')

module.exports = {
	name: 'catch',
	description: 'Thử bắt cokemon.',
	async execute(message, args) {
		if (message.client.actionLocks.has(message.author.id)) {
			return await message.reply('❌ | Bạn đang thực hiện một hành động khác! Vui lòng đợi một lát.')
		}

		try {
			message.client.actionLocks.add(message.author.id)
			const spawnState = message.client.activeSpawns.get(message.channel.id)
			if (!spawnState) {
				return await message.reply('Không có gì ở đây để ném  cả.')
			}

			const guess = args.join(' ')
			if (guess.toLowerCase() !== spawnState.cokemon.name.toLowerCase()) {
				return await message.reply('Bạn ném lưới trượt!')
			}

			let userState = spawnState.userStates.get(message.author.id) || { catchRateModifier: 1.0, fleeRateModifier: 1.0, hasFled: false }
			if (userState.hasFled) {
				throw new Error(`**${spawnState.cokemon.name}** đã chạy mất khỏi bạn rồi!`)
			}

			const finalCatchChance = spawnState.cokemon.catch_rate * userState.catchRateModifier
			if (Math.random() <= finalCatchChance) {
				const isShiny = (Math.random() < (1 / 16))
				const cokemonData = {
					owner_id: message.author.id,
					species_id: spawnState.cokemon.species_id,
					gender: spawnState.cokemon.gender,
					ivs: spawnState.cokemon.ivs,
					level: spawnState.cokemon.level,
					is_shiny: isShiny
				}
				const result = await addCokemon(cokemonData)
				if (result.success) {
					userState.hasFled = true
					spawnState.userStates.set(message.author.id, userState)
					const speciesData = spawnState.cokemon.speciesData;
					const displayEmoji = isShiny ? speciesData.shiny_emoji : speciesData.emoji
					await message.reply(isShiny ? `✨ UNBELIEVABLE! ✨ **${message.author.username}** đã bắt được một **SHINY ${speciesData.name}** ${displayEmoji}!`
						: `Chúc mừng! **${message.author.username}** đã bắt được **${speciesData.name}** ${displayEmoji}!`)
				} else {
					throw new Error(result.message)
				}
			} else {
				userState.hasFled = true
				spawnState.userStates.set(message.author.id, userState)
				await message.channel.send(`**${spawnState.cokemon.name}** đã chạy mất khỏi ${message.author.username}!`)
			}
		} catch (error) {
			await message.reply(error.message)
		} finally {
			message.client.actionLocks.delete(message.author.id)
		}
	}
}