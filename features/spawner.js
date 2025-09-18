const { EmbedBuilder } = require('discord.js')
const { createRandomCokemon } = require('../utils/CokemonUtil')
const { addCokemon } = require('../utils/userUtil')
const { compositeImages } = require('../utils/imageUtil')
const path = require('path')
const fs = require('fs')
const config = require('../data/config')
const settings = config.cokemon_settings

const spawnChannels = Object.keys(config.channel_themes || {})
const spawningInProgress = new Set()

const initializeSpawner = (client) => {
    console.log('✅ Spawner has been initialized.')

    setInterval(async () => {
        // Despawn
        for (const [channelId, spawnState] of client.activeSpawns.entries()) {
            if (Date.now() > spawnState.despawn_at) {
                client.activeSpawns.delete(channelId)
                try {
                    const channel = await client.channels.fetch(channelId)
                    await channel.send(`**${spawnState.cokemon.name}** đã chạy mất rồi!`)
                } catch (error) {
                    console.error(error)
                }
            }
        }

        // Auto catch using catch-net
        for (const [channelId, spawnState] of client.activeSpawns.entries()) {
            if (!spawnState.autoCatchProcessed && Date.now() > spawnState.spawn_at + settings.grace_period_ms) {
                spawnState.autoCatchProcessed = true
                for (const [userId, netState] of client.activeNets.entries()) {
                    // Check if this user has acted manually in this encounter
                    if (spawnState.userStates.has(userId)) {
                        continue
                    }

                    const cokemon = spawnState.cokemon
                    const isCaught = (Math.random() < cokemon.catch_rate)
                    netState.uses--

                    if (isCaught) {
                        const isShiny = (Math.random() < (1 / config.cokemon_settings.shiny_rate))
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
                            if (!netState.caught) {
                                netState.caught = []
                            }
                            const name = isShiny ? `✨ ${cokemon.name}` : cokemon.name
                            const currentCount = netState.caught.get(name) || 0
                            netState.caught.set(name, currentCount + 1)
                        }
                        console.log(netState)
                    }

                    if (netState.uses <= 0) {
                        if (netState.caught.size > 0) {
                            const user = await client.users.fetch(userId)
                            const summaryLines = []
                            for (const [name, count] of netState.caught.entries()) {
                                summaryLines.push(`- ${name} (x${count})`);
                            }
                            const summaryMessage = `Lưới Bắt của bạn đã hết! Bạn đã bắt được:\n${summaryLines.join('\n')}`;
                            await user.send(summaryMessage).catch(() => { })
                        }
                        client.activeNets.delete(userId)
                    }
                }
            }
        }

        if (spawnChannels.length === 0) return

        for (const channelId of spawnChannels) {
            let finalImagePath = null
            try {
                if (spawningInProgress.has(channelId)) {
                    continue // Skip this channel if a spawn is already in progress for it
                }
                const lure = client.activeLures.get(channelId)
                const theme = config.channel_themes[channelId]
                const cooldown = lure ? settings.lure_spawn_cooldown_ms : settings.normal_spawn_cooldown_ms
                const lastSpawn = client.lastSpawn.get(channelId) || 0

                if (Date.now() - lastSpawn > cooldown) {
                    spawningInProgress.add(channelId)
                    if (client.activeSpawns.has(channelId)) {
                        continue
                    }

                    const channel = await client.channels.fetch(channelId).catch(() => null)
                    if (!channel) continue
                    const newCokemon = await createRandomCokemon(lure, theme)
                    if (!newCokemon) {
                        // console.log(`Could not select a cokemon to spawn in channel ${channel.name}. Skipping.`)
                        continue
                    }

                    if (channel) {
                        const cokemonImageFile = newCokemon.speciesData.image_file
                        const cokemonImagePath = `./assets/images/${cokemonImageFile}`
                        const primaryType = newCokemon.speciesData.type[0]
                        const backgroundFile = config.type_backgrounds[primaryType] || config.type_backgrounds['default']
                        const backgroundImagePath = `./assets/backgrounds/${backgroundFile}`
                        finalImagePath = await compositeImages(backgroundImagePath, cokemonImagePath)
                        if (!finalImagePath) {
                            throw new Error('Image composition failed.')
                        }
                        const finalImageFile = path.basename(finalImagePath)

                        const spawnEmbed = new EmbedBuilder()
                            .setColor(config.type_colors[primaryType] || '#FFFFFF')
                            .setTitle('Một Cokemon hoang dã đã xuất hiện!')
                            .setDescription(
                                'Hãy cân nhắc với từng lựa chọn!\n' +
                                "`!catch`: thử bắt với tỉ lệ bắt cơ bản\n" +
                                "`!rock`: tăng tỉ lệ bắt nhưng cũng tăng tỉ lệ chạy\n" +
                                "`!bait`: giảm tỉ lệ chạy nhưng cũng giảm tỉ lệ bắt\n"
                            )
                            .setImage(`attachment://${finalImageFile}`)
                        await channel.send({ embeds: [spawnEmbed], files: [finalImagePath] })

                        const spawnState = {
                            cokemon: newCokemon,
                            // [[userId, { catchRateModifier, fleeRateModifier, hasFled } ]]
                            userStates: new Map(),
                            despawn_at: Date.now() + settings.despawn_duration_ms,
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
                    const channel = await client.channels.fetch(channelId)
                    const isDefaultChannel = !config.channel_themes[channelId]
                    if (isDefaultChannel) {
                        client.lureCooldowns.set(lure.ownerId, Date.now() + settings.lure_user_cooldown_ms)
                        console.log(`User ${lure.ownerId} is now on lure cooldown.`)
                    }

                    client.activeLures.delete(channelId)
                    channel = await client.channels.fetch(channelId)
                    if (channel) {
                        await channel.send('Hiệu ứng của bả đã hết.')
                    }
                }

            } catch (error) {
                console.error(`Error in spawner for channel ${channelId}:`, error)
            } finally {
                spawningInProgress.delete(channelId)
                if (finalImagePath) {
                    try {
                        fs.unlinkSync(finalImagePath)
                    } catch (e) {
                        console.error("Failed to delete temporary spawn image:", e)
                    }
                }
            }
        }
    }, settings.spawn_interval_ms)
}

module.exports = { initializeSpawner }
