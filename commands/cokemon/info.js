const { EmbedBuilder } = require('discord.js')
const { getCokemon } = require('../../utils/userUtil')
const { calculateStat, getCokemonXpNeeded, getGenderEmoji, getCatchMethodText, getStatText } = require('../../utils/cokemonUtil')
const { formatDateTimeToVietnamese, capitalizeFirstLetter } = require('../../utils/miscUtil')
const { DateTime } = require('luxon')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

module.exports = {
	name: 'info',
	description: 'Xem thông tin chi tiết của một cokemon bạn sở hữu.',
	usage: `${config.prefix}info <id>`,
	examples: [
		{ intent: 'Xem thông tin chi tiết Cokemon có ID 12', command: `${config.prefix}info 12` }
	],
	async execute(message, args) {
		const cokemonUid = parseInt(args[0])
		if (isNaN(cokemonUid)) {
			throw new UserFriendlyError(`${config.emoji.no} Bạn cần cung cấp ID của cokemon bạn muốn xem. Ví dụ: \`!info 3\``)
		}

		const cokemon = await getCokemon(message.author.id, cokemonUid)
		const species = cokemon.species_id
		const heldItem = cokemon.held_item_id
		const info = []
		info.push(`**Loài:** ${species.name}`)
		info.push(`**Giới tính:** ${getGenderEmoji(cokemon)}`)
		info.push(`**Tính cách:** ${cokemon.nature}`)
		info.push(`**Khả năng:** ${cokemon.ability.name}`)
		info.push(`**Vật phẩm:** ${heldItem ? heldItem.emoji : 'Không có'}`)
		info.push(`**Level:** ${cokemon.level}`)
		const xpForNextLevel = getCokemonXpNeeded(cokemon.level + 1)
		info.push(`**XP:** ${cokemon.experience.toLocaleString()} / ${xpForNextLevel.toLocaleString()}`)
		info.push(`**Tình bạn:** ${cokemon.friendship} / ${config.cokemon_settings.max_friendship}`)
		info.push(`**Nhận từ:** ${getCatchMethodText(cokemon.catch_method)}`)

		const statKeys = ['hp', 'atk', 'def', 'spatk', 'spdef', 'spd']
        const stats = statKeys.map(key => {
            const statName = capitalizeFirstLetter(getStatText(key))
            const statValue = calculateStat(species.base_stats[key], cokemon.ivs[key], cokemon.level, cokemon.nature, key)
            return `**${statName}:** ${statValue} • IV: ${cokemon.ivs[key]}/${config.cokemon_settings.max_iv}`
        })
        stats.push(`**IV Tổng:** ${cokemon.iv_percent}%`)

		const imageFile = cokemon.is_shiny ? species.shiny_image_file : species.image_file
		const imagePath = `./assets/images/${imageFile}`
		const catchDate = formatDateTimeToVietnamese(DateTime.fromJSDate(cokemon.acquiredAt))

		const embed = new EmbedBuilder()
			.setColor(config.type_colors[species.type[0]] || '#FFFFFF')
			.setTitle(`${cokemon.nickname || species.name} ${cokemon.is_shiny ? '✨' : ''}`)
			.setThumbnail(message.author.displayAvatarURL())
			.setImage(`attachment://${imageFile}`)
			.addFields(
				{ name: 'Thông tin', value: info.join('\n'), inline: true },
				{ name: '\u200B', value: '\u200B' },
				{ name: 'Chỉ số', value: stats.join('\n'), inline: true }
			)
			.setFooter({ text: `ID: ${cokemon.uid} | Nhận lúc: ${catchDate}` })

		await message.reply({
			embeds: [embed],
			files: [imagePath]
		})
	}
}
