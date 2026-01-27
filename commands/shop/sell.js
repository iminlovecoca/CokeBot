const { sellItem } = require('../../utils/userUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

module.exports = {
	name: 'sell',
	description: 'Bán một vật phẩm từ túi đồ của bạn.',
	usage: '`!sell <item-id> [số-lượng]`',
	examples: '`!sell lure-volcano`',
	async execute(message, args) {
		const itemId = args[0]
		let quantity = 1 // Default quantity is 1

		if (!itemId) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn cần chỉ định ID của vật phẩm để bán. Ví dụ: \`!sell lure-flame\``)
		}
		if (args[1]) {
			quantity = parseInt(args[1])
			if (isNaN(quantity) || quantity <= 0) {
				throw new UserFriendlyError(`${config.emoji.no} Số lượng không hợp lệ. Vui lòng nhập một số lớn hơn 0.`)
			}
		}

		const { item, gain } = await sellItem(message.client ,message.author.id, itemId, quantity)
		await message.reply(
			`${config.emoji.yes} Bạn đã bán thành công **${quantity} x ${item.name}** ${item.emoji} và nhận được ${config.emoji.money} **${gain}**!`
		)
	}
}