const { EmbedBuilder } = require('discord.js')
const { initPage } = require('../../utils/pageUtil')
const config = require('../../data/config')
const ITEMS_PER_PAGE = 5

module.exports = {
	name: 'shop',
	description: 'Hiển thị giao diện cửa hàng.',
	usage: `${config.prefix}shop`,
	examples: [
		{ intent: 'Mở cửa hàng', command: `${config.prefix}shop` }
	],
	async execute(message) {
		const allItems = message.client.allItems.filter(item => item.price !== null)

		const regularItems = allItems.filter(item => !item.item_id.startsWith("somber-") && !item.item_id.startsWith("cristal-"))
		const stoneItems = allItems.filter(item => item.item_id.startsWith("somber-") || item.item_id.startsWith("cristal-"))

		const regularPages = Math.ceil(regularItems.length / ITEMS_PER_PAGE)
		const stonePages = Math.ceil(stoneItems.length / ITEMS_PER_PAGE)
		const totalPages = regularPages + stonePages

		const generateDisplay = (page) => {
			const paddingChar = '\u2003'
			let pageItems = []
			let title = 'Cửa Hàng Cokemon'

			if (page < regularPages) {
				const startIdx = page * ITEMS_PER_PAGE
				pageItems = regularItems.slice(startIdx, startIdx + ITEMS_PER_PAGE)
			} else {
				const stonePageIdx = page - regularPages
				const startIdx = stonePageIdx * ITEMS_PER_PAGE
				pageItems = stoneItems.slice(startIdx, startIdx + ITEMS_PER_PAGE)
				title = 'Cửa Hàng Cokemon - Đá Cường Hóa'
			}

			const embed = new EmbedBuilder()
				.setColor('#0099ff')
				.setTitle(title)
				.setDescription(`Luôn có những vật phẩm hữu ích cho cuộc hành trình của bạn!\nDùng \`${config.prefix}buy <id> [số lượng]\` để mua hoặc \`${config.prefix}sell <id> [số lượng]\` để bán.`)
				.setFooter({ text: `Trang ${page + 1}/${totalPages}` })

			pageItems.forEach(item => {
				embed.addFields({
					name: `${item.emoji} ${item.name}${paddingChar}•${paddingChar}\`${item.item_id}\``,
					value: `*${item.description}*\n**Giá:** ${config.emoji.money} ${item.price}`,
					inline: false
				})
			})
			return { embeds: [embed] }
		}
		await initPage(message, generateDisplay, totalPages, `${config.prefix}shop`)
	}
}