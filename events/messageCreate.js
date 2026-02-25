const mongoose = require('mongoose')
const Cokemon = require('../models/cokemon/Cokemon')
const { getUser, getOrCreateUser, getActiveCokemon, addUserXp, getRankEmoji } = require('../utils/userUtil')
const { addCokemonXp } = require('../utils/cokemonUtil')
const { generateVerificationCode, generateCaptchaImage, handleVerification, checkMessage } = require('../utils/anticheat.js')
const { formatDuration } = require('../utils/miscUtil.js')
const { handleCommandError } = require('../utils/errors')
const { parseCommandArgs } = require('../utils/commandParser')
const { answerQuestion, getThreadHistory } = require('../utils/qaSystem')
const config = require('../data/config')

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || mongoose.connection.readyState !== 1) return

        const userId = message.author.id
        const isCommand = message.content.startsWith(config.prefix)
        try {
            const user = await getOrCreateUser(userId)

            // Bot lock check
            if (client.botLocked) {
                const allowedIds = client.allowedIds || config.permissions.dev_ids
                if (!allowedIds.includes(userId)) return
            }

            // Ban check
            if (user.bannedUntil && user.bannedUntil > new Date()) {
                const banExpirationDate = new Date(user.bannedUntil)
                const remainingMs = banExpirationDate.getTime() - Date.now()
                return message.reply(`🚫 Bạn đang bị cấm sử dụng bot trong ${formatDuration(Math.floor(remainingMs / 1000))} còn lại.`)
            }

            //  Pending verification check
            if (user.anticheat?.verification_code) {
                await handleVerification(message, user)
                return
            }

            // Anti-cheat detection
            const check = checkMessage(message)
            if (check.status === 'TRIGGER_VERIFICATION') {
                const code = generateVerificationCode()
                user.anticheat.verification_code = code
                user.anticheat.last_flag_reason = check.reason
                await user.save()

                const imageBuffer = generateCaptchaImage(code)
                await message.reply({
                    content: `**${config.emoji.warning} [Phát hiện hành vi đáng ngờ] ${config.emoji.warning}**\n`
                        + `Để tiếp tục, vui lòng nhập chính xác mã trong ảnh sau trong vòng **${config.anticheat.verification_timeout_ms / 1000} giây**:`,
                    files: [{ attachment: imageBuffer, name: 'captcha.png' }]
                })

                setTimeout(async () => {
                    const freshUser = await getUser(userId)
                    if (freshUser.anticheat?.verification_code === code) {
                        freshUser.anticheat.verification_code = null
                        freshUser.bannedUntil = new Date(Date.now() + config.anticheat.mute_duration_ms)
                        await freshUser.save()
                        message.channel.send(`<@${message.author.id}>, bạn đã không hoàn thành xác thực và đã bị cấm sử dụng lệnh.`)
                    }
                }, config.anticheat.verification_timeout_ms)
                return
            }

            // Conversation thread handler
            if (message.channel.isThread() && message.channel.ownerId === client.user.id) {
                if (!message.content.startsWith(config.prefix)) {
                    const lastMsgTimestamp = message.channel.lastMessage?.createdTimestamp || 0
                    const idleTime = Date.now() - lastMsgTimestamp
                    if (idleTime > config.ai.thread_expiry_ms) {
                        console.log(`[AI Thread] Session expired for thread ${message.channel.id}. Treating as normal message.`)
                    } else {
                        try {
                            const thinkingMsg = await message.channel.send('🤔 *Đang suy nghĩ...*')
                            const historyText = await getThreadHistory(message.channel, [message.id, thinkingMsg.id], client)
                            const { answer } = await answerQuestion(message.content, client, historyText, userId)
                            await thinkingMsg.edit(answer)
                            return
                        } catch (error) {
                            console.error('Thread Conversation Error:', error)
                            return
                        }
                    }
                }
            }

            // User XP gain
            if (isCommand) {
                const { leveledUp, oldLevel, newLevel, totalReward } = await addUserXp(user, 10)
                if (leveledUp) {
                    await message.channel.send(
                        `🎉 **Chúc mừng <@${userId}> đã lên cấp!**\n` +
                        `📈 Level: \`${oldLevel} → ${newLevel}\`\n` +
                        `💰 Thưởng: \`${totalReward.toLocaleString()} coke\`\n` +
                        `🏅 Rank: ${getRankEmoji(newLevel)}`
                    )
                }
            }

            // Passive Cokemon XP and friendship
            const now = Date.now()
            const xpCooldown = client.xpCooldowns.get(userId) || 0
            if (now > xpCooldown) {
                if (user.active_cokemon_id) {
                    try {
                        const selectedCokemon = await getActiveCokemon(userId)
                        const xpGained = 5 + Math.floor(selectedCokemon.level * 0.2)
                        const { levelsGained } = await addCokemonXp(selectedCokemon, xpGained)
                        if (levelsGained > 0) {
                            await message.channel.send(`🎉 Chúc mừng **${selectedCokemon.nickname || selectedCokemon.species_id.name}** của bạn đã tăng lên **cấp ${selectedCokemon.level}**!`)
                        }
                    } catch (error) {
                        if (!(error instanceof UserFriendlyError)) {
                            console.error('Unexpected error during passive XP gain:', error)
                        }
                    }
                }
                client.xpCooldowns.set(userId, now + config.cokemon_settings.xp_cooldown_ms)
            }

            const friendshipCooldown = client.friendshipCooldowns.get(userId) || 0
            if (now > friendshipCooldown) {
                if (user.active_cokemon_id && Math.random() < 0.20) {
                    await Cokemon.updateOne({ _id: user.active_cokemon_id }, { $inc: { friendship: 1 } })
                }
                client.friendshipCooldowns.set(userId, now + config.cokemon_settings.friendship_cooldown_ms)
            }

            // Command execution
            if (isCommand) {
                const rawArgs = message.content.slice(config.prefix.length).trim().split(/ +/)
                const parsedArgs = parseCommandArgs(rawArgs)
                const commandName = parsedArgs.shift().toLowerCase()
                const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))
                if (command) {
                    await command.execute(message, parsedArgs)
                }
            }
        } catch (error) {
            await handleCommandError(error, message)
        }
    }
}
