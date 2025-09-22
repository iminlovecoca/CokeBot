const { buyItem } = require('../../utils/userUtil')
const config = require('../../data/config')

module.exports = {
	name: 'buy',
	description: 'Mua một vật phẩm từ cửa hàng.',
	usage: '`!buy <item-id> [số lượng]`',
	examples: '`!buy sun-stone 3`',
	async execute(message, args) {
		try {
			const itemId = args[0]
			let quantity = 1 // Default quantity is 1

			if (!itemId) {
				throw new Error('❌ | Bạn cần chỉ định ID của vật phẩm để mua. Ví dụ: `!buy lure-flame`')
			}
			if (args[1]) {
				quantity = parseInt(args[1])
				if (isNaN(quantity) || quantity <= 0) {
					throw new Error('❌ | Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.')
				}
			}

			const result = await buyItem(message.client ,message.author.id, itemId, quantity)
			if (result.success) {
				return await message.reply(
					`✅ **${message.author.username}** đã mua thành công **${result.quantity} x ${result.item.name}** với giá ${config.emoji.money} **${result.cost}**!`
				)
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			return await message.reply(error.message)
		}
	}
}