const { EmbedBuilder } = require('discord.js')
const Cokemon = require('../../models/cokemon/Cokemon')
const { calculateStat } = require('../../utils/CokemonUtil')
const config = require('../../data/config')

module.exports = {
	name: 'info',
	description: 'Xem thông tin chi tiết của một cokemon bạn sở hữu.',
	usage: '`!info <id>`',
	examples: '`!info 12`',
	async execute(message, args) {
		try {
			const cokemonUid = parseInt(args[0])
			if (isNaN(cokemonUid)) {
				throw new Error("Bạn cần cung cấp ID của cokemon bạn muốn xem. Ví dụ: `!info 3`")
			}

			const cokemon = await Cokemon.findOne({
				owner_id: message.author.id, 
				uid: cokemonUid 
			}).populate('species_id')

			if (!cokemon) {
				throw new Error(`Không tìm thấy cokemon với ID ${cokemonUid} trong bộ sưu tập của bạn.`)
			}

			const species = cokemon.species_id
			const genderSymbol = cokemon.gender === 'Male' ? config.emoji.male : cokemon.gender === 'Female' ? config.emoji.female : config.emoji.genderless

			const info = []
			info.push(`**Loài:** ${species.name}`)
			info.push(`**Bậc:** ${species.tier}`)
			info.push(`**Hệ:** ${species.type.join(', ')}`)
			info.push(`**Giới tính:** ${genderSymbol}`)
			info.push(`**Tính cách:** ${cokemon.nature}`)
			info.push(`**Level:** ${cokemon.level}`)

			const hp = calculateStat(species.base_stats.hp, cokemon.ivs.hp, cokemon.level, cokemon.nature, 'hp')
			const atk = calculateStat(species.base_stats.atk, cokemon.ivs.atk, cokemon.level, cokemon.nature, 'atk')
			const def = calculateStat(species.base_stats.def, cokemon.ivs.def, cokemon.level, cokemon.nature, 'def')
			const spd = calculateStat(species.base_stats.spd, cokemon.ivs.spd, cokemon.level, cokemon.nature, 'spd')

			const stats = []
			stats.push(`**HP:** ${hp} • IV: ${cokemon.ivs.hp}/${config.cokemon_settings.max_iv}`)
			stats.push(`**Tấn công:** ${atk} • IV: ${cokemon.ivs.atk}/${config.cokemon_settings.max_iv}`)
			stats.push(`**Phòng thủ:** ${def} • IV: ${cokemon.ivs.def}/${config.cokemon_settings.max_iv}`)
			stats.push(`**Tốc độ:** ${spd} • IV: ${cokemon.ivs.spd}/${config.cokemon_settings.max_iv}`)
			stats.push(`**IV Tổng:** ${cokemon.iv_percent}%`)

			const imageFile = cokemon.is_shiny ? species.shiny_image_file : species.image_file
			const imagePath = `./assets/images/${imageFile}`

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
				.setFooter({ text: `ID: ${cokemon.uid} | Bắt lúc: ${cokemon.createdAt.toLocaleTimeString('vi-VN')} ngày ${cokemon.createdAt.toLocaleDateString('vi-VN')}` })

			await message.reply({
				embeds: [embed],
				files: [imagePath]
			})
		} catch (error) {
			await message.reply(error.message)
		}
	}
}
