const { toggleFavorite } = require('../../utils/userUtil')

module.exports = {
	name: 'favourite',
	aliases: ['fav'],
	description: 'Đánh dấu, hoặc bỏ đánh dấu một cokemon là yêu thích.',
	usage: '`!favourite <id>`',
	examples: '`!favourite 27`',
	async execute(message, args) {
		try {
			const cokemonUid = parseInt(args[0])
			if (isNaN(cokemonUid)) {
				throw new Error("Bạn cần cung cấp ID của cokemon. Ví dụ: `!favorite 12`")
			}
			
			const result = await toggleFavorite(message.author.id, cokemonUid)
			if (result.success) {
				if (result.is_favorite) {
					await message.reply(`❤️ **${result.cokemonName}** (ID: ${cokemonUid}) đã được đánh dấu là yêu thích!`)
				} else {
					 await message.reply(`💔 **${result.cokemonName}** (ID: ${cokemonUid}) đã bị bỏ yêu thích.`)
				}
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			await message.reply(error.message)
		}
	}
}