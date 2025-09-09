const { removeCokemon } = require('../../utils/userUtil')

module.exports = {
	name: 'release',
	description: 'Thử một cokemon về với tự nhiê.',
	async execute(message, args) {
		try {
			const cokemonUid = parseInt(args[0])
			if (isNaN(cokemonUid)) {
				throw new Error('Bạn cần cung cấp ID của cokemon bạn muốn thả. Ví dụ: `!release 3`')
			}

			const result = await removeCokemon(message.author.id, cokemonUid)
			if (result.success) {
				const species = result.releasedCokemon.species_id
				const displayEmoji = result.releasedCokemon.is_shiny ? species.shiny_emoji : species.emoji
				await message.reply(`Bạn đã thả **${species.name}** ${displayEmoji} (ID: ${cokemonUid}) `+
					`về với tự nhiên và nhận được **${result.reward}** coke!`)
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			await message.reply(error.message)
		}
	}
}