require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  PermissionsBitField,
  Partials
} = require('discord.js');
const User = require('./models/User');
const { adjustCoke } = require('./utils/cokeManager');
// const { checkSpam } = require('./utils/antispam');

// Init bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
});

client.commands = new Collection();

// Load prefix commands
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

const PREFIX = '!';

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  // // check spam 
  // if (await checkSpam(message)) return;

  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ Mất kết nối MongoDB - bỏ qua thao tác');
    return;
  }

  const userId = message.author.id;
  let user = await User.findOne({ userId }) || await User.create({
    userId, level: 1, xp: 0, coke: 0, dailyXp: 0
  });

  // Kiểm tra bị ban
  if (user.bannedUntil && user.bannedUntil > Date.now()) {
    return message.reply('🚫 Bạn đang bị cấm sử dụng bot trong thời gian này.').catch(() => {});
  }

  // Reset daily XP
  const now = new Date().toISOString().split('T')[0];
  if (user.lastXpDate !== now) {
    user.dailyXp = 0;
    user.lastXpDate = now;
  }

  if (user.dailyXp < 3000) {
    const gain = Math.min(10, 3000 - user.dailyXp);
    user.xp += gain;
    user.dailyXp += gain;

    let leveledUp = false;
    let totalReward = 0;
    while (user.xp >= getXpNeeded(user.level)) {
      user.xp -= getXpNeeded(user.level);
      user.level++;
      const reward = 10000 + (user.level - 1) * 5000;
      await adjustCoke(userId, reward); // Đồng bộ cộng coke
      totalReward += reward;
      leveledUp = true;
    }

    await user.save();

    if (leveledUp) {
      message.channel.send(
        `🎉 **<@${userId}> lên cấp!**\n📈 Level: \`${user.level}\`\n💰 Thưởng: \`${totalReward.toLocaleString()} coke\`\n🏅 Rank: ${getRankEmoji(user.level)}`
      ).catch(() => {});
    }
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const command = client.commands.get(cmd);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(`❌ Lỗi lệnh !${cmd}:`, err);
    message.reply('❌ | Đã xảy ra lỗi khi thực thi lệnh.').catch(() => {});
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || typeof command.slashExecute !== 'function') return;

    try {
      await command.slashExecute(interaction, client.betData);
      if (interaction.commandName === 'bet') saveBetData();
    } catch (err) {
      console.error('❌ Slash command error:', err);
      if (!interaction.replied) {
        interaction.reply({ content: '❌ Lỗi khi xử lý slash command.', flags: 64 }).catch(() => {});
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

client.once('ready', () => {
  console.log(`✅ Bot sẵn sàng: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Coke 🎲', type: 0 }],
    status: 'online'
  });
});

mongoose.connect(process.env.MONGO_URL, {
  maxPoolSize: 100,             
  minPoolSize: 10,              
  connectTimeoutMS: 20000,      
  serverSelectionTimeoutMS: 20000, 
  socketTimeoutMS: 60000,       
  heartbeatFrequencyMS: 5000,   
  retryWrites: true,            
  family: 4                     
})
  .then(() => {
    console.log('✅ Đã kết nối MongoDB');
    client.login(process.env.TOKEN);
  })
  .catch(err => {
    console.error('❌ MongoDB lỗi:', err);
    setTimeout(() => {
      console.log('🔄 Thử kết nối lại MongoDB...');
      mongoose.connect(process.env.MONGO_URL);
    }, 5000);
  });

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mất kết nối MongoDB, đang thử kết nối lại...');
});

function getXpNeeded(level) {
  return 2000 + (level - 1) * 1000;
}

function getRankEmoji(level) {
  if (level >= 61) return '<:Ancient:1390024806535004333>';
  if (level >= 51) return '<:Legendary:1390024789279772833>';
  if (level >= 41) return '<:Mysthic:1390024772200567026>';
  if (level >= 31) return '<:Epic:1390024749517770832>';
  if (level >= 21) return '<:Rare:1390024624380706916>';
  if (level >= 11) return '<:Uncommon:1390024590347997245>';
  return '<:Common:1390024512774471902>';
}
