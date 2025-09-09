const { useItem } = require('../../utils/userUtil')

module.exports = {
	name: 'use',
	description: 'Sử dụng một vật phẩm từ túi đồ của bạn.',
	async execute(message, args) {
		try {
			const itemId = args[0]
			if (!itemId) {
				throw new Error('❌ | Bạn cần chỉ định ID của vật phẩm để sử dụng. Ví dụ: `!use lure-flame`')
			}

			const result = await useItem(message.client, message.author, message.channel.id, itemId)
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