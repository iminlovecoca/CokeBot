const config = require('../data/config')

class UserFriendlyError extends Error {
    constructor(message) {
        super(message)
        this.name = 'UserFriendlyError'
    }
}

const handleCommandError = async (error, message) => {
    if (error instanceof UserFriendlyError) {
        await message.reply(error.message).catch(async () => {
            await message.channel.send(`<@${message.author.id}>, ${error.message}`).catch(() => {});
        });
    } else {
        console.error(`[FATAL_COMMAND_ERROR] User: ${message.author.username}, Command: "${message.content}"`)
        console.error(error)
        const errMsg = `${config.emoji.no} Rất tiếc, đã có một lỗi không mong muốn xảy ra. Vấn đề đã được ghi nhận.`;
        await message.reply(errMsg).catch(async () => {
            await message.channel.send(`<@${message.author.id}> ${errMsg}`).catch(() => {});
        });
    }
}

const handleUtilityError = async (action, context) => {
    try {
        return await action()
    } catch (error) {
        if (error instanceof UserFriendlyError) {
            throw error
        } else {
            console.error(`[UTILITY_ERROR_CONTEXT] Function: ${context}`)
            throw error
        }
    }
}

module.exports = { UserFriendlyError, handleCommandError, handleUtilityError }