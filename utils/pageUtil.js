const prevEmoji = '⬅️'
const nextEmoji = '➡️'

const initPage = async (message, generateEmbed, totalPages, command) => {
	let currentPage = 0
	const embed = generateEmbed(currentPage)
	const filter = (reaction, user) =>
		[prevEmoji, nextEmoji].includes(reaction.emoji.name) && user.id === message.author.id

	const sentMsg = await message.reply({ embeds: [embed] })
	await sentMsg.react(prevEmoji)
	await sentMsg.react(nextEmoji)

	const collector = sentMsg.createReactionCollector({ filter, time: 60000 })

	collector.on('collect', async (react) => {
		if (react.emoji.name === prevEmoji) {
			if (currentPage >= 1) {
				currentPage--
				await sentMsg.edit({ embeds: [generateEmbed(currentPage)] })
			}
		} else {
			if (currentPage < totalPages - 1) {
				currentPage++
				await sentMsg.edit({ embeds: [generateEmbed(currentPage)] })
			}
		}
		await react.users.remove(message.author.id).catch(() => {})
	})

	collector.on('end', (_, reason) => {
		if (reason == 'time')
			sentMsg.edit(`**⏱ |** Đã hết thời gian tương tác. Nhập \`${command}\` để tiếp tục!`)
	})
}

module.exports = {
	initPage
}