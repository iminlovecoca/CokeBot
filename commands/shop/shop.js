const { EmbedBuilder } = require('discord.js')
const { initPage } = require('../../utils/pageUtil')
const shopItems = require('../../data/shopItem')
const config = require('../../data/config.json')
const ITEMS_PER_PAGE = 5

const getItems = () => {
	return Array.from(shopItems.entries()).map(([id, data]) => ({id, ...data}))
}

module.exports = {
	name: 'shop',
	description: 'Hiển thị giao diện cửa hàng.',
	async execute(message) {
		try {
			const allItems = getItems()
			const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE)

			const generateEmbed = (page) => {
				const startIdx = page * ITEMS_PER_PAGE
				const pageItems = allItems.slice(startIdx, startIdx + ITEMS_PER_PAGE)

				const embed = new EmbedBuilder()
					.setColor('#0099ff')
					.setTitle('Cửa Hàng Cokemon')
					.setDescription(
						'- Nhập \`!buy <id> <số lượng>\` để mua vật phẩm.\n' +
						'- Nhập \`!sell <id> <số lượng>\` để bán vật phẩm với 75% giá gốc.\n'
					)
					.setFooter({ text: `Trang ${page + 1}/${totalPages}` })
						
				const itemColumn = []
				const priceColumn = []

				pageItems.forEach(item => {
					const emojiDisplay = item.emoji
					itemColumn.push(`${emojiDisplay} ${item.name} (\`${item.id}\`)`)
					priceColumn.push(`**${item.price}** ${config.emoji.money}`)
				})

				if (itemColumn.length > 0) {
					embed.addFields(
						{ name: 'Vật Phẩm', value: itemColumn.join('\n'), inline: true },
						{ name: 'Giá', value: priceColumn.join('\n'), inline: true },
					)
				} else {
					embed.setDescription('Không có vật phẩm nào trong danh mục này.')
				}
				return embed
			}
			await initPage(message, generateEmbed, totalPages,'!shop')
		} catch(error) {
			return await message.reply(error.message)
		}
	}
}