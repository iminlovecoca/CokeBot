const { sellItem } = require('../../utils/userUtil')
const shopItems = require('../../data/shopItem')
const config = require('../../data/config.json')

module.exports = {
	name: 'sell',
	description: 'Bán một vật phẩm từ túi đồ của bạn.',
	async execute(message, args) {
		try {
			const itemId = args[0]
			let quantity = 1 // Default quantity is 1

			if (!itemId) {
				throw new Error('❌ | Bạn cần chỉ định ID của vật phẩm để bán. Ví dụ: `!sell lure-flame`')
			}
			if (args[1]) {
				quantity = parseInt(args[1])
				if (isNaN(quantity) || quantity <= 0) {
					throw new Error('❌ | Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.');
				}
			}

			const result = await sellItem(message.author.id, itemId, quantity)
			if (result.success) {
				return await message.reply(
					`✅ Bạn đã bán thành công **${result.quantity} x ${result.item.name}** và nhận được **${result.gain}** ${config.emoji.money}!`
				)
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			return await message.reply(error.message)
		}
	}
}