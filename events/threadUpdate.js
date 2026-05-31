const { Events } = require('discord.js')
const config = require('../data/config')

module.exports = {
    name: Events.ThreadUpdate,
    async execute(oldThread, newThread, client) {
        const isBotOwned = newThread.ownerId === client.user.id
        const isAIThread = newThread.name.startsWith(config.ai.thread_name_prefix)

        if (!isBotOwned || !isAIThread) return
        if (newThread.archived && !oldThread.archived) {
            try {
                await newThread.delete()
                console.log(`[Thread Cleanup] Deleted own AI thread: ${newThread.name}`)
            } catch (error) {
                console.error(`[Thread Cleanup] Error deleting thread:`, error.message)
            }
        }
    }
}