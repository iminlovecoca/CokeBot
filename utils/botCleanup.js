const config = require('../data/config')

const performStartupCleanup = async (client) => {
    console.log("🧹 Sweeping for legacy AI threads...")
    try {
        const guilds = await client.guilds.fetch()
        for (const [guildId, partialGuild] of guilds) {
            const fullGuild = await partialGuild.fetch()
            const allChannels = await fullGuild.channels.fetch()

            const textChannels = allChannels.filter(c => c.type === 0)

            for (const [chanId, channel] of textChannels) {
                try {
                    const activeThreads = await channel.threads.fetchActive()
                    const legacyThreads = activeThreads.threads.filter(t => 
                        t.ownerId === client.user.id &&
                        t.name.startsWith(config.ai.thread_name_prefix)
                    )

                    for (const [tid, thread] of legacyThreads) {
                        await thread.delete()
                        console.log(`Deleted legacy thread: ${thread.name} in #${channel.name}`)
                    }
                } catch (e) {
                    continue
                }
            }
        }
        console.log("✅ Sweep complete.")
    } catch (error) {
        console.error("❌ Startup thread sweep failed:", error.message)
    }
}

module.exports = { performStartupCleanup }
