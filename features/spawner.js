const { EmbedBuilder } = require('discord.js')
const { createRandomCokemon } = require('../utils/cokemonUtil')
const { addCokemon } = require('../utils/userUtil')
const config = require('../data/config.json')

const SPAWN_INTERVAL_MS = 5 * 1000
const LURE_COOLDOWN_MS = 0.5 * 60 * 1000
const LURE_USER_COOLDOWN_MS = 30 * 60 * 1000
const NORMAL_COOLDOWN_MS = 1 * 60 * 1000
const DESPAWN_DURATION_MS = 1 * 60 * 1000
const GRACE_PERIOD_MS = 10 * 1000
const spawnChannels = Object.keys(config.channel_themes || {})

const initializeSpawner = (client) => {
    console.log('✅ Spawner has been initialized.')

    setInterval(async () => {
        // Despawn
        for (const [channelId, spawnState] of client.activeSpawns.entries()) {
            if (Date.now() > spawnState.despawn_at) {
                client.activeSpawns.delete(channelId)
                try {
                    const channel = await client.channels.fetch(channelId);
                    await channel.send(`**${spawnState.cokemon.name}** đã chạy mất rồi!`);
                } catch (error) {
                    console.error(error)
                }
            }
        }

        // Auto catch using catch-net
        for (const [channelId, spawnState] of client.activeSpawns.entries()) {
            if (!spawnState.autoCatchProcessed && Date.now() > spawnState.spawn_at + GRACE_PERIOD_MS) {
                spawnState.autoCatchProcessed = true
                const channel = await client.channels.fetch(channelId)
                console.log(`Processing auto-catches for spawn in channel ${channel.name}...`)

                for (const [userId, netState] of client.activeNets.entries()) {
                    // Check if this user has acted manually in this encounter
                    if (spawnState.userStates.has(userId)) {
                        continue
                    }

                    const cokemon = spawnState.cokemon
                    // Auto-catch with the base catch rate
                    const isCaught = (Math.random() < cokemon.catch_rate)
                    netState.uses--
                    if (netState.uses <= 0) {
                        client.activeNets.delete(userId)
                    }

                    if (isCaught) {
                        const isShiny = (Math.random() < (1 / 16))
                        const cokemonData = {
                            owner_id: userId,
                            species_id: spawnState.cokemon.species_id,
                            gender: spawnState.cokemon.gender,
                            ivs: spawnState.cokemon.ivs,
                            level: spawnState.cokemon.level,
                            is_shiny: isShiny
                        }
                        const result = await addCokemon(cokemonData)
                        if (result.success) {
                            const user = await client.users.fetch(userId);
                            await user.send(`Lưới của bạn đã bắt được một **${cokemon.name}**!`)
                                .catch(e => console.log(`Could not DM user ${user.username}`))
                        }
                    }
                }
            }
        }

        if (spawnChannels.length === 0) return

        for (const channelId of spawnChannels) {
            try {
                const lure = client.activeLures.get(channelId)
                const theme = config.channel_themes[channelId]
                const cooldown = lure ? LURE_COOLDOWN_MS : NORMAL_COOLDOWN_MS
                const lastSpawn = client.lastSpawn.get(channelId) || 0

                if (Date.now() - lastSpawn > cooldown) {
                    if (client.activeSpawns.has(channelId)) {
                        continue
                    }

                    const channel = await client.channels.fetch(channelId)
                    const newCokemon = await createRandomCokemon(lure, theme)
                    if (!newCokemon) {
                        // console.log(`Could not select a cokemon to spawn in channel ${channel.name}. Skipping.`);
                        continue
                    }

                    if (channel) {
                        const imageFile = newCokemon.speciesData.image_file
                        const imagePath = `./assets/images/${imageFile}`

                        const spawnEmbed = new EmbedBuilder()
                            .setColor('#FFFFFF')
                            .setTitle('Một Cokemon hoang dã đã xuất hiện!')
                            .setDescription('Dùng \`!catch <tên>\`, \`!bait\` hoặc \`!rock\` để bắt nó!')
                            .setImage(`attachment://${imageFile}`)

                        await channel.send({
                            embeds: [spawnEmbed],
                            files: [imagePath]
                        })

                        const spawnState = {
                            cokemon: newCokemon,
                            // [[userId, { catchRateModifier, fleeRateModifier, hasFled } ]]
                            userStates: new Map(),
                            despawn_at: Date.now() + DESPAWN_DURATION_MS,
                            spawn_at: Date.now(),
                            autoCatchProcessed: false
                        }
                        client.activeSpawns.set(channelId, spawnState)
                        client.lastSpawn.set(channelId, Date.now())
                        console.log(`Spawned a ${newCokemon.name} in channel ${channel.name}.`)
                    }
                }

                // Check for lure expiration
                if (lure && Date.now() > lure.expires_at) {
                    const channel = await client.channel.fetch(channelId)
                    const isDefaultChannel = !config.channel_themes[channelId]
                    if (isDefaultChannel) {
                        client.lureCooldowns.set(lure.ownerId, Date.now() + LURE_USER_COOLDOWN_MS)
                        console.log(`User ${lure.ownerId} is now on lure cooldown.`)
                    }

                    client.activeLures.delete(channelId)
                    channel = await client.channels.fetch(channelId)
                    if (channel) {
                        await channel.send('Hiệu ứng của lure đã hết.')
                    }
                }

            } catch (error) {
                console.error(`Error in spawner for channel ${channelId}:`, error)
            }
        }
    }, SPAWN_INTERVAL_MS)
}

module.exports = { initializeSpawner }
