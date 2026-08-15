require("dotenv").config();
require("./utils/v2Converter");
const dns = require("dns");
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
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
  if (error && error.message && (error.message.includes("EAI_AGAIN") || error.message.includes("getaddrinfo") || error.message.includes("ENOTFOUND") || error.message.includes("ECONNRESET"))) {
    console.error("Shutting down process due to network failure to let PM2 handle...");
    process.exit(1);
  }
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  if (error && error.message && (error.message.includes("EAI_AGAIN") || error.message.includes("getaddrinfo") || error.message.includes("ENOTFOUND") || error.message.includes("ECONNRESET"))) {
    console.error("Shutting down process due to network failure to let PM2 handle...");
    process.exit(1);
  }
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
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
      interval: 3600, 
      lifetime: 1800, 
    },
    users: {
      interval: 3600, 
      filter: () => (user) => user.id !== client.user.id, 
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

const ServerData = require("./database/server");
client.db = new ServerData();
const ServiceLocator = require("./core/ServiceLocator");
const GambleService = require("./services/GambleService");
const GameRepository = require("./repositories/GameRepository");
const UserRepository = require("./repositories/UserRepository");
const UserService = require("./services/UserService");
const RpgService = require("./services/RpgService");
const MathService = require("./services/MathService");
const TaixiuService = require("./services/TaixiuService");
const BattleRankService = require("./services/battleRankService");

const locator = new ServiceLocator();
locator.register("gameRepository", new GameRepository());
locator.register("gambleService", new GambleService(locator));
locator.register("userRepository", new UserRepository());
locator.register("userService", new UserService(locator));
locator.register("rpgService", new RpgService(locator));
locator.register("mathService", new MathService(locator));
locator.register("taixiuService", new TaixiuService(locator));
locator.register("battleRankService", new BattleRankService(locator));
client.services = locator;

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
    
    
    const requiredItems = [
      {
        item_id: "wc",
        name: "Hộp Vũ Khí",
        description: "Mở hộp nhận ngẫu nhiên 1 trang bị RPG từ Sơ cấp đến Divine. Sử dụng bằng lệnh xuse wc hoặc xwc.",
        item_type: "tool",
        price: null,
        emoji: "<:crate:1512793698025603282>"
      },
      {
        item_id: "dungeonkey",
        name: "Chìa khóa Phó bản",
        description: "Dùng để mở cổng phó bản Dungeon. Nhận từ việc tiêu diệt Boss Rồng/Thượng Nhân hoặc mua ở cửa hàng.",
        item_type: "tool",
        price: 250000,
        emoji: "<:key:1516398711712911461>"
      },
      {
        item_id: "abyssalhorn",
        name: "Tù và Vực thẳm",
        description: "Dùng để triệu hồi ngẫu nhiên một con Boss Thế Giới tại kênh hiện tại mà không cần đợi giờ xuất hiện.",
        item_type: "tool",
        price: 250000,
        emoji: "<:AbyssalHorn:1517221292124930190>"
      },
      {
        item_id: "souls",
        name: "Linh Hồn",
        description: "Linh hồn thu được từ Hexia và Godhexa. Dùng làm tiền tệ để mua vũ khí tại Cửa Hàng Sự Kiện Hex.",
        item_type: "key_item",
        price: null,
        emoji: "<:souls:1518749776538243082>"
      },
      {
        item_id: "hexpiece",
        name: "Mảnh Vũ Khí Hex",
        description: "Mảnh vỡ vũ khí cổ xưa rơi từ Godhexa. Dùng để đổi trang bị Hex tại Cửa Hàng Sự Kiện Hex.",
        item_type: "key_item",
        price: null,
        emoji: "<:piece:1518749774403338433>"
      }
    ];

    await Promise.all(
      requiredItems.map(async (itemData) => {
        let dbItem = await Item.findOne({ item_id: itemData.item_id });
        if (!dbItem) {
          dbItem = await Item.create(itemData);
          console.log(`🎁 Seeded ${itemData.item_id} item in DB.`);
        } else {
          let updated = false;
          if (dbItem.emoji !== itemData.emoji) {
            dbItem.emoji = itemData.emoji;
            updated = true;
          }
          if (dbItem.price !== itemData.price) {
            dbItem.price = itemData.price;
            updated = true;
          }
          if (updated) {
            await dbItem.save();
            console.log(`🎁 Updated ${itemData.item_id} item in DB.`);
          }
        }

        const idx = client.allItems.findIndex((i) => i.item_id === itemData.item_id);
        const obj = dbItem.toObject ? dbItem.toObject() : dbItem;
        if (idx > -1) {
          client.allItems[idx] = obj;
        } else {
          client.allItems.push(obj);
        }
      })
    );

    const { seedUpgradeStones } = require("./utils/rpgUtil");
    await seedUpgradeStones(client);

    console.log(
      `✅ Cached ${client.allSpecies.length} species & ${client.allItems.length} items.`,
    );

    const slashCommands = buildSlashCommandsForRegistration();

    if (client.application) {
      (async () => {
        try {
          const existingCommands = await client.application.commands.fetch();
          const entryPointCommand = existingCommands.find(
            (cmd) => cmd.type === 4 || cmd.type === 'PRIMARY_ENTRY_POINT'
          );
          const finalCommands = [...slashCommands];
          if (entryPointCommand) {
            console.log(`ℹ️ Retaining Entry Point command "${entryPointCommand.name}" to prevent bulk overwrite rejection.`);
            finalCommands.push({
              name: entryPointCommand.name,
              type: entryPointCommand.type,
              description: entryPointCommand.description || '',
            });
          }
          await client.application.commands.set(finalCommands);
          console.log(`✅ Registered ${finalCommands.length} slash commands.`);
        } catch (err) {
          console.error("❌ Failed to register slash commands:", err);
        }
      })();
    }

    await loadBotLock(client);
    spawner.initializeSpawner(client);
    await rpgBossSpawner.initialize(client);
    
    await initializeAutohuntReminders(client);
    await initializeGodsetExpirations(client);


    await performStartupCleanup(client);


    
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
    } catch (e) {
      console.error("❌ Error loading noitu game states:", e);
    }

    try {
      const seedBattleBots = require("./seeders/battleBots");
      const battleBotEngine = require("./features/battleBotEngine");
      await seedBattleBots().catch((e) => console.error("❌ Battle bot seed error:", e));
      await battleBotEngine.initialize().catch((e) => console.error("❌ Battle bot engine error:", e));
      console.log("🤖 Battle Bot NPCs initialized successfully.");
    } catch (botErr) {
      console.error("❌ Battle Bot initialization error:", botErr);
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
    await client.login(process.env.TOKEN);
  } catch (err) {
    console.error(
      "❌ Connection or Login failed, retrying in 10s...",
      err.message,
    );
    setTimeout(connectWithRetry, 10000);
  }
}

mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB error:", err),
);
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️ MongoDB disconnected"),
);



(async () => {
  await syncTimeDrift().catch(() => null);
  await connectWithRetry();
})();
