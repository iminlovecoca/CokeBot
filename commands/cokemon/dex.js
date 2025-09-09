const { EmbedBuilder } = require('discord.js')
const { getOrCreateUser } = require('../../utils/userUtil')
const { initPage } = require('../../utils/pageUtil')
const Species = require('../../models/cokemon/Species')
const MONS_PER_PAGE = 6

module.exports = {
	name: 'dex',
	description: 'Hiển thị Cokedex của bạn.',
	async execute(message, args) {
		try {
			const allSpecies = await Species.find({}).sort({ dex_id: 'asc' })
			const user = await getOrCreateUser(message.author.id)
			const userDex = user?.cokedex || new Map()

			const checklistData = allSpecies.map(species => {
				const entry = userDex.get(species._id.toString())

				if (entry && entry.caught > 0) {
					// user has caught this species
					return {
						isCaught: true,
						dex_id: species.dex_id,
						emoji: entry.has_shiny ? species.shiny_emoji : species.emoji,
						name: species.name,
						count: entry.caught
					}
				} else {
					// user hasn't caught this species
					return {
						isCaught: false,
						dex_id: species.dex_id,
						// emoji: '❓',
						// name: '?????',
						emoji: species.emoji,
						name: species.name,
						count: 0
					}
				}
			})
			const totalPages = Math.ceil(checklistData.length / MONS_PER_PAGE)

			const generateEmbed = (page) => {
				const startIdx = page * MONS_PER_PAGE
				const pageDex = checklistData.slice(startIdx, startIdx + MONS_PER_PAGE)

				const embed = new EmbedBuilder()
					.setColor('#E74C3C')
					.setTitle(`Cokedex của ${message.author.username}`)
					.setDescription(`Bạn đã bắt được ${userDex.size} trong tổng số ${allSpecies.length}!`)
					.setFooter({ text: `Trang ${page + 1}/${totalPages}` })

				pageDex.forEach(entry => {
					const isCaught = entry.isCaught ? '✅' : '❎'
					const caughtText = entry.count > 0 ? `${entry.count} đã bắt!` : 'Chưa bắt được!'
					embed.addFields({ name: `${entry.emoji} ${entry.name} #${entry.dex_id}`, value: `${isCaught} ${caughtText}`, inline: true })
				})
				return embed
			}
			await initPage(message, generateEmbed, totalPages, '!dex')
		} catch (error) {
			await message.reply(error.message)
		}
	}
}