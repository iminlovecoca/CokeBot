module.exports = {
	name: 'bait',
	description: 'Ném mồi dụ cokemon. Giảm tỉ lệ nó bỏ chạy nhưng cũng giảm tỉ lệ bắt.',
	async execute(message) {
		if (message.client.actionLocks.has(message.author.id)) {
			return await message.reply('❌ | Bạn đang thực hiện một hành động khác! Vui lòng đợi một lát.')
		}

		try {
			message.client.actionLocks.add(message.author.id)
			const spawnState = message.client.activeSpawns.get(message.channel.id)
			if (!spawnState) {
				throw new Error('Không có gì ở đây để ném mồi cả.')
			}

			let userState = spawnState.userStates.get(message.author.id) || { catchRateModifier: 1.0, fleeRateModifier: 1.0, hasFled: false }
			if (userState.hasFled) {
				throw new Error(`**${spawnState.cokemon.name}** đã chạy mất khỏi bạn rồi!`)
			}

			userState.catchRateModifier *= 0.7
			userState.fleeRateModifier *= 0.5
			spawnState.userStates.set(message.author.id, userState)
			await message.reply(`Bạn ném một ít mồi cho **${spawnState.cokemon.name}**. Nó có vẻ đang đang bị phân tâm!`)

			if (Math.random() < spawnState.cokemon.flee_rate * userState.fleeRateModifier) {
				userState.hasFled = true
				spawnState.userStates.set(message.author.id, userState)
				await message.channel.send(`**${spawnState.cokemon.name}** đã ăn xong và chạy mất khỏi ${message.author.username}!`)
			}
		} catch (error) {
			await message.reply(error.message)
		} finally {
			message.client.actionLocks.delete(message.author.id)
		}
	}
}