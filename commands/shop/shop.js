const { EmbedBuilder } = require('discord.js')
const { initPage } = require('../../utils/pageUtil')
const shopItems = require('../../data/shopItem')
const config = require('../../data/config')
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

			const generateDisplay = (page) => {
				const startIdx = page * ITEMS_PER_PAGE
				const pageItems = allItems.slice(startIdx, startIdx + ITEMS_PER_PAGE)

				const embed = new EmbedBuilder()
					.setColor('#0099ff')
					.setTitle('Cửa Hàng Cokemon')
					.setDescription(
						"- `!buy <id> <số lượng>`: mua vật phẩm.\n" +
						"- `!sell <id> <số lượng>`: bán vật phẩm với 75% giá gốc.\n"
					)
					.setFooter({ text: `Trang ${page + 1}/${totalPages}` })

				pageItems.forEach(item => {
					embed.addFields({
						name: `${item.emoji} ${item.name} \`${item.id}\``,
						value: `*${item.description}*\n**Giá:** ${item.price} ${config.emoji.money}`,
						inline: false
					})
				})
				return { embeds: [embed] }
			}
			await initPage(message, generateDisplay, totalPages,'!shop')
		} catch(error) {
			return await message.reply(error.message)
		}
	}
}