const { toggleFavorite } = require('../../utils/userUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

module.exports = {
	name: 'favourite',
	aliases: ['fav'],
	description: 'Đánh dấu, hoặc bỏ đánh dấu một cokemon là yêu thích.',
	usage: `${config.prefix}favourite <id>`,
	examples: [
		{ intent: 'Đánh dấu hoặc bỏ đánh dấu yêu thích cho Cokemon có ID 27', command: `${config.prefix}favourite 27` }
	],
	async execute(message, args) {
		const cokemonUid = parseInt(args[0])
		if (isNaN(cokemonUid)) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn cần cung cấp ID của cokemon bạn muốn chọn. Ví dụ: \`!favorite 12\``)
		}
		
		const { isFavorite, cokemonName } = await toggleFavorite(message.author.id, cokemonUid)
		if (isFavorite) {
			await message.reply(`❤️ **${cokemonName}** (ID: ${cokemonUid}) đã được đánh dấu là yêu thích!`)
		} else {
			await message.reply(`💔 **${cokemonName}** (ID: ${cokemonUid}) đã bị bỏ yêu thích.`)
		}
	}
}