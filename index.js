require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.commands = new Collection();

// Load command files
const commandFiles = fs.readdirSync('./commands');
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on('messageCreate', async message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmdName = args.shift().toLowerCase();

  if (client.commands.has(cmdName)) {
    try {
      await client.commands.get(cmdName).execute(message, args);
    } catch (error) {
      console.error(error);
      message.reply('Có lỗi xảy ra khi thực hiện lệnh.');
    }
  }
});

client.once('ready', () => {
  console.log(`Bot đã sẵn sàng: ${client.user.tag}`);
});

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Kết nối MongoDB thành công');
    client.login(process.env.TOKEN);
  })
  .catch(err => console.error('MongoDB lỗi', err));
