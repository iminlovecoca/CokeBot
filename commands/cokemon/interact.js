const { setNickname, giveHeldItem, takeHeldItem, cuddleCokemon } = require('../../utils/cokemonUtil')
const { getCokemon, getActiveCokemon } = require('../../utils/userUtil')
const config = require('../../data/config')

module.exports = {
	name: 'interact',
	aliases: ['int'],
	description: 'Tương tác với Cokemon của bạn.',
	usage: '`!interact <hành động> [cokemon_id] [item_id]`',
	examples: '`!interact give 12 metal-coat` (Đưa vật phẩm cho Cokemon ID 12)',
	async execute(message, args) {
		try {
			const action = args[0]?.toLowerCase()
			if (!action) {
				throw new Error(`${config.emoji.no} Bạn phải chỉ định một hành động (ví dụ: \`give\`, \`take\`, \`cuddle\`).`)
			}

			let cokemonId = parseInt(args[1])
			let targetCokemon = null
			if (!isNaN(cokemonId)) {
				targetCokemon = await getCokemon(message.author.id, cokemonId)
			} else {
				targetCokemon = await getActiveCokemon(message.author.id)
			}

			if (!targetCokemon) {
				throw new Error(`${config.emoji.no} Không tìm thấy Cokemon với ID \`${p1CokemonId}\` trong bộ sưu tập của bạn.`)
			}
			let result

			switch (action) {
				case 'nickname':
					const nickname = isNaN(cokemonId) ? args[1] : args[2]
					result = await setNickname(targetCokemon, nickname)
					break
				case 'give':
					const itemIdToGive = isNaN(cokemonId) ? args[1]?.toLowerCase() : args[2]?.toLowerCase()
					if (!itemIdToGive) {
						throw new Error(`${config.emoji.no} Bạn phải chỉ định một vật phẩm để đưa.`)
					}
					result = await giveHeldItem(message.author.id, targetCokemon, itemIdToGive)
					break
				case 'take':
					result = await takeHeldItem(message.author.id, targetCokemon)
					break
				case 'cuddle':
					result = await cuddleCokemon(message.client, message.author.id, targetCokemon)
					break
				default:
					throw new Error(`${config.emoji.no} Hành động không hợp lệ. Hãy thử \`nickname\`, \`give\`, \`take\`, hoặc \`cuddle\`.`)
			}

			if (result.success) {
				return message.reply(result.message)
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			return message.reply(error.message)
		}
	}
}