require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  Partials
} = require('discord.js');
const Species = require('./models/cokemon/Species');
const Item = require('./models/cokemon/Item');
const spawner = require('./features/spawner');
const { loadBotLock, shouldBlockCommand } = require('./utils/botLock');
require('./models/cokemon/Ability')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
});

// [[channelId: {expires_at, boosts_type, ownerId}]]
client.activeLures = new Map();
// [[channelId: {
//    cokemon: { species_id, name, catch_rate, flee_rate, gender, ivs, level, speciesData },
//    userStates, despawn_at, spawn_at, autoCatchProcessed
// }]]
client.activeSpawns = new Map();
// [[channelId: date]]
client.lastSpawn = new Map();
// [[userId: cooldown]]
client.lureCooldowns = new Map();
client.actionLocks = new Set();
client.commands = new Collection();
client.xpCooldowns = new Map();
client.friendshipCooldowns = new Map();
client.cuddleCooldowns = new Map()

const loadCommands = (dir) => {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd.name) {
        cmd.filePath = fullPath
        client.commands.set(cmd.name, cmd)
      }
    }
  }
};
loadCommands(path.join(__dirname, 'commands'));

const loadEvents = (dir) => {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadEvents(fullPath);
    } else if (file.name.endsWith('.js')) {
      const event = require(fullPath);
      if (event.name) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
      }
    }
  }
};
loadEvents(path.join(__dirname, 'events'));

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot sẵn sàng: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Coke 🎲', type: 0 }],
    status: 'online'
  });

  try {
    client.allSpecies = await Species.find({})
      .sort({ dex_id: 'asc' })
      .populate({
        path: 'available_abilities.ability',
        model: 'Ability'
    })
    console.log(`✅ Successfully cached ${client.allSpecies.length} species.`);
    client.allItems = await Item.find({});
    console.log(`✅ Successfully cached ${client.allItems.length} items.`);
  } catch (error) {
    console.error("❌ Could not cache species data:", error);
    client.allSpecies = []
  }
  await loadBotLock(client);
  spawner.initializeSpawner(client);
});

async function connectWithRetry() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
      serverSelectionTimeoutMS: 20000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      family: 4
    });

    console.log('✅ Đã kết nối MongoDB');
    client.login(process.env.TOKEN);
  } catch (err) {
    console.error('❌ MongoDB lỗi kết nối:', err);
    setTimeout(connectWithRetry, 5000); 
  }
}

connectWithRetry();

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected, driver sẽ tự thử reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});
