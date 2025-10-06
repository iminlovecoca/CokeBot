const User = require('../../models/User')
const config = require('../../data/config')
const ALLOWED_IDS = [
  process.env.OWNER_ID,
  ...(process.env.ALLOWED_IDS ? process.env.ALLOWED_IDS.split(',') : [])
]

module.exports = {
    name: 'blacklist',
    description: 'Thêm hoặc xóa người dùng khỏi danh sách đen đặc biệt.',
    usage: '`!blacklist <add|remove> <@user>`',
    hidden: true, // to hide from the !help command
    async execute(message, args) {
        try {
            if (!ALLOWED_IDS.includes(message.author.id)) {
                throw new Error(`${config.emoji.no} Bạn không đủ quyền hạn để sử dụng lệnh.`)
            }

            const [action, mention] = args
            const targetUser = message.mentions.users.first()
            if (!action || !['add', 'remove'].includes(action.toLowerCase())) {
                throw new Error(`${config.emoji.no} Vui lòng chỉ định hành động: \`add\` hoặc \`remove\`.`)
            }
            if (!targetUser) {
                throw new Error(`${config.emoji.no} Bạn phải tag một người dùng.`)
            }

            if (action.toLowerCase() === 'add') {
                await User.updateOne(
                    { userId: targetUser.id },
                    { $set: { isBlacklisted: true } },
                    { upsert: true }
                )
                message.client.blacklistedUsers.add(targetUser.id)
                await message.reply(`${config.emoji.yes} **${targetUser.tag}** đã được thêm vào danh sách đen.`)
            } else {
                await User.updateOne(
                    { userId: targetUser.id },
                    { $set: { isBlacklisted: false } }
                )
                message.client.blacklistedUsers.delete(targetUser.id)
                await message.reply(`${config.emoji.yes} **${targetUser.tag}** đã được xóa khỏi danh sách đen.`)
            }
        } catch (error) {
            await message.reply(error.message)
        }
    }
}
