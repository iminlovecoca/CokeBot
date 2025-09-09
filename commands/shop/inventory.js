const { EmbedBuilder } = require('discord.js')
const { getOrCreateUser } = require('../../utils/userUtil')
const { initPage } = require('../../utils/pageUtil')
const shopItems = require('../../data/shopItem')
const config = require('../../data/config.json')
const ITEMS_PER_PAGE = 5

module.exports = {
	name: 'inventory',
	description: 'Kiểm tra túi đồ của bạn.',
	async execute(message) {
		try {
			const user = await getOrCreateUser(message.author.id)
			const userItems = Array.from(user.inventory.entries())
				.map(([id, quantity]) => {
					const itemData = shopItems.get(id)
					if (!itemData) return null
					return { ...itemData, id, quantity }
				})
				.filter(item => item !== null)
			if (userItems.length === 0) {
				return await message.reply('Túi đồ của bạn trống trơn!');
			}

			const totalPages = Math.ceil(userItems.length / ITEMS_PER_PAGE)
			const generateEmbed = (page) => {
				const startIdx = page * ITEMS_PER_PAGE
				const pageItems = userItems.slice(startIdx, startIdx + ITEMS_PER_PAGE)

				const embed = new EmbedBuilder()
					.setColor('#0099ff')
					.setTitle('Túi đồ của bạn')
					.setFooter({ text: `Trang ${page + 1}/${totalPages}` })
						
				const itemColumn = []
				const quantityColumn = []

				pageItems.forEach(item => {
					const emojiDisplay = item.emoji
					itemColumn.push(`${emojiDisplay} ${item.name}`)
					quantityColumn.push(`**${item.quantity}**`)
				})

				if (itemColumn.length > 0) {
					embed.addFields(
						{ name: 'Vật Phẩm', value: itemColumn.join('\n'), inline: true },
						{ name: 'Số lượng', value: quantityColumn.join('\n'), inline: true },
					)
				} else {
					embed.setDescription('Không có vật phẩm nào trong danh mục này.')
				}
				return embed
			}

			await initPage(message, generateEmbed, totalPages, '!inventory')
		} catch(error) {
			return await message.reply(error.message)
		}
	}
}