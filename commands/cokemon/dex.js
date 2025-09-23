const { EmbedBuilder } = require('discord.js')
const { getOrCreateUser } = require('../../utils/userUtil')
const { initPage } = require('../../utils/pageUtil')
const config = require('../../data/config')
const MONS_PER_PAGE = 21

module.exports = {
	name: 'dex',
	aliases: ['d'],
	description: 'Hiển thị Cokedex của bạn.',
	usage: '`!dex [cokemon]`',
	examples: '`!dex`\n`!dex bulbasaur`',
	async execute(message, args) {
		try {
			const allSpecies = message.client.allSpecies
			if (!allSpecies || allSpecies.length === 0) {
				throw new Error("Dữ liệu Cokedex chưa được tải, vui lòng thử lại sau.")
			}
			const user = await getOrCreateUser(message.author.id)

			if (args.length > 0) {
				const speciesName = args.join(' ')
				let currentIndex = allSpecies.findIndex(s => s.name.toLowerCase() === speciesName.toLowerCase())
				if (currentIndex === -1) {
					throw new Error(`Không tìm thấy loài nào có tên '${speciesName}'.`)
				}
				let isShinyView = false

				const generateDisplay = (index) => {
					const species = allSpecies[index]
					const shinySymbol = isShinyView ? '✨' : ''
					const imageFile = isShinyView ? species.shiny_image_file : species.image_file
					const imagePath = `./assets/images/${imageFile}`
					const dexEntry = user?.cokedex?.get(species._id.toString())
					const footerText = dexEntry ? `Bạn đã bắt được ${dexEntry.caught} cokemon thuộc loài này!` : `Bạn chưa bắt được cokemon này!`

					const embed = new EmbedBuilder()
						.setColor(config.type_colors[species.type[0]] || '#FFFFFF')
						.setTitle(`#${species.dex_id.toString()} - ${species.name}${shinySymbol}`)
						.setDescription(species.description)
						.addFields({ name: '\u200B', value: '\u200B' })
						.setImage(`attachment://${imageFile}`)
						.setFooter({ text: footerText })

					// Evolution line
					let baseForm = species
					while (baseForm.preevolution_species_id) {
						baseForm = allSpecies.find(s => s._id.equals(baseForm.preevolution_species_id))
					}

					const getEvoMethod = nextEvoData => {
						let evoMethod = ''
						if (nextEvoData.method === 'level') {
							evoMethod = `cấp ${nextEvoData.level}`
						} else if (nextEvoData.method === 'item') {
							evoMethod = `dùng ${nextEvoData.item_id.toLowerCase().split('-').map(
								w => w.charAt(0).toUpperCase() + w.slice(1)
							).join(' ')}`
						} else if (nextEvoData.method === 'trade') {
							evoMethod = 'trao đổi'
						} else {
							evoMethod = 'tình bạn'
						}
						return evoMethod
					}

					const getEvoLineParts = (currentEvo, currentEvoText) => {
						return currentEvo.evolution.map(evo => {
							const evoSpecies = allSpecies.find(s => s._id.equals(evo.species_id))
							const evoMethod = getEvoMethod(evo)
							const evoDisplayName = evoSpecies.name === species.name ? `*${evoSpecies.name}*` : `**${evoSpecies.name}**`
							return { evoForm: evoSpecies, evoLinePartText: `${currentEvoText} (${evoMethod}) → ${evoDisplayName}` }
						})
					}

					const baseDisplayName = baseForm.name === species.name ? `*${baseForm.name}*` : `**${baseForm.name}**`
					const evoLineParts = []
					const evolutions = [baseForm]
					const evoTexts = [baseDisplayName]

					while (evolutions.length > 0) {
						currentEvo = evolutions.pop()
						currentEvoText = evoTexts.pop()

						if (currentEvo.evolution.length === 0 && currentEvo.name !== baseForm.name) {
							evoLineParts.push(currentEvoText)
							continue
						} else {
							getEvoLineParts(currentEvo, currentEvoText).forEach(e => {
								evolutions.push(e.evoForm)
								evoTexts.push(e.evoLinePartText)
							})
						}
					}

					if (evoLineParts.length > 0) {
						embed.addFields({ name: 'Chuỗi Tiến Hóa', value: evoLineParts.join('\n') })
					}

					// Other info
					const types = species.type.map(t => `${config.type_emojis[t]} ${t}`)
					const genderMap = { 'Male': 'Đực', 'Female': 'Cái', 'Genderless': 'Vô giới' }
					const genders = species.available_genders.map(g => genderMap[g])
					const isCatchable = species.tier !== 'Mythical' ? 'Có' : 'Không'
					const stats = [
						`**HP:** ${species.base_stats.hp}`,
						`**Tấn công:** ${species.base_stats.atk}`,
						`**Phòng thủ:** ${species.base_stats.def}`,
						`**Tốc độ:** ${species.base_stats.spd}`,
					]

					embed.addFields(
						{ name: 'Hệ', value: types.join('\n'), inline: true },
						{ name: 'Bậc', value: species.tier, inline: true },
						{ name: 'Có thể bắt', value: isCatchable, inline: true },
						{ name: 'Chỉ số cơ bản', value: stats.join('\n'), inline: true },
						{ name: 'Đặc điểm', value: `**Cao:** ${species.appearance.height} m\n**Nặng:** ${species.appearance.weight} kg`, inline: true},
						{ name: 'Giới tính', value: genders.join(', '), inline: true },
					)
					return { embeds: [embed], files: [imagePath] }
				}

				const shinyButtonEmoji = '✨'
				const customHandler = (react) => {
					if (react.emoji.name === shinyButtonEmoji) {
						isShinyView = !isShinyView
					}
				}
				await initPage(message, generateDisplay, allSpecies.length, '!dex <tên cokemon>', currentIndex, {
					customButtonEmoji: shinyButtonEmoji,
					customHandler: customHandler
				})
			} else {
				const userDex = user?.cokedex || new Map()
				const checklistData = allSpecies.map(species => {
					const entry = userDex.get(species._id.toString())

					if (entry && entry.caught > 0) {
						// user has caught this species
						return {
							isCaught: true,
							dex_id: species.dex_id,
							emoji: entry.has_shiny ? (species.shiny_emoji || `${species.emoji}✨`) : species.emoji,
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

				const generateDisplay = (page) => {
					const startIdx = page * MONS_PER_PAGE
					const pageDex = checklistData.slice(startIdx, startIdx + MONS_PER_PAGE)

					const embed = new EmbedBuilder()
						.setColor('#E74C3C')
						.setTitle(`Cokedex của ${message.author.username}`)
						.setDescription(`Bạn đã bắt được ${userDex.size} trong tổng số ${allSpecies.length} cokemon!`)
						.addFields({ name: '\u200B', value: '\u200B' })
						.setFooter({ text: `Trang ${page + 1}/${totalPages}` })

					pageDex.forEach(entry => {
						const isCaught = entry.isCaught ? config.emoji.yes : config.emoji.no
						const caughtText = entry.count > 0 ? `${entry.count} đã bắt!` : 'Chưa bắt được!'
						embed.addFields({ name: `${entry.emoji} ${entry.name} #${entry.dex_id}`, value: `${isCaught} ${caughtText}`, inline: true })
					})
					embed.addFields({ name: '\u200B', value: '\u200B', inline: true })
					return { embeds: [embed] }
				}
				await initPage(message, generateDisplay, totalPages, '!dex')
			}
		} catch (error) {
			await message.reply(error.message)
		}
	}
}