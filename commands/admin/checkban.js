const { EmbedBuilder } = require('discord.js')
const { getUser } = require('../../utils/userUtil')
const { formatDateTimeToVietnamese } = require('../../utils/miscUtil')
const { DateTime } = require('luxon')
const config = require('../../data/config')

module.exports = {
	name: 'checkban',
	description: 'Kiểm tra tình trạng cấm của người dùng (chỉ admin).',
	usage: '`!checkban <@user|userId>`',
	async execute(message, args) {
		try {
			if (!config.permissions.admin_user_ids.includes(message.author.id)) {
				throw new Error(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`)
			}

			const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null)
			if (!target) {
				throw new Error(`${config.emoji.no} Không tìm thấy người dùng.`)
			}

			const user = await getUser(target.id)
			const embed = new EmbedBuilder()
				.setTitle(`Tình trạng của ${target.username}`)
				.setThumbnail(target.displayAvatarURL())
				.setColor('#FFFFFF')

			if (!user || !user.bannedUntil || user.bannedUntil < new Date()) {
				embed.setDescription(`${config.emoji.yes} Người dùng này không bị cấm.`)
					.setColor('#2ECC71')
			} else {
				const banExpirationDate = formatDateTimeToVietnamese(DateTime.fromJSDate(new Date(user.bannedUntil)))
				const reason = user.anticheat?.last_flag_reason || 'Không có lý do cụ thể (có thể do ban tay).'

				embed.setDescription(`🚫 Người dùng này đang bị cấm!`)
					.addFields(
						{ name: 'Hết hạn vào', value: banExpirationDate, inline: true },
						{ name: 'Lý do', value: `\`${reason}\``, inline: false }
					)
					.setColor('#E74C3C')
			}
			return message.reply({ embeds: [embed] })
		} catch (error) {
			await message.reply(error.message)
		}
	}
}