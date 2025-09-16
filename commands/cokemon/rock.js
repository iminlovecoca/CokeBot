const MULTIPLIER = 1.5

module.exports = {
	name: 'rock',
	description: 'Ném đá vào cokemon. Tăng tỉ lệ bắt nhưng cũng tăng tỉ lệ nó bỏ chạy.',
	async execute(message) {
		if (message.client.actionLocks.has(message.author.id)) {
			return await message.reply('❌ | Bạn đang thực hiện một hành động khác! Vui lòng đợi một lát.')
		}

		try {
			message.client.actionLocks.add(message.author.id)
			const spawnState = message.client.activeSpawns.get(message.channel.id)
			if (!spawnState) {
				throw new Error('Không có gì ở đây để ném đá cả.')
			}

			let userState = spawnState.userStates.get(message.author.id) || { catchRateModifier: 1.0, fleeRateModifier: 1.0, hasFled: false }
			if (userState.hasFled) {
				throw new Error(`**${spawnState.cokemon.name}** đã chạy mất khỏi bạn rồi!`)
			}

			userState.catchRateModifier *= MULTIPLIER
			userState.fleeRateModifier *= MULTIPLIER
			spawnState.userStates.set(message.author.id, userState)
			await message.reply(`Bạn ném một hòn đá vào **${spawnState.cokemon.name}**. Nó có vẻ đang tức giận!`)

			if (Math.random() < spawnState.cokemon.flee_rate * userState.fleeRateModifier) {
				userState.hasFled = true
				spawnState.userStates.set(message.author.id, userState)
				await message.channel.send(`**${spawnState.cokemon.name}** đã hoảng sợ và chạy mất khỏi ${message.author.username}!`)
			}
		} catch (error) {
			await message.reply(error.message)
		} finally {
			message.client.actionLocks.delete(message.author.id)
		}
	}
}