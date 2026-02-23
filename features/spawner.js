const { EmbedBuilder } = require('discord.js')
const { createRandomCokemonByTheme } = require('../utils/cokemonUtil')
const { addCokemon } = require('../utils/userUtil')
const { compositeImages } = require('../utils/imageUtil')
const ActiveNet = require('../models/cokemon/ActiveNet')
const path = require('path')
const fs = require('fs')
const config = require('../data/config')
const settings = config.cokemon_settings

const spawnChannels = Object.keys(config.channel_themes || {})
const spawningInProgress = new Set()
const DISCORD_CHAR_LIMIT = 2000

const initializeSpawner = (client) => {
    console.log('✅ Spawner has been initialized.')

    const spawnLoop = async () => {
        try {
            // Despawn
            for (const [channelId, spawnState] of client.activeSpawns.entries()) {
                if (Date.now() > spawnState.despawn_at) {
                    client.activeSpawns.delete(channelId)
                    try {
                        const channel = await client.channels.fetch(channelId)
                        await channel.send(`💨 **${spawnState.cokemon.name}** đã chạy mất rồi!`)
                    } catch (error) {
                        console.error(error)
                    }
                }
            }

            // Auto catch using catch-net
            for (const [channelId, spawnState] of client.activeSpawns.entries()) {
                if (client.botLocked) continue

                if (!spawnState.autoCatchProcessed && Date.now() > spawnState.spawn_at + settings.grace_period_ms) {
                    spawnState.autoCatchProcessed = true
                    const activeNets = await ActiveNet.find({})
                    for (const net of activeNets) {
                        // Check if this user has acted manually in this encounter
                        if (spawnState.userStates.has(net.userId)) {
                            continue
                        }

                        const cokemon = spawnState.cokemon
                        const isCaught = (Math.random() < cokemon.catch_rate)
                        net.uses--

                        if (isCaught) {
                            let successfullyClaimedByNet = false
                            if (cokemon.speciesData.tier === 'Legendary') {
                                successfullyClaimedByNet = client.activeSpawns.delete(channelId)
                            } else {
                                if (client.activeSpawns.has(channelId)) {
                                    successfullyClaimedByNet = true
                                }
                            }

                            if (successfullyClaimedByNet) {
                                if (cokemon.speciesData.tier === 'Legendary') {
                                    client.activeSpawns.delete(channelId)
                                }

                                const isShiny = (Math.random() < (1 / config.cokemon_settings.shiny_rate))
                                const cokemonData = {
                                    owner_id: net.userId,
                                    original_owner_id: net.userId,
                                    catch_method: 'net',
                                    species_id: cokemon.species_id,
                                    gender: cokemon.gender,
                                    ivs: cokemon.ivs,
                                    iv_percent: cokemon.iv_percent,
                                    ability: cokemon.ability,
                                    level: cokemon.level,
                                    nature: cokemon.nature,
                                    is_shiny: isShiny
                                }

                                try {
                                    await addCokemon(cokemonData)
                                    spawnState.userStates.set(net.userId, { hasCaught: true })
                                    const dexIdKey = cokemon.speciesData.dex_id.toString()
                                    const caughtInfo = net.caught.get(dexIdKey) || {
                                        name: cokemon.name,
                                        emoji: cokemon.emoji,
                                        shiny_emoji: cokemon.shiny_emoji,
                                        normal_caught: 0,
                                        shiny_caught: 0
                                    }
                                    if (isShiny) {
                                        caughtInfo.shiny_caught++
                                    } else {
                                        caughtInfo.normal_caught++
                                    }
                                    net.caught.set(dexIdKey, caughtInfo)
                                } catch (error) {
                                    console.error("Error within auto catching:", error)
                                }
                            }
                        }

                        if (net.uses <= 0) {
                            if (net.caught.size > 0) {
                                const user = await client.users.fetch(net.userId)
                                const caughtArray = Array.from(net.caught.entries())
                                caughtArray.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))

                                const summaryLines = []
                                for (const [dexId, info] of net.caught.entries()) {
                                    if (info.normal_caught > 0) {
                                        summaryLines.push(`- ${info.emoji} ${info.name} (x${info.normal_caught})`)
                                    }
                                    if (info.shiny_caught > 0) {
                                        const shinyEmoji = info.shiny_emoji || `${info.emoji}✨`
                                        summaryLines.push(`- ${shinyEmoji} ${info.name} (x${info.shiny_caught})`)
                                    }
                                }

                                const notifyUser = async currentMessage => {
                                    await user.send(currentMessage).catch(error => {
                                        console.error(`Could not send DM to ${user.tag}.`, error)
                                    })
                                }
                                const header = "Lưới Bắt của bạn đã hết! Bạn đã bắt được:\n"
                                let currentMessage = header

                                for (const line of summaryLines) {
                                    if (currentMessage.length + line.length + 1 > DISCORD_CHAR_LIMIT) {
                                        await notifyUser(currentMessage)
                                        currentMessage = ""
                                    }
                                    currentMessage += line + "\n"
                                }
                                if (currentMessage.length > 0) await notifyUser(currentMessage)
                            }
                            await ActiveNet.deleteOne({ userId: net.userId })
                        } else {
                            await net.save()
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
                        client.lastSpawn.set(channelId, Date.now())
                        const channel = await client.channels.fetch(channelId)

                        // Check if a cokemon is already active in this channel
                        if (client.activeSpawns.has(channelId)) {
                            // If so, delete the old one before spawning a new one
                            const oldSpawn = client.activeSpawns.get(channelId)
                            client.activeSpawns.delete(channelId)
                            await channel.send(`**${oldSpawn.cokemon.name}** đã chạy mất khi một cokemon mới xuất hiện!`).catch(console.rror)
                        }

                        const newCokemon = await createRandomCokemonByTheme(lure, theme)
                        if (!newCokemon) {
                            // console.log(`Could not select a cokemon to spawn in channel ${channel.name}. Skipping.`)
                            spawningInProgress.delete(channelId)
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

                            let announcementContent = null
                            if (newCokemon.speciesData.tier === 'Legendary' && settings.legendary_ping_role_id) {
                                announcementContent = `Một Cokemon Huyền Thoại xuất hiện nè <@&${settings.legendary_ping_role_id}>!`
                            }

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
                            const spawnState = {
                                cokemon: newCokemon,
                                // [[userId, { catchRateModifier, fleeRateModifier, hasFled, hasCaught } ]]
                                userStates: new Map(),
                                despawn_at: Date.now() + settings.despawn_duration_ms,
                                spawn_at: Date.now(),
                                autoCatchProcessed: false
                            }
                            client.activeSpawns.set(channelId, spawnState)
                            await channel.send({ content: announcementContent, embeds: [spawnEmbed], files: [finalImagePath] })

                            if (settings.spawn_verbose) {
                                console.log(`[SPAWN] Cokemon: ${newCokemon.name}, Channel: ${channel.name}, At: ${new Date(Date.now()).toLocaleTimeString('vi-VN')}.`)
                            }
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
                        if (channel) {
                            await channel.send('⌛️ Hiệu ứng của bả đã hết.')
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
                            console.error('Failed to delete temporary spawn image:', e)
                        }
                    }
                }
            }

        } catch (globalError) {
            console.error('Critical error in spawner tick:', globalError)
        } finally {
            setTimeout(spawnLoop, settings.spawn_interval_ms)
        }
    }

    spawnLoop()
}

module.exports = { initializeSpawner }
