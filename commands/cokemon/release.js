const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { getAllCokemonWithUids, removeCokemon, getUserCokemon } = require('../../utils/userUtil')
const { calculateIVPercentage } = require('../../utils/CokemonUtil')
const config = require('../../data/config')

const cokemonInfo = cokemon => {
	const displayName = cokemon.nickname || cokemon.species_id.name
	const genderSymbol = cokemon.gender === 'Male' ? config.emoji.male : cokemon.gender === 'Female' ? config.emoji.female : config.emoji.genderless
	const shinySymbol = cokemon.is_shiny ? '✨' : ''
	const ivPercent = calculateIVPercentage(cokemon.ivs)
	return `${displayName}${shinySymbol}${genderSymbol} (No.${cokemon.uid} • Lv.${cokemon.level} • ${ivPercent}%)`
}

module.exports = {
	name: 'release',
	description: 'Thả một hoặc nhiều Cokemon về với tự nhiên.',
	aliases: ['rl', 'r'],
	async execute(message, args) {
		try {
			if (args.length === 0) {
				throw new Error("Bạn cần cung cấp ID của (các) cokemon muốn thả. Ví dụ: `!release 3 13 27` hoặc `!release all`")
			}

			let cokemonToRelease = []
			let isReleaseAll = false

			if (args[0].toLowerCase() === 'all') {
				isReleaseAll = true
				cokemonToRelease = await getUserCokemon(message.author.id)
				if (cokemonToRelease.length === 0) {
					throw new Error("Bạn không có Cokemon nào để thả.")
				}
			} else {
				const uidsToRelease = [...new Set(args.map(id => parseInt(id)).filter(id => !isNaN(id)))]
				if (uidsToRelease.length === 0) {
					throw new Error("ID cung cấp không hợp lệ.")
				}
				cokemonToRelease = await getAllCokemonWithUids(message.author.id, uidsToRelease)
				if (cokemonToRelease.length === 0) {
					throw new Error("Không có ID hợp lệ nào được tìm thấy trong bộ sưu tập của bạn.")
				}
			}

			const totalReward = cokemonToRelease.length * config.cokemon_settings.release_reward
			let msgContent = ''
			if (isReleaseAll) {
				msgContent = `⚠️ Bạn có chắc muốn **THẢ TOÀN BỘ** (${cokemonToRelease.length}) Cokemon của bạn với giá ${totalReward} ${config.emoji.money}?`
			} else if (cokemonToRelease.length === 1) {
				msgContent = `Bạn có chắc muốn thả ${cokemonInfo(cokemonToRelease[0])} với giá ${totalReward} ${config.emoji.money}?`
			} else {
				msgContent = `Bạn có chắc muốn thả ${cokemonToRelease.length} cokemon sau với giá ${totalReward} ${config.emoji.money}?`
				cokemonToRelease.forEach(c => {
					msgContent += `\n- ${cokemonInfo(c)}`
				})
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
						const cokemonStr = result.releasedCount === 1 
							? `${cokemonInfo(cokemonToRelease[0])}` 
							: `${result.releasedCount} cokemon`
						await i.editReply({
							content: `Bạn đã thả ${cokemonStr} về với tự nhiên và nhận được **${result.reward}** ${config.emoji.money}!`,
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
