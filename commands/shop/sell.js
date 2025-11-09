const { sellItem } = require('../../utils/userUtil')
const config = require('../../data/config')

module.exports = {
	name: 'sell',
	description: 'Bán một vật phẩm từ túi đồ của bạn.',
	usage: '`!sell <item-id> [số-lượng]`',
	examples: '`!sell lure-volcano`',
	async execute(message, args) {
		try {
			const itemId = args[0]
			let quantity = 1 // Default quantity is 1

			if (!itemId) {
				throw new Error(`${config.emoji.no} Bạn cần chỉ định ID của vật phẩm để bán. Ví dụ: \`!sell lure-flame\``)
			}
			if (args[1]) {
				quantity = parseInt(args[1])
				if (isNaN(quantity) || quantity <= 0) {
					throw new Error(`${config.emoji.no} Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.`)
				}
			}

			const result = await sellItem(message.client ,message.author.id, itemId, quantity)
			if (result.success) {
				return await message.reply(
					`${config.emoji.yes} Bạn đã bán thành công **${result.quantity} x ${result.item.name}** ${result.item.emoji} và nhận được ${config.emoji.money} **${result.gain}**!`
				)
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			return await message.reply(error.message)
		}
	}
}