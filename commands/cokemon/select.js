const { getActiveCokemon, selectActiveCokemon } = require('../../utils/userUtil')
const config = require('../../data/config')

module.exports = {
	name: 'select',
	aliases: ['active'],
	description: 'Chọn một cokemon làm bạn đồng hành để nhận XP và tăng tình bạn.',
	usage: '`!select <id>`',
	examples: '`!select 27`',
	async execute(message, args) {
		try {
			if (args.length === 0) {
				const activeCokemon = await getActiveCokemon(message.author.id)
				const species = activeCokemon.species_id
				const displayEmoji = activeCokemon.is_shiny ? (species.shiny_emoji || `${species.emoji}✨`) : species.emoji
				await message.reply(`Bạn đồng hành hiện tại của bạn là **${activeCokemon.nickname || species.name}** ${displayEmoji} (ID: ${activeCokemon.uid}).`)
			} else {
				const cokemonUid = parseInt(args[0])
				if (isNaN(cokemonUid)) {
					throw new Error(`${config.emoji.no} Bạn cần cung cấp ID của cokemon bạn muốn chọn. Ví dụ: \`!select 12\``)
				}

				const result = await selectActiveCokemon(message.author.id, cokemonUid)
				if (result.success) {
					await message.reply(`${config.emoji.yes} Bạn đã chọn **${result.cokemonName}** ${result.emoji} (ID: ${cokemonUid}) làm bạn đồng hành mới!`)
				} else {
					throw new Error(result.message)
				}
			}
		} catch (error) {
			await message.reply(error.message)
		}
	}
}