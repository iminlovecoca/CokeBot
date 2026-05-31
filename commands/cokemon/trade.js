const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const {
	getCokemonEmoji,
	getGenderEmoji,
	getCokemonName,
	giftCokemon,
	swapCokemonOwnership
} = require('../../utils/cokemonUtil')
const { registerDexEntry, getCokemon } = require('../../utils/userUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

const formatCokemonInfo = cokemon => {
	const name = getCokemonName(cokemon)
	const species = cokemon.species_id
	const emoji = getCokemonEmoji(cokemon, species)
	const genderEmoji = getGenderEmoji(cokemon)
	return `**${name}** ${emoji}\n${genderEmoji} | Cấp ${cokemon.level} | ${cokemon.iv_percent}%`
}

const startTradeInteraction = async (message, mode, p1, p2, p1Cokemon, p2Cokemon = null) => {
	const p1Id = p1.id
	const p2Id = p2.id
	let p1Confirmed = false
	let p2Confirmed = false
	const isGift = mode === 'gift'

	const getEmbed = () => {
		let title
		let p2CokemonText
		if (isGift) {
			title = '🎁 Yêu Cầu Tặng Cokemon'
			color = '#3498db'
			p2CokemonText = ''
		} else {
			title = '🔄 Yêu Cầu Trao Đổi Cokemon'
			color = '#f1c40f'
			p2CokemonText = formatCokemonInfo(p2Cokemon)
		}

		return new EmbedBuilder()
			.setColor(color)
			.setTitle(title)
			.addFields(
				{ name: `${p1.username} ${p1Confirmed ? config.emoji.yes : config.emoji.no}`, value: formatCokemonInfo(p1Cokemon), inline: true },
				{ name: `${p2.username} ${p2Confirmed ? config.emoji.yes : config.emoji.no}`, value: p2CokemonText, inline: true }
			)
			.setFooter({ text: 'Cả hai người chơi phải bấm "Chấp Nhận" để khóa giao dịch.' })
	}

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId('trade_confirm').setLabel('Chấp Nhận').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId('trade_cancel').setLabel('Từ Chối').setStyle(ButtonStyle.Danger)
	)
	const interactionMsg = await message.channel.send({ embeds: [getEmbed()], components: [row] })
	const collector = interactionMsg.createMessageComponentCollector({ filter: i => [p1Id, p2Id].includes(i.user.id), time: 120000 })

	collector.on('collect', async i => {
		if (collector.ended) return
		if (i.customId === 'trade_confirm') {
			if (i.user.id === p1Id) {
				p1Confirmed = true
			} else {
				p2Confirmed = true
			}
		} else {
			if (i.user.id === p1Id) {
				p1Confirmed = false
			} else {
				p2Confirmed = false
			}
		}
		await i.update({ embeds: [getEmbed()] })

		if (i.customId === 'trade_cancel') {
			return collector.stop('cancel')
		}
		if (p1Confirmed && p2Confirmed) {
			collector.stop('confirm')
		}
	})

	collector.on('end', async (collected, reason) => {
		if (reason === 'confirm') {
			const finalEmbed = getEmbed().setFooter({ text: isGift ? '🐶 Cokemon đang được gửi đi...' : '🔒 Giao dịch bị khóa! Đang thực hiện trong 5 giây...' })
			await interactionMsg.edit({ embeds: [finalEmbed], components: [] })
			const execute = async () => {
				if (isGift) {
					const msg = await giftCokemon(p1Cokemon, p1Id, p2Id)
					await registerDexEntry(p2Id, p1Cokemon.species_id._id, p1Cokemon.is_shiny)
					const successEmbed = getEmbed().setColor('#2ecc71').setFooter({ text: msg })
					await interactionMsg.edit({ embeds: [successEmbed] })
				} else {
					const { p1CokemonEvolvedTo, p2CokemonEvolvedTo } = await swapCokemonOwnership(p1Cokemon, p2Cokemon)
					let resultMessage = `${config.emoji.yes} Trao đổi giữa **${message.author.username}** và **${p2.username}** đã thành công!`
					if (p1CokemonEvolvedTo) {
						// Belongs to P1
						const oldEmoji = getCokemonEmoji(p2Cokemon)
						const newEmoji = p1CokemonEvolvedTo.emoji
						resultMessage += `\n🎉 **${getCokemonName(p2Cokemon)}** ${oldEmoji} của **${message.author.username}** đã tiến hóa thành **${p1CokemonEvolvedTo.name}** ${newEmoji}!`
						await registerDexEntry(p1Id, p1CokemonEvolvedTo._id, p2Cokemon.is_shiny)
					} else {
						await registerDexEntry(p1Id, p2Cokemon.species_id._id, p2Cokemon.is_shiny)
					}
					if (p2CokemonEvolvedTo) {
						const oldEmoji = getCokemonEmoji(p1Cokemon)
						const newEmoji = p2CokemonEvolvedTo.emoji
						resultMessage += `\n🎉 **${getCokemonName(p1Cokemon)}** ${oldEmoji} của **${p2.username}** đã tiến hóa thành **${p2CokemonEvolvedTo.name}** ${newEmoji}!`
						await registerDexEntry(p2Id, p2CokemonEvolvedTo._id, p1Cokemon.is_shiny)
					} else {
						await registerDexEntry(p2Id, p1Cokemon.species_id._id, p1Cokemon.is_shiny)
					}

					const successEmbed = getEmbed().setColor('#2ecc71').setFooter({ text: '🐶 Trao đổi hoàn tất!' })
					await interactionMsg.edit({ embeds: [successEmbed] })
					if (p1CokemonEvolvedTo || p2CokemonEvolvedTo) {
						await message.channel.send(resultMessage)
					}
				}
			}

			if (isGift) {
				await execute()
			} else {
				setTimeout(execute, 5000)
			}
		} else {
			const reasonText = reason === 'cancel' ? 'Yêu cầu đã bị hủy.' : '⌛️ Hết thời gian, yêu cầu đã bị hủy.'
			const finalEmbed = getEmbed().setColor('#95a5a6').setFooter({ text: reasonText })
			await interactionMsg.edit({ embeds: [finalEmbed], components: [] })
		}
	})
}

module.exports = {
	name: 'trade',
	description: 'Trao đổi hoặc tặng Cokemon cho người chơi khác.',
	usage: `${config.prefix}trade <@user> <your_cokemon_id> [their_cokemon_id]`,
	examples: [
		{ intent: 'Trao đổi Cokemon lấy Cokemon của người khác', command: `${config.prefix}trade @PlayerName 123 456` },
		{ intent: 'Tặng Cokemon cho người khác (không lấy lại)', command: `${config.prefix}trade @PlayerName 123` }
	],
	async execute(message, args) {
		const p2 = message.mentions.users.first()
		const p1CokemonId = parseInt(args[1])
		const p2CokemonId = args[2] ? parseInt(args[2]) : null

		if (!p2 || p2.bot || p2.id === message.author.id) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn phải tag một người chơi khác để trao đổi.`)
		}
		if (isNaN(p1CokemonId)) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn phải cung cấp ID Cokemon của mình.`)
		}

		const p1Id = message.author.id
		const p2Id = p2.id
		const p1Cokemon = await getCokemon(p1Id, p1CokemonId)
		if (p1Cokemon.is_favorite) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn không thể trao đổi Cokemon yêu thích.`)
		}

		if (p2CokemonId === null) {
			// Gifting
			await startTradeInteraction(message, 'gift', message.author, p2, p1Cokemon)
		} else {
			// Trading
			const p2Cokemon = await getCokemon(p2Id, p2CokemonId)
			if (p2Cokemon.is_favorite) {
				throw new UserFriendlyError(`${config.emoji.no} Bạn không thể yêu cầu trao đổi Cokemon yêu thích của người khác.`)
			}
			await startTradeInteraction(message, 'trade', message.author, p2, p1Cokemon, p2Cokemon)
		}
	}
}
