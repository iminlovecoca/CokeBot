const { setNickname, giveHeldItem, takeHeldItem, cuddleCokemon } = require('../../utils/cokemonUtil')
const { getCokemon, getActiveCokemon } = require('../../utils/userUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

module.exports = {
	name: 'interact',
	aliases: ['int'],
	description: 'Tương tác với Cokemon của bạn.',
	usage: '`!interact <hành động> [cokemon_id] [item_id/biệt danh]`',
	examples: '`!interact give 12 metal-coat` (Đưa vật phẩm cho Cokemon ID 12)',
	async execute(message, args) {
		const action = args[0]?.toLowerCase()
		if (!action) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn phải chỉ định một hành động (ví dụ: \`give\`, \`take\`, \`cuddle\`).`)
		}

		let cokemonId = parseInt(args[1])
		let targetCokemon = null
		if (!isNaN(cokemonId)) {
			targetCokemon = await getCokemon(message.author.id, cokemonId)
		} else {
			targetCokemon = await getActiveCokemon(message.author.id)
		}
		let resultMessage = null

		switch (action) {
			case 'nickname':
				const nickname = isNaN(cokemonId) ? args[1] : args[2]
				if (!nickname) {
					throw new UserFriendlyError(`${config.emoji.no} Bạn phải cung cấp biệt danh muốn đặt.`)
				}
				resultMessage = await setNickname(targetCokemon, nickname)
				break
			case 'rm_nickname':
				resultMessage = await setNickname(targetCokemon)
				break
			case 'give':
				const itemIdToGive = isNaN(cokemonId) ? args[1]?.toLowerCase() : args[2]?.toLowerCase()
				if (!itemIdToGive) {
					throw new UserFriendlyError(`${config.emoji.no} Bạn phải chỉ định một vật phẩm để đưa.`)
				}
				resultMessage = await giveHeldItem(message.author.id, targetCokemon, itemIdToGive)
				break
			case 'take':
				resultMessage = await takeHeldItem(message.author.id, targetCokemon)
				break
			case 'cuddle':
				resultMessage = await cuddleCokemon(message.client, message.author.id, targetCokemon)
				break
			default:
				throw new UserFriendlyError(`${config.emoji.no} Hành động không hợp lệ. Hãy thử \`nickname\`, \`rm_nickname\`, \`give\`, \`take\`, hoặc \`cuddle\`.`)
		}
		await message.reply(resultMessage)
	}
}