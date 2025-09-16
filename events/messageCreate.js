const mongoose = require('mongoose')
const User = require('../models/User')
const { processXp } = require('../utils/xpUtil')
const PREFIX = '!'

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (!message.content.startsWith(PREFIX) || message.author.bot) return
        if (mongoose.connection.readyState !== 1) return

        await processXp(message)

        const args = message.content.slice(PREFIX.length).trim().split(/ +/)
        const commandName = args.shift().toLowerCase()
        const command = client.commands.get(commandName) ||
                        client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))
        if (!command) return

        const userData = await User.findOne({ userId: message.author.id })
        if (userData?.bannedUntil && userData.bannedUntil > Date.now()) {
            const until = `<t:${Math.floor(userData.bannedUntil / 1000)}:R>`
            return message.reply(`🚫 Bạn đang bị cấm sử dụng bot cho đến ${until}`)
        }
        
        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            await message.reply('Đã có lỗi xảy ra khi thực thi lệnh này!');
        }
    },
}