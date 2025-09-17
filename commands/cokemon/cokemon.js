const { EmbedBuilder } = require('discord.js')
const { getAllCokemon } = require('../../utils/userUtil')
const { initPage } = require('../../utils/pageUtil')
const { calculateIVPercentage } = require('../../utils/CokemonUtil')
const config = require('../../data/config')
const MONS_PER_PAGE = 20

module.exports = {
	name: 'cokemon',
	description: 'Hiển thị danh sách cokemon bạn đã bắt.',
	async execute(message, args) {
		try {
			const sortBy = args[0]?.toLowerCase() || 'recent' // sort by most recent by default
			const validSorts = ['recent', 'iv', 'level', 'dex']

			if (!validSorts.includes(sortBy)) {
				throw new Error(`❌ | Tùy chọn sắp xếp không hợp lệ. Các kiểu hợp lệ là: \`${validSorts.join(', ')}\`.`)
			}
			const userCokemon = await getAllCokemon(message.author.id)
			if (userCokemon.length === 0) {
				throw new Error("Bạn chưa có cokemon nào cả! Dùng `!catch` để bắt một con.")
			}

			const maxId = Math.max(...userCokemon.map(c => c.uid))
			const maxIdLength = maxId.toString().length
			let sortedCokemon
			switch (sortBy) {
				case 'level':
					sortedCokemon = userCokemon.sort((a, b) => b.level - a.level)
					break
				case 'iv':
					sortedCokemon = userCokemon
						.map(c => {
							return { ...c.toObject(), iv_percent: calculateIVPercentage(c.ivs) }
						})
						.sort((a, b) => b.iv_percent - a.iv_percent)
					break
				case 'dex':
					sortedCokemon = userCokemon.sort((a, b) => a.species_id.dex_id - b.species_id.dex_id)
					break
				case 'recent':
				default:
					sortedCokemon = userCokemon.sort((a, b) => b.createdAt - a.createdAt)
					break
			}

			const totalPages = Math.ceil(sortedCokemon.length / MONS_PER_PAGE)

			const generateDisplay = (page) => {
				const startIdx = page * MONS_PER_PAGE
				const pageCokemon = sortedCokemon.slice(startIdx, startIdx + MONS_PER_PAGE)
				const paddingChar = '\u2003'

				const tableLines = pageCokemon.map(c => {
					const species = c.species_id
					const ivPercent = c.iv_percent || calculateIVPercentage(c.ivs)
					const idString = c.uid.toString().padStart(maxIdLength, ' ')
					const emoji = c.is_shiny ? (species.shiny_emoji || `${species.emoji}✨`) : species.emoji;
					const genderSymbol = c.gender === 'Male' ? config.emoji.male : c.gender === 'Female' ? config.emoji.female : config.emoji.genderless
					const nameCol = `${emoji} ${c.nickname || species.name} ${genderSymbol}`
					return `\`${idString}\`${paddingChar}${nameCol}${paddingChar}•${paddingChar}Lv. ${c.level}${paddingChar}•${paddingChar}${ivPercent}%`
				}).join('\n')

				const sortByVi = sortBy === 'recent' ? 'thời gian bắt' : sortBy === 'dex' ? 'thứ tự dex' : sortBy
				const embed = new EmbedBuilder()
					.setColor('#3498DB')
					.setTitle(`Danh sách Cokemon của ${message.author.username}`)
					.setDescription(tableLines)
					.setFooter({ text: `Trang ${page + 1}/${totalPages}${paddingChar}|${paddingChar}Sắp xếp theo: ${sortByVi}` })
				return { embeds: [embed] }
			}
			await initPage(message, generateDisplay, totalPages, '!cokemon')
		} catch (error) {
			console.log(error)
			await message.reply(error.message)
		}
	}
}