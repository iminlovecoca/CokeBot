const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { getCokemon, consumeItem } = require('../../utils/userUtil')
const { calculateStat, getRandomAbility, getCokemonEmoji, getSpecies, getPersonalityValue } = require('../../utils/cokemonUtil')
const { DateTime } = require('luxon')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

const BaseCommand = require('../../core/BaseCommand');

class EvolveCommand extends BaseCommand {
  constructor() {
    super({
	name: 'evolve',
	description: 'Tiến hóa một Cokemon nếu nó đủ điều kiện.',
	usage: `${config.prefix}evolve <cokemon_id> [item_id]`,
	examples: [
		{ intent: 'Tiến hóa bằng cấp độ hoặc điều kiện sẵn có', command: `${config.prefix}evolve 27` },
		{ intent: 'Tiến hóa bằng cách sử dụng vật phẩm cụ thể (ví dụ: moon-stone)', command: `${config.prefix}evolve 12 moon-stone` }
	],
	      cooldown: 0
    });
  }

  async execute(message, args) {
		const cokemonId = parseInt(args[0])
		const providedItemId = args[1]?.toLowerCase()
		if (isNaN(cokemonId)) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn phải cung cấp ID của Cokemon bạn muốn tiến hóa.`)
		}
	
		const cokemon = await getCokemon(message.author.id, cokemonId)
		const species = cokemon.species_id
		if (!species.evolution || species.evolution.length === 0) {
			throw new UserFriendlyError(`**${cokemon.nickname || species.name}** của bạn không thể tiến hóa thêm được nữa.`)
		}

		let evolutionPath = null
		for (const path of species.evolution) {
			let conditionsMet = false

			for (const condition of path.conditions) {
				switch (condition.type) {
					case 'level_up':
						if (cokemon.level >= condition.value) {
							conditionsMet = true
						}
						break
					case 'item':
						if (providedItemId && providedItemId === condition.value) {
							conditionsMet = true
						}
						break
					case 'held_item':
						if (cokemon.held_item_id && cokemon.held_item_id.item_id === condition.value) {
							conditionsMet = true
						}
						break
					case 'friendship':
						if (cokemon.friendship >= condition.value) {
							conditionsMet = true
						}
						break
					case 'time_of_day':
						const currentHour = DateTime.now().setZone('Asia/Ho_Chi_Minh').hour
						const isDay = currentHour >= 6 && currentHour < 18
						if (condition.value === 'day' && isDay) {
							conditionsMet = true
						} else if (condition.value === 'night' && !isDay) {
							conditionsMet = true
						}
						break
					case 'gender':
						if (cokemon.gender === condition.value) {
							conditionsMet = true
						}
						break
					case 'location':
						const channelTheme = config.channel_themes[message.channel.id]
						if (channelTheme && channelTheme.hasOwnProperty('main_types') && channelTheme.main_types.includes(condition.value)) {
							conditionsMet = true
						}
						break
					case 'personality': {
						const { operator, check_value } = condition.value
						const personalityValue = getPersonalityValue(cokemon)
						if (operator === '<' && personalityValue < check_value) {
							conditionsMet = true
						} else if (operator === '>=' && personalityValue >= check_value) {
							conditionsMet = true
						}
						break
					}
					case 'stat_comparison': {
						const { stat1, operator, stat2 } = condition.value
						const val1 = calculateStat(species.base_stats[stat1], cokemon.ivs[stat1], cokemon.level, cokemon.nature, stat1)
						const val2 = calculateStat(species.base_stats[stat2], cokemon.ivs[stat2], cokemon.level, cokemon.nature, stat2)
						if (operator === '>' && val1 > val2) {
							conditionsMet = true
						} else if (operator === '<' && val1 < val2) {
							conditionsMet = true
						} else if (operator === '=' && val1 === val2) {
							conditionsMet = true
						}
						break
					}
					case 'move_known':
						
						break
					case 'other':
						
						break
				}
				if (!conditionsMet) break
			}
			if (conditionsMet) {
				evolutionPath = path
				break
			  }
}

module.exports = new EvolveCommand();

		if (evolutionPath) {
			const newSpecies = await getSpecies(evolutionPath.species_id)
			if (!newSpecies) {
				throw new UserFriendlyError(`${config.emoji.no} Không tìm thấy loài tiến hóa trong cơ sở dữ liệu.`)
			}

			const oldName = cokemon.nickname || species.name
			const oldEmoji = await getCokemonEmoji(cokemon, species)
			const newEmoji = await getCokemonEmoji(cokemon, newSpecies)

			const msgContent = `Bạn có chắc muốn tiến hoá **${oldName}** ${oldEmoji}? Nó sẽ có dạng mới là **${newSpecies.name}** ${newEmoji}.`
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
				await i.deferUpdate()
				if (i.customId === 'confirm') {
					if (evolutionPath.conditions.some(c => c.type === 'item')) {
						const itemCondition = evolutionPath.conditions.find(c => c.type === 'item')
						if (itemCondition) {
							await consumeItem(message.author.id, itemCondition.value, 1)
						}
					} else if (evolutionPath.conditions.some(c => c.type === 'held_item')) {
						const heldItemCondition = evolutionPath.conditions.find(c => c.type === 'held_item')
						if (heldItemCondition && cokemon.held_item_id && cokemon.held_item_id.item_id === heldItemCondition.value) {
							cokemon.held_item_id = null
						}
					}

					if (!newSpecies.available_abilities.includes(cokemon.ability)) {
						cokemon.ability = getRandomAbility(newSpecies)
					}
					cokemon.species_id = newSpecies._id
					await cokemon.save()
					await i.editReply({
						content: `🎉 Chúc mừng! **${oldName}** ${oldEmoji} của bạn đã tiến hóa thành **${newSpecies.name}** ${newEmoji}!`,
						embeds: [],
						components: []
					})
				} else {
					await i.editReply({ content: 'Đã hủy yêu cầu tiến hoá.', embeds: [], components: [] })
				}
				collector.stop()
			})

			collector.on('end', (_, reason) => {
				if (reason === 'time') {
					sentMsg.edit({ content: 'Hết thời gian xác nhận, yêu cầu đã được hủy.', components: [] })
				}
			})
		} else {
			throw new UserFriendlyError(`**${cokemon.nickname || species.name}** của bạn chưa sẵn sàng để tiến hóa.`)
		}
	}
}