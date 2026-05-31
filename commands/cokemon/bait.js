const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

module.exports = {
	name: 'bait',
	aliases: ['b'],
	description: 'Ném mồi dụ cokemon. Giảm tỉ lệ bỏ chạy nhưng cũng giảm tỉ lệ bắt.',
	usage: `${config.prefix}bait`,
	examples: [
		{ intent: 'Ném mồi dụ Cokemon', command: `${config.prefix}bait` }
	],
	async execute(message) {
		try {
			if (message.client.actionLocks.has(message.author.id)) {
				throw new UserFriendlyError(`${config.emoji.no} Bạn đang thực hiện một hành động khác! Vui lòng đợi một lát.`)
			}

			message.client.actionLocks.add(message.author.id)
			const spawnState = message.client.activeSpawns.get(message.channel.id)
			if (!spawnState) {
				throw new UserFriendlyError(`${config.emoji.no} Không có gì ở đây để ném mồi cả.`)
			}

			let userState = spawnState.userStates.get(message.author.id) || { catchRateModifier: 1.0, fleeRateModifier: 1.0, hasFled: false }
			if (userState.hasFled) {
				throw new UserFriendlyError(`**${spawnState.cokemon.name}** đã chạy mất khỏi bạn rồi!`)
			}

			userState.catchRateModifier *= 0.7
			userState.fleeRateModifier *= 0.5
			spawnState.userStates.set(message.author.id, userState)
			await message.reply(`🍖 Bạn ném một ít mồi cho **${spawnState.cokemon.name}**. Nó có vẻ đang đang bị phân tâm!`)

			if (Math.random() < spawnState.cokemon.flee_rate * userState.fleeRateModifier) {
				userState.hasFled = true
				spawnState.userStates.set(message.author.id, userState)
				await message.channel.send(`**${spawnState.cokemon.name}** đã ăn xong và chạy mất khỏi ${message.author.username}!`)
			}
		} finally {
			message.client.actionLocks.delete(message.author.id)
		}
	}
}