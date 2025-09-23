const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { getAllCokemonWithUids, removeCokemon } = require('../../utils/userUtil')
const { buildCokemonQuery } = require('../../utils/queryUtil')
const { getFilteredCokemon } = require('../../utils/userUtil')
const config = require('../../data/config')
const MAX_DETAILED_RELEASE = 20

const cokemonInfo = cokemon => {
	const displayName = cokemon.nickname || cokemon.species_id.name
	const genderSymbol = cokemon.gender === 'Male' ? config.emoji.male : cokemon.gender === 'Female' ? config.emoji.female : config.emoji.genderless
	const shinySymbol = cokemon.is_shiny ? '✨' : ''
	return `${displayName}${shinySymbol}${genderSymbol} (No. ${cokemon.uid} • Lv.${cokemon.level} • ${cokemon.iv_percent}%)`
}

module.exports = {
	name: 'release',
	description: 'Thả một hoặc nhiều cokemon về với tự nhiên.',
	aliases: ['rl'],
	usage: '`!release <ID1> [ID2]...`\n`!release <tag> [tag-value]`',
	examples: '`!release 3 13 27`\n`!release --iv- 50 --shiny`',
	async execute(message, args) {
		try {
			if (args.length === 0) {
				throw new Error(`${config.emoji.no} Bạn cần cung cấp ID hoặc bộ lọc. Ví dụ: \`!release 3 12\` hoặc \`!release --tier common\``)
			}

			let cokemonToRelease = []
			let msgContent = ''
			if (!isNaN(parseInt(args[0]))) {
				// Releasing by IDs
 				const uidsToRelease = [...new Set(args.map(id => parseInt(id)).filter(id => !isNaN(id)))]
				if (uidsToRelease.length === 0) {
					throw new Error(`${config.emoji.no} ID cung cấp không hợp lệ.`)
				}

				cokemonToRelease = await getAllCokemonWithUids(message.author.id, uidsToRelease)
				if (cokemonToRelease.length !== uidsToRelease.length) {
					// Warns if some IDs were invalid
					msgContent = `${config.emoji.warning} Một hoặc nhiều ID không hợp lệ đã được bỏ qua.\n`
				}
			} else {
				// Releasing by filter
				const { cokemonQuery, speciesQuery } = buildCokemonQuery(args)
				cokemonToRelease = await getFilteredCokemon(message.author.id, cokemonQuery, speciesQuery)
			}

			if (cokemonToRelease.length === 0) {
				throw new Error(`${config.emoji.no} Không có ID hợp lệ nào được tìm thấy trong bộ sưu tập của bạn.`)
			}

			// Check if the list contains favorited cokemon
			const favCokemon = cokemonToRelease.filter(c => c.is_favorite)
			if (favCokemon.length > 0) {
				const favIds = favCokemon.map(c => `${c.uid}`).join(', ')
				throw new Error(`${config.emoji.no} Bạn không thể thả cokemon yêu thích! Hãy bỏ yêu thích cho các cokemon có ID: ${favIds} trước, hoặc sử dụng tag \`--nofav\``)
			}

			const totalReward = cokemonToRelease.length * config.cokemon_settings.release_reward
			if (cokemonToRelease.length === 1) {
				msgContent += `Bạn có chắc muốn thả ${cokemonInfo(cokemonToRelease[0])} để nhận ${config.emoji.money} ${totalReward}?`
			} else if (cokemonToRelease.length <= MAX_DETAILED_RELEASE) {
				msgContent += `Bạn có chắc muốn thả ${cokemonToRelease.length} cokemon sau để nhận ${config.emoji.money} ${totalReward}?`
				cokemonToRelease.forEach(c => {
					msgContent += `\n- ${cokemonInfo(c)}`
				})
			} else {
				let tierCounts = {}
				let shinyCount = 0
				let highIvCount = 0
				const HIGH_IV_THRESHOLD = 80

				for (const c of cokemonToRelease) {
					const tier = c.species_id.tier
					tierCounts[tier] = (tierCounts[tier] || 0) + 1

					if (c.is_shiny) shinyCount++
					if (c.iv_percent >= HIGH_IV_THRESHOLD) highIvCount++
				}
				let summaryLines = [`Bạn có chắc muốn thả ${cokemonToRelease.length} cokemon sau để nhận ${config.emoji.money} ${totalReward}? Trong đó bao gồm:`]
				for (const [tier, count] of Object.entries(tierCounts)) {
					summaryLines.push(`- **${count}** x ${tier}`)
				}
				if (shinyCount > 0) {
					summaryLines.push(`- ${config.emoji.warning} **${shinyCount}** trong số đó là SHINY!`)
				}
				if (highIvCount > 0) {
					summaryLines.push(`- ${config.emoji.warning} **${highIvCount}** trong số đó có IV cao (>= ${HIGH_IV_THRESHOLD}%)!`)
				}
				msgContent += summaryLines.join('\n')
			}

			const confirm = new ButtonBuilder()
				.setCustomId('confirm')
				.setLabel('Đồng ý')
				.setStyle(ButtonStyle.Danger)
			const cancel = new ButtonBuilder()
				.setCustomId('cancel')
				.setLabel('Hủy')
				.setStyle(ButtonStyle.Secondary)
			const row = new ActionRowBuilder().addComponents(confirm, cancel)
			const sentMsg = await message.reply({ content: msgContent, components: [row], fetchReply: true })

			const collector = sentMsg.createMessageComponentCollector({
				filter: (i) => i.user.id === message.author.id, time: 60000
			})

			collector.on('collect', async (i) => {
				await i.deferUpdate();
				if (i.customId === 'confirm') {
					const validUidsToRelease = cokemonToRelease.map(c => c.uid)
					const result = await removeCokemon(message.author.id, validUidsToRelease)
					if (result.success) {
						const cokemonStr = result.releasedCount === 1 ? `${cokemonInfo(cokemonToRelease[0])}` : `${result.releasedCount} cokemon`
						await i.editReply({
							content: `Bạn đã thả ${cokemonStr} về với tự nhiên và nhận được ${config.emoji.money} **${result.reward}**!`,
							embeds: [],
							components: []
						})
					} else {
						throw new Error(result.message)
					}
				} else {
					await i.editReply({ content: 'Đã hủy hành động thả.', embeds: [], components: [] })
				}
				collector.stop()
			})

			collector.on('end', (_, reason) => {
				if (reason === 'time') {
					sentMsg.edit('Hết thời gian xác nhận, hành động đã được hủy.')
				}
			})
		} catch (error) {
			await message.reply(error.message)
		}
	}
}