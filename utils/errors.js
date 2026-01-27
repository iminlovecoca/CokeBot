const config = require('../data/config')

class UserFriendlyError extends Error {
    constructor(message) {
        super(message)
        this.name = 'UserFriendlyError'
    }
}

const handleCommandError = async (error, message) => {
    if (error instanceof UserFriendlyError) {
        await message.reply(error.message)
    } else {
        console.error(`[FATAL_COMMAND_ERROR] User: ${message.author.username}, Command: "${message.content}"`)
        console.error(error)
        await message.reply(`${config.emoji.no} Rất tiếc, đã có một lỗi không mong muốn xảy ra. Vấn đề đã được ghi nhận.`)
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