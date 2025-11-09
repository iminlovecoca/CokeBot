const { useItem } = require('../../utils/userUtil')
const config = require('../../data/config')

module.exports = {
	name: 'use',
	description: 'Sử dụng một vật phẩm từ túi đồ của bạn.',
	usage: '`!use <item-id> [số-lượng]`',
	examples: '`!use catch-net`',
	async execute(message, args) {
		try {
			const itemId = args[0]?.toLowerCase()
			if (!itemId) {
				throw new Error(`${config.emoji.no} Bạn cần chỉ định ID của vật phẩm để sử dụng. Ví dụ: \`!use lure-flame\``)
			}

			let targetId = null
			let quantity = 1
			if (itemId === 'rare-candy') {
				targetId = args[1]
				quantity = parseInt(args[2]) || 1
			} else {
				targetId = null
				quantity = parseInt(args[1]) || 1
			}

			if (quantity <= 0) {
				throw new Error(`${config.emoji.no} Số lượng phải là một số dương.`)
			}

			const result = await useItem(message.client, message.author, message.channel.id, itemId, targetId, quantity)
			if (result.success) {
				if (result.itemType === 'lure') {
					return await message.channel.send(result.message)
				} else {
					return await message.reply(result.message)
				}
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			return await message.reply(error.message)
		}
	}
}