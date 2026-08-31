const EXPIRED_MS = 5 * 60 * 1000
const prevEmoji = '⬅️'
const nextEmoji = '➡️'

const initPage = async (message, generateDisplay, totalPages, command, currentIndex = 0, options = {}) => {
	let currentPage = currentIndex
	const replyOptions = generateDisplay(currentPage)

	let buttons = [prevEmoji, nextEmoji]
	const sentMsg = await message.reply({ ...replyOptions })
	await sentMsg.react(prevEmoji)
	await sentMsg.react(nextEmoji)
	if (options.customButtonEmoji) {
		await sentMsg.react(options.customButtonEmoji)
		buttons.push(options.customButtonEmoji)
	}

	const filter = (reaction, user) =>
		buttons.includes(reaction.emoji.name) && user.id === message.author.id
	const collector = sentMsg.createReactionCollector({ filter, time: EXPIRED_MS })

	collector.on('collect', async (react) => {
		if (react.emoji.name === prevEmoji) {
			if (currentPage >= 1) {
				currentPage--
			} else {
				currentPage = totalPages - 1
			}
		} else if (react.emoji.name === nextEmoji) {
			if (currentPage < totalPages - 1) {
				currentPage++
			} else {
				currentPage = 0
			}
		} else {
			if (options.customHandler) {
				await options.customHandler(react)
			}
		}
		await sentMsg.edit(generateDisplay(currentPage))
		await react.users.remove(message.author.id).catch(() => {})
	})

	collector.on('end', (_, reason) => {
		if (reason == 'time') {
			const { EmbedBuilder } = require('discord.js')
			const embed = new EmbedBuilder()
				.setColor('#E74C3C')
				.setDescription(`**⏱ |** Đã hết thời gian tương tác. Nhập \`${command}\` để tiếp tục!`)
			sentMsg.edit({ embeds: [embed], components: [] }).catch(() => null)
		}
	})
}

module.exports = {
	initPage
}