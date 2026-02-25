require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { Client, GatewayIntentBits, Collection, Events, Partials } = require('discord.js')

const Species = require('./models/cokemon/Species')
const Item = require('./models/cokemon/Item')
const Knowledge = require('./models/Knowledge')

const spawner = require('./features/spawner')
const { loadBotLock } = require('./utils/botLock')
const { performStartupCleanup } = require('./utils/botCleanup')
const config = require('./data/config')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
})

client.commands = new Collection()
client.activeLures = new Map()
client.activeSpawns = new Map()
client.lastSpawn = new Map()
client.lureCooldowns = new Map()
client.actionLocks = new Set()
client.xpCooldowns = new Map()
client.friendshipCooldowns = new Map()
client.cuddleCooldowns = new Map()

const loadFiles = (dir, callback) => {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    for (const file of files) {
        const fullPath = path.join(dir, file.name)
        if (file.isDirectory()) {
            loadFiles(fullPath, callback)
        } else if (file.name.endsWith('.js')) {
            callback(fullPath)
        }
    }
}

loadFiles(path.join(__dirname, 'commands'), (filePath) => {
    const cmd = require(filePath)
    if (cmd.name) {
        cmd.filePath = filePath
        client.commands.set(cmd.name, cmd)
    }
})

loadFiles(path.join(__dirname, 'events'), (filePath) => {
    const event = require(filePath)
    if (event.name) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client))
        } else {
            client.on(event.name, (...args) => event.execute(...args, client))
        }
    }
})

client.once(Events.ClientReady, async () => {
    console.log(`🚀 Bot logged in as ${client.user.tag}`)
    client.user.setPresence({
        activities: [{ name: 'Coke 🎲', type: 0 }],
        status: 'online'
    })

    try {
        const metadata = await Knowledge.findOne({ content: "__METADATA__" }).lean()
        if (!metadata || metadata.metadata.model_used !== config.ai.embedding_model) {
           console.error("❌ Knowledge base is out of sync with config.js!")
           console.error(`- Required Model: ${config.ai.embedding_model}`)
           console.error("- Please run: npm run seed:ai")
           process.exit(1)
        }

        client.allSpecies = await Species.find({})
            .sort({ dex_id: 'asc' })
            .populate({ path: 'available_abilities.ability', model: 'Ability' })
            .lean()
        client.allItems = await Item.find({}).lean()
        console.log(`✅ Cached ${client.allSpecies.length} species & ${client.allItems.length} items.`)

        await loadBotLock(client)
        spawner.initializeSpawner(client)

        await performStartupCleanup(client)
    } catch (error) {
        console.error("❌ Error during startup sequence:", error)
        process.exit(1)
    }
})

async function connectWithRetry() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 20,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 20000,
            retryWrites: true,
            family: 4
        })
        client.login(process.env.TOKEN)
    } catch (err) {
        console.error('❌ MongoDB connection failed, retrying in 5s...', err.message)
        setTimeout(connectWithRetry, 5000)
    }
}

mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'))
mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err))
mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'))
connectWithRetry()