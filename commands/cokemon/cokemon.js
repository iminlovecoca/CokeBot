const { EmbedBuilder } = require('discord.js')
const { getFilteredCokemon } = require('../../utils/userUtil')
const { initPage } = require('../../utils/pageUtil')
const { validateFilterArgs, buildCokemonQuery } = require('../../utils/queryUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')
const MONS_PER_PAGE = 20

module.exports = {
	name: 'cokemon',
	description: 'Hiển thị danh sách những cokemon bạn đã bắt.',
	usage: `${config.prefix}cokemon [--type <types>] [--tier <tiers>] [--lvl<op> <val>] [--iv<op> <val>] [--shiny] [--fav] [--sort <recent|iv|level|dex>]`,
	examples: [
		{ intent: 'Sắp xếp danh sách (recent, iv, level, dex)', command: `${config.prefix}cokemon --sort iv` },
		{ intent: 'Lọc theo đặc điểm (type, tier, name, nickname, nature, ability, gender)', command: `${config.prefix}cokemon --type fire,flying --tier legendary --gender female` },
		{ intent: 'Lọc theo chỉ số game (lvl, iv)', command: `${config.prefix}cokemon --lvl+ 50 --iv- 40` },
		{ intent: 'Lọc theo chỉ số IV cụ thể (hpiv, atkiv, defiv, spatkiv, spdefiv, spdiv)', command: `${config.prefix}cokemon --atkiv= 31 --spdiv+ 20` },
		{ intent: 'Lọc theo chỉ số cơ bản - Base Stats (hp, atk, def, spatk, spdef, spd)', command: `${config.prefix}cokemon --hp+ 100 --spd- 50` },
		{ intent: 'Lọc theo trạng thái đặc biệt (shiny, noshiny, fav, nofav)', command: `${config.prefix}cokemon --shiny --nofav` }
	],
	async execute(message, args) {
		const validSorts = ['recent', 'iv', 'level', 'dex']
		let sortBy = validSorts[0] // sort by most recent by default

		const orderIndex = args.findIndex(arg => arg.toLowerCase() === '--sort')
		if (orderIndex !== -1 && args[orderIndex + 1]) {
			sortBy = args[orderIndex + 1].toLowerCase()
			// Remove --sort and its value from the arguments array
			args.splice(orderIndex, 2)
		}

		const filterArgs = args
		if (!validSorts.includes(sortBy)) {
			throw new UserFriendlyError(`${config.emoji.no} Tùy chọn sắp xếp không hợp lệ. Các kiểu hợp lệ là: \`${validSorts.join(', ')}\`.`)
		}

		if (filterArgs.length > 0 && filterArgs[0].startsWith('--')) {
			validateFilterArgs(args)
		}
		const { cokemonQuery, speciesQuery } = await buildCokemonQuery(filterArgs)
		const userCokemon = await getFilteredCokemon(message.author.id, cokemonQuery, speciesQuery)

		if (userCokemon.length === 0) {
			if (filterArgs.length === 0) {
				throw new UserFriendlyError(`${config.emoji.no} Bạn chưa có cokemon nào cả! Dùng \`!catch\` để bắt một con.`)
			}
			throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy cokemon nào khớp với bộ lọc của bạn.`)
		}

		let sortedCokemon
		switch (sortBy) {
			case 'level':
				sortedCokemon = userCokemon.sort((a, b) => b.level - a.level)
				break
			case 'iv':
				sortedCokemon = userCokemon.sort((a, b) => b.iv_percent - a.iv_percent)
				break
			case 'dex':
				sortedCokemon = userCokemon.sort((a, b) => a.species_id.dex_id - b.species_id.dex_id)
				break
			case 'recent':
			default:
				sortedCokemon = userCokemon.sort((a, b) => b.acquiredAt - a.acquiredAt)
				break
		}

		const totalPages = Math.ceil(sortedCokemon.length / MONS_PER_PAGE)

		const generateDisplay = (page) => {
			const startIdx = page * MONS_PER_PAGE
			const pageCokemon = sortedCokemon.slice(startIdx, startIdx + MONS_PER_PAGE)
			const maxId = Math.max(...pageCokemon.map(c => c.uid))
			const maxIdLength = maxId.toString().length
			const paddingChar = '\u2003'

			const tableLines = pageCokemon.map(c => {
				const species = c.species_id
				const ivPercent = c.iv_percent
				const idString = c.uid.toString().padStart(maxIdLength, ' ')
				const emoji = c.is_shiny ? (species.shiny_emoji || `${species.emoji}✨`) : species.emoji
				const genderSymbol = c.gender === 'Male' ? config.emoji.male : c.gender === 'Female' ? config.emoji.female : config.emoji.genderless
				const favSymbol = c.is_favorite ? '❤️' : ''
				const nameCol = `${emoji} ${c.nickname || species.name} ${genderSymbol}${favSymbol}`
				return `\`${idString}\`${paddingChar}${nameCol}${paddingChar}•${paddingChar}Lv. ${c.level}${paddingChar}•${paddingChar}${ivPercent}%`
			}).join('\n')

			const sortByVi = sortBy === 'recent' ? 'thời gian nhận' : sortBy === 'dex' ? 'thứ tự dex' : sortBy
			const embed = new EmbedBuilder()
				.setColor('#3498DB')
				.setTitle(`Danh sách Cokemon của ${message.author.username}`)
				.setDescription(tableLines)
				.setFooter({ text: `Trang ${page + 1}/${totalPages}${paddingChar}|${paddingChar}Sắp xếp theo: ${sortByVi}` })
			return { embeds: [embed] }
		}
		await initPage(message, generateDisplay, totalPages, `${config.prefix}cokemon`)
	}
}