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
const User = require('./models/User');
const Species = require('./models/cokemon/Species');
const Item = require('./models/cokemon/Item');
const spawner = require('./features/spawner');
const { loadBotLock, shouldBlockCommand } = require('./utils/botLock');


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

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || typeof command.slashExecute !== 'function') return;

    const userData = await User.findOne({ userId: interaction.user.id });
    if (userData?.bannedUntil && userData.bannedUntil > Date.now()) {
      const until = `<t:${Math.floor(userData.bannedUntil / 1000)}:R>`;
      return interaction.reply({
        content: `🚫 Bạn đang bị cấm sử dụng bot cho đến ${until}`,
        flags: 64
      });
    }

    try {
      await command.slashExecute(interaction, client.betData);
    } catch (err) {
      console.error('❌ Slash command error:', err);
      if (!interaction.replied) {
        interaction.reply({ content: '❌ Lỗi khi xử lý slash command.', flags: 64 }).catch(() => { });
      }
    }
  }

  if (interaction.isModalSubmit()) {
    const [prefix, choice, userId] = interaction.customId.split('_');
    if (prefix !== 'bet' || interaction.user.id !== userId) return;

    const userData = await User.findOne({ userId: interaction.user.id });
    if (userData?.bannedUntil && userData.bannedUntil > Date.now()) {
      const until = `<t:${Math.floor(userData.bannedUntil / 1000)}:R>`;
      return interaction.reply({
        content: `🚫 Bạn đang bị cấm sử dụng bot cho đến ${until}`,
        flags: 64
      });
    }

    const betCommand = client.commands.get('bc');
    if (betCommand?.handleModalSubmit) {
      try {
        await betCommand.handleModalSubmit(interaction, choice, userId);
      } catch (err) {
        console.error('❌ Modal error:', err);
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ | Xử lý thất bại.', flags: 64 });
        }
      }
    }
  }
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot sẵn sàng: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Coke 🎲', type: 0 }],
    status: 'online'
  });

  try {
    client.allSpecies = await Species.find({}).sort({ dex_id: 'asc' });
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
    await mongoose.connect(process.env.MONGO_URL, {
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
