const https = require('https')
const { splitMessage } = require('../../utils/miscUtil')
const config = require('../../data/config')
const DISCORD_CHAR_LIMIT = 2000

module.exports = {
    name: 'announce',
    aliases: ['notice'],
    description: 'Gửi một thông báo đến một kênh cụ thể.',
    usage: '`!announce <#channel|channelId> [nội dung]` (đính kèm file .md hoặc .txt để gửi nội dung từ file)',
    examples: '`!announce #general Hello World!`',
    async execute(message, args) {
        try {
            if (!config.permissions.admin_user_ids.includes(message.author.id)) {
                throw new Error(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`)
            }

            if (args.length < 1) {
                throw new Error(`${config.emoji.no} Cú pháp không hợp lệ. Dùng: \`${this.usage}\``)
            }

            const channelArg = args[0]
            let announcementContent = args.slice(1).join(' ')
            const targetChannel = message.mentions.channels.first() || await message.client.channels.fetch(channelArg.replace(/[<#>]/g, '')).catch(() => null)
            if (!targetChannel || !targetChannel.isTextBased()) {
                throw new Error(`${config.emoji.no} Không tìm thấy kênh.`)
            }

            const attachment = message.attachments.first()
            if (attachment) {
                const fileUrl = attachment.url
                if (!attachment.name.endsWith('.txt') && !attachment.url.name.endsWith('.md')) {
                    throw new Error(`${config.emoji.no} File đính kèm phải là file \`.txt\` hoặc \`.md\`.`)
                }

                announcementContent = await new Promise((resolve, reject) => {
                    https.get(attachment.url, (res) => {
                        let data = ''
                        res.on('data', chunk => data += chunk)
                        res.on('end', () => resolve(data))
                        res.on('error', err => reject(err))
                    })
                })
            } else if (!announcementContent) {
                throw new Error(`${config.emoji.no} Bạn phải cung cấp nội dung thông báo hoặc đính kèm một file text.`)
            }

            const messageChunks = splitMessage(`${announcementContent}\n@everyone`, DISCORD_CHAR_LIMIT)
            for (const chunk of messageChunks) {
                if (chunk.length > 0) {
                    await targetChannel.send(chunk)
                    await new Promise(resolve => setTimeout(resolve, 250))
                }
            }

            await message.channel.send(`${config.emoji.yes} Thông báo đã được gửi thành công đến <#${targetChannel.id}>!`)
        } catch (error) {
            await message.reply(error.message)
        }
    }
}
