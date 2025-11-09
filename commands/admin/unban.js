const { getUser } = require('../../utils/userUtil')
const config = require('../../data/config')

module.exports = {
	name: 'unban',
	description: 'Gỡ cấm người dùng khỏi bot (chỉ admin).',
	usage: '`!unban <@user|userId>`',
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
			if (!user || !user.bannedUntil || user.bannedUntil < new Date()) {
				throw new Error(`${config.emoji.no} Người dùng này hiện không bị cấm.`)
			}

			user.bannedUntil = null
			if (user.anticheat) {
				user.anticheat.verification_code = null
				user.anticheat.last_flag_reason = null
				user.anticheat.verification_attempts = 0
			}
			await user.save()
			return message.reply(`${config.emoji.yes} Đã gỡ cấm cho <@${target.id}>.`)
		} catch (error) {
			await message.reply(error.message)
		}
	}
}

