const { addCokemon } = require('../../utils/userUtil')
const { getGenderEmoji } = require('../../utils/cokemonUtil')
const config = require('../../data/config')
const { UserFriendlyError } = require('../../utils/errors')

module.exports = {
	name: 'catch',
	aliases: ['c'],
	description: 'Thử bắt cokemon.',
	usage: `${config.prefix}catch`,
	examples: [
		{ intent: 'Bắt Cokemon đang xuất hiện', command: `${config.prefix}catch` }
	],
	async execute(message) {
		try {
			if (message.client.actionLocks.has(message.author.id)) {
				throw new UserFriendlyError(`${config.emoji.no} Bạn đang thực hiện một hành động khác! Vui lòng đợi một lát.`)
			}

			message.client.actionLocks.add(message.author.id)
			const spawnState = message.client.activeSpawns.get(message.channel.id)
			if (!spawnState) {
				throw new UserFriendlyError(`${config.emoji.no} Không có gì ở đây để ném cả.`)
			}

			let userState = spawnState.userStates.get(
				message.author.id) || { catchRateModifier: 1.0, fleeRateModifier: 1.0, hasFled: false, hasCaught: false }
			if (userState.hasCaught) {
				throw new UserFriendlyError(`${config.emoji.no} Bạn đã bắt được **${spawnState.cokemon.name}** rồi!`)
			}
			if (userState.hasFled) {
				throw new UserFriendlyError(`**${spawnState.cokemon.name}** đã chạy mất khỏi bạn rồi!`)
			}

			const finalCatchChance = spawnState.cokemon.catch_rate * userState.catchRateModifier
			if (Math.random() <= finalCatchChance) {
				let successfullyClaimed = false
				if (spawnState.cokemon.speciesData.tier === 'Legendary') {
					successfullyClaimed = message.client.activeSpawns.delete(message.channel.id)
				} else {
					successfullyClaimed = true
				}

				if (successfullyClaimed) {
					const isShiny = (Math.random() < (1 / config.cokemon_settings.shiny_rate))
					const cokemonData = {
						owner_id: message.author.id,
						original_owner_id: message.author.id,
						species_id: spawnState.cokemon.species_id,
						gender: spawnState.cokemon.gender,
						ivs: spawnState.cokemon.ivs,
						iv_percent: spawnState.cokemon.iv_percent,
						ability: spawnState.cokemon.ability,
						level: spawnState.cokemon.level,
						nature: spawnState.cokemon.nature,
						is_shiny: isShiny,
						catch_method: 'manual'
					}

					const { cokemon, bonusReward } = await addCokemon(cokemonData)
					userState.hasCaught = true
					spawnState.userStates.set(message.author.id, userState)
					const speciesData = spawnState.cokemon.speciesData
					const genderSymbol = getGenderEmoji(spawnState.cokemon)
					const iv_percent = spawnState.cokemon.iv_percent
					const displayEmoji = isShiny ? (speciesData.shiny_emoji || `${speciesData.emoji}✨`) : speciesData.emoji
					const displayInfo = `${displayEmoji} **${speciesData.name}**${genderSymbol}(${iv_percent}%)`
					let msg = isShiny ? `✨ UNBELIEVABLE! ✨ **${message.author.username}** đã bắt được một **SHINY** ${displayInfo}!`
						: `Chúc mừng! **${message.author.username}** đã bắt được ${displayInfo}!`
					if (bonusReward > 0) {
						msg += `\n**Thưởng lần bắt đầu tiên:** Bạn nhận được **${bonusReward.toLocaleString()} coke** vì đã đăng ký loài này vào Cokedex!`
					}
					await message.reply(msg)
				} else {
					throw new UserFriendlyError(`${config.emoji.no} Trâu chậm thì uống nước đục, có ai đó đã bắt được **${spawnState.cokemon.name}** rồi!`)
				}
			} else {
				await message.reply(`Oh no! **${spawnState.cokemon.name}** đã thoát ra!`)
				if (Math.random() < (spawnState.cokemon.flee_rate * userState.fleeRateModifier)) {
					userState.hasFled = true
					spawnState.userStates.set(message.author.id, userState)
					await message.channel.send(`**${spawnState.cokemon.name}** đã chạy mất khỏi ${message.author.username}!`)
				}
			}
		} finally {
			message.client.actionLocks.delete(message.author.id)
		}
	}
}