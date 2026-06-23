require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  Partials,
  Options,
  ActivityType,
} = require("discord.js");

const originalSetTimeout = global.setTimeout;
global.setTimeout = (callback, delay, ...args) => {
  const safeDelay =
    typeof delay === "number" && Number.isFinite(delay)
      ? Math.max(1, delay)
      : delay;
  return originalSetTimeout(callback, safeDelay, ...args);
};

const Species = require("./models/cokemon/Species");
const Item = require("./models/cokemon/Item");
const Knowledge = require("./models/Knowledge");
const { syncNoituData } = require("./utils/noituBootstrap");
// Music/lavalink removed

const spawner = require("./features/spawner");
const rpgBossSpawner = require("./features/rpgBossSpawner");
const { loadBotLock } = require("./utils/botLock");
const { performStartupCleanup } = require("./utils/botCleanup");
const { initializeAutohuntReminders } = require("./features/autohuntReminder");
const { initializeGodsetExpirations } = require("./features/godsetExpiryManager");
const config = require("./data/config");
const { syncTimeDrift } = require("./utils/timeSync");
const { startNetworkMonitor } = require("./utils/networkMonitor");

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
  ],
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 3600, // Every hour
      lifetime: 1800, // Remove messages older than 30 minutes
    },
    users: {
      interval: 3600, // Every hour
      filter: () => (user) => user.id !== client.user.id, // Sweep all users except the bot itself
    }
  }
});

client.commands = new Collection();
client.noituCommands = new Collection();
client.activeLures = new Map();
client.activeSpawns = new Map();
client.lastSpawn = new Map();
client.lureCooldowns = new Map();
client.actionLocks = new Set();
client.xpCooldowns = new Map();
client.friendshipCooldowns = new Map();
client.cuddleCooldowns = new Map();
client.musicQueues = new Map();
client.noituGames = new Map();
client.noituModerationRequests = new Map();
client.rpgBosses = new Map();

const loadFiles = (dir, callback) => {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadFiles(fullPath, callback);
    } else if (file.name.endsWith(".js")) {
      callback(fullPath);
    }
  }
};

const parseDisabledSlashCommands = () =>
  new Set(
    (process.env.DISABLED_SLASH_COMMANDS || "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );

const buildSlashCommandsForRegistration = () => {
  const disabledCommands = parseDisabledSlashCommands();
  const allCommands = [
    ...client.commands.values(),
    ...client.noituCommands.values(),
  ];
  const commands = allCommands
    .filter((command) => command.data)
    .filter(
      (command) => !disabledCommands.has(command.data.name.toLowerCase()),
    );

  if (disabledCommands.size) {
    const removedCommands = allCommands
      .filter((command) => command.data)
      .map((command) => command.data.name)
      .filter((name) => disabledCommands.has(name.toLowerCase()));

    if (removedCommands.length) {
      console.log(
        `🧹 Skipping disabled slash commands: ${removedCommands.join(", ")}`,
      );
    }
  }

  return commands.map((command) => command.data);
};

// Cokemusic building/integration removed

loadFiles(path.join(__dirname, "commands"), (filePath) => {
  const cmd = require(filePath);
  if (cmd.name) {
    cmd.filePath = filePath;
    const relativePath = path.relative(path.join(__dirname, "commands"), filePath);
    const pathParts = relativePath.split(path.sep);
    cmd.category = pathParts.length > 1 ? pathParts[0].toLowerCase() : "general";
    
    if (filePath.includes(`${path.sep}commands${path.sep}noitu${path.sep}`)) {
      client.noituCommands.set(cmd.name, cmd);
    } else {
      client.commands.set(cmd.name, cmd);
    }
  }
});

loadFiles(path.join(__dirname, "events"), (filePath) => {
  const event = require(filePath);
  if (event.name) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
});

client.once(Events.ClientReady, async () => {
  console.log(`🚀 Bot logged in as ${client.user.tag}`);
  startNetworkMonitor(client);
  client.user.setPresence({
    activities: [{ 
      name: "Coke 🎲", 
      type: ActivityType.Streaming, 
      url: "https://www.twitch.tv/cokebot" 
    }],
    status: "online",
  });

  try {
    await syncNoituData().catch((error) => {
      console.warn(
        "⚠️ Noitu GitHub sync failed, falling back to local data:",
        error.message,
      );
    });

    const metadata = await Knowledge.findOne({
      content: "__METADATA__",
    }).lean();
    if (
      !metadata ||
      metadata.metadata.model_used !== config.ai.embedding_model
    ) {
      console.error("❌ Knowledge base is out of sync with config.js!");
      console.error(`- Required Model: ${config.ai.embedding_model}`);
      console.error("- Please run: npm run seed:ai");
      process.exit(1);
    }

    client.allSpecies = await Species.find({})
      .sort({ dex_id: "asc" })
      .populate({ path: "available_abilities.ability", model: "Ability" })
      .lean();
    client.allItems = await Item.find({}).lean();
    
    // Seed or update wc to ensure correct emoji and metadata
    let wcItem = await Item.findOne({ item_id: "wc" });
    if (!wcItem) {
      wcItem = await Item.create({
        item_id: "wc",
        name: "Hộp Vũ Khí",
        description: "Mở hộp nhận ngẫu nhiên 1 trang bị RPG từ Sơ cấp đến Divine. Sử dụng bằng lệnh xuse wc hoặc xwc.",
        item_type: "tool",
        price: null,
        emoji: "<:crate:1512793698025603282>"
      });
      console.log("🎁 Seeded wc item in DB.");
    } else if (wcItem.emoji !== "<:crate:1512793698025603282>") {
      wcItem.emoji = "<:crate:1512793698025603282>";
      await wcItem.save();
      console.log("🎁 Updated wc item emoji in DB.");
    }

    const wcIndex = client.allItems.findIndex((i) => i.item_id === "wc");
    if (wcIndex > -1) {
      client.allItems[wcIndex] = wcItem.toObject ? wcItem.toObject() : wcItem;
    } else {
      client.allItems.push(wcItem.toObject ? wcItem.toObject() : wcItem);
    }

    // Seed or update dungeonkey to ensure correct emoji and metadata
    let keyItem = await Item.findOne({ item_id: "dungeonkey" });
    if (!keyItem) {
      keyItem = await Item.create({
        item_id: "dungeonkey",
        name: "Chìa khóa Phó bản",
        description: "Dùng để mở cổng phó bản Dungeon. Nhận từ việc tiêu diệt Boss Rồng/Thượng Nhân hoặc mua ở cửa hàng.",
        item_type: "tool",
        price: 250000,
        emoji: "<:key:1516398711712911461>"
      });
      console.log("🔑 Seeded dungeonkey item in DB.");
    } else {
      let updated = false;
      if (keyItem.emoji !== "<:key:1516398711712911461>") {
        keyItem.emoji = "<:key:1516398711712911461>";
        updated = true;
      }
      if (keyItem.price !== 250000) {
        keyItem.price = 250000;
        updated = true;
      }
      if (updated) {
        await keyItem.save();
        console.log("🔑 Updated dungeonkey item in DB.");
      }
    }

    const keyIndex = client.allItems.findIndex((i) => i.item_id === "dungeonkey");
    if (keyIndex > -1) {
      client.allItems[keyIndex] = keyItem.toObject ? keyItem.toObject() : keyItem;
    } else {
      client.allItems.push(keyItem.toObject ? keyItem.toObject() : keyItem);
    }

    // Seed or update abyssalhorn to ensure correct emoji and metadata
    let hornItem = await Item.findOne({ item_id: "abyssalhorn" });
    if (!hornItem) {
      hornItem = await Item.create({
        item_id: "abyssalhorn",
        name: "Tù và Vực thẳm",
        description: "Dùng để triệu hồi ngẫu nhiên một con Boss Thế Giới tại kênh hiện tại mà không cần đợi giờ xuất hiện.",
        item_type: "tool",
        price: 250000,
        emoji: "<:AbyssalHorn:1517221292124930190>"
      });
      console.log("📯 Seeded abyssalhorn item in DB.");
    } else {
      let updated = false;
      if (hornItem.emoji !== "<:AbyssalHorn:1517221292124930190>") {
        hornItem.emoji = "<:AbyssalHorn:1517221292124930190>";
        updated = true;
      }
      if (hornItem.price !== 250000) {
        hornItem.price = 250000;
        updated = true;
      }
      if (updated) {
        await hornItem.save();
        console.log("📯 Updated abyssalhorn item in DB.");
      }
    }

    const hornIndex = client.allItems.findIndex((i) => i.item_id === "abyssalhorn");
    if (hornIndex > -1) {
      client.allItems[hornIndex] = hornItem.toObject ? hornItem.toObject() : hornItem;
    } else {
      client.allItems.push(hornItem.toObject ? hornItem.toObject() : hornItem);
    }

    // Seed or update souls to ensure correct emoji and metadata
    let soulsItem = await Item.findOne({ item_id: "souls" });
    if (!soulsItem) {
      soulsItem = await Item.create({
        item_id: "souls",
        name: "Linh Hồn",
        description: "Linh hồn thu được từ Hexia và Godhexa. Dùng làm tiền tệ để mua vũ khí tại Cửa Hàng Sự Kiện Hex.",
        item_type: "key_item",
        price: null,
        emoji: "<:souls:1518749776538243082>"
      });
      console.log("🟣 Seeded souls item in DB.");
    }
    const soulsIndex = client.allItems.findIndex((i) => i.item_id === "souls");
    if (soulsIndex > -1) {
      client.allItems[soulsIndex] = soulsItem.toObject ? soulsItem.toObject() : soulsItem;
    } else {
      client.allItems.push(soulsItem.toObject ? soulsItem.toObject() : soulsItem);
    }

    // Seed or update hexpiece to ensure correct emoji and metadata
    let pieceItem = await Item.findOne({ item_id: "hexpiece" });
    if (!pieceItem) {
      pieceItem = await Item.create({
        item_id: "hexpiece",
        name: "Mảnh Vũ Khí Hex",
        description: "Mảnh vỡ vũ khí cổ xưa rơi từ Godhexa. Dùng để đổi trang bị Hex tại Cửa Hàng Sự Kiện Hex.",
        item_type: "key_item",
        price: null,
        emoji: "<:piece:1518749774403338433>"
      });
      console.log("🟣 Seeded hexpiece item in DB.");
    }
    const pieceIndex = client.allItems.findIndex((i) => i.item_id === "hexpiece");
    if (pieceIndex > -1) {
      client.allItems[pieceIndex] = pieceItem.toObject ? pieceItem.toObject() : pieceItem;
    } else {
      client.allItems.push(pieceItem.toObject ? pieceItem.toObject() : pieceItem);
    }

    const { seedUpgradeStones } = require("./utils/rpgUtil");
    await seedUpgradeStones(client);

    console.log(
      `✅ Cached ${client.allSpecies.length} species & ${client.allItems.length} items.`,
    );

    const slashCommands = buildSlashCommandsForRegistration();

    if (client.application) {
      await client.application.commands.set(slashCommands);
      console.log(`✅ Registered ${slashCommands.length} slash commands.`);
    }

    await loadBotLock(client);
    spawner.initializeSpawner(client);
    await rpgBossSpawner.initialize(client);
    // Music & Lavalink initialization removed
    await initializeAutohuntReminders(client);
    await initializeGodsetExpirations(client);

    await performStartupCleanup(client);

    // RPG Class Migration
    try {
      const User = require("./models/User");
      const { calculateRpgPower } = require("./utils/rpgUtil");
      const usersToMigrate = await User.find({
        "rpg.classKey": { $ne: null },
        "rpg.migratedToWarrior": { $ne: true }
      });
      if (usersToMigrate.length > 0) {
        console.log(`🔄 Migrating ${usersToMigrate.length} users to Warrior class...`);
        const warriorClass = config.rpg.classes.warrior;
        for (const user of usersToMigrate) {
          user.rpg.classKey = "warrior";
          user.rpg.characterAsset = "Warrior_male.png";
          user.rpg.stats = { ...warriorClass.stats };
          user.rpg.freeClassChangeUsed = false;
          user.rpg.migratedToWarrior = true;
          user.rpg.power = calculateRpgPower(user);
          user.markModified("rpg");
          await user.save();
        }
        console.log("✅ RPG Class migration completed.");
      }
    } catch (migError) {
      console.error("❌ RPG Class migration error:", migError);
    }

    // Load active noitu games from MongoDB
    try {
      const NoituGuild = require("./models/NoituGuild");
      const activeGuilds = await NoituGuild.find({ "gameState.running": true }).lean();
      if (activeGuilds.length > 0) {
        console.log(`🔄 Loading ${activeGuilds.length} active noitu game states from database...`);
        for (const guildDoc of activeGuilds) {
          client.noituGames.set(guildDoc.guildId, {
            running: guildDoc.gameState.running,
            channelId: guildDoc.gameState.channelId,
            currentWord: guildDoc.gameState.currentWord,
            currentPlayerId: guildDoc.gameState.currentPlayerId,
            words: guildDoc.gameState.words || [],
            lastUpdatedAt: guildDoc.gameState.lastUpdatedAt,
          });
        }
        console.log("✅ Noitu game states loaded successfully.");
      }
    } catch (noituLoadError) {
      console.error("❌ Failed to load noitu games from database:", noituLoadError);
    }
  } catch (error) {
    console.error("❌ Error during startup sequence:", error);
    process.exit(1);
  }
});

async function connectWithRetry() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 100,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 20000,
      retryWrites: true,
      family: 4,
    });
    client.login(process.env.TOKEN);
  } catch (err) {
    console.error(
      "❌ MongoDB connection failed, retrying in 5s...",
      err.message,
    );
    setTimeout(connectWithRetry, 5000);
  }
}

mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB error:", err),
);
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️ MongoDB disconnected"),
);

// Start Lavalink before connecting to DB and logging in.
// Connect to DB and login.
(async () => {
  await syncTimeDrift().catch(() => null);
  await connectWithRetry();
})();
