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

client.commands = new Collection();

const loadCommands = (dir) => {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd.name) client.commands.set(cmd.name, cmd);
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
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
      }
    }
  }
};
loadEvents(path.join(__dirname, 'events'));

const PREFIX = '!';

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (mongoose.connection.readyState !== 1) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const command = client.commands.get(cmd)
    || client.commands.find(c => c.aliases && c.aliases.includes(cmd));
  if (!command) return;


  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(`❌ Lỗi lệnh !${cmd}:`, err);
    message.reply('❌ | Đã xảy ra lỗi khi thực thi lệnh.').catch(() => { });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || typeof command.slashExecute !== 'function') return;

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

client.once('ready', async () => {
  console.log(`✅ Bot sẵn sàng: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Coke 🎲', type: 0 }],
    status: 'online'
  });
});

mongoose.connect(process.env.MONGO_URL, {
  maxPoolSize: 50,
  minPoolSize: 5,
  socketTimeoutMS: 0,
  connectTimeoutMS: 20000,
  serverSelectionTimeoutMS: 20000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  family: 4
})
  .then(() => {
    console.log('✅ Đã kết nối MongoDB');
    client.login(process.env.TOKEN);
  })
  .catch(err => {
    console.error('❌ MongoDB lỗi:', err);
    setTimeout(() => mongoose.connect(process.env.MONGO_URL), 5000);
  });

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mất kết nối MongoDB, đang thử kết nối lại...');
});
