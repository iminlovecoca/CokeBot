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
const footballBetSettler = require("./features/footballBetSettler");
// Music/lavalink removed

const spawner = require("./features/spawner");
const rpgBossSpawner = require("./features/rpgBossSpawner");
const { loadBotLock } = require("./utils/botLock");
const { performStartupCleanup } = require("./utils/botCleanup");
const config = require("./data/config");

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
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
  ],
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
  client.user.setPresence({
    activities: [{ name: "Coke 🎲", type: 1 }],
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
    rpgBossSpawner.initialize(client);
    // Music & Lavalink initialization removed
    footballBetSettler.initialize(client);

    await performStartupCleanup(client);
  } catch (error) {
    console.error("❌ Error during startup sequence:", error);
    process.exit(1);
  }
});

async function connectWithRetry() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
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
  await connectWithRetry();
})();
