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
const lavalinkClient = require("./utils/lavalinkClient");
const discordPlayerClient = require("./utils/discordPlayerClient");

const spawner = require("./features/spawner");
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
    activities: [{ name: "Coke 🎲", type: 0 }],
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
    // Initialize Lavalink manager if configured
    try {
      const manager = lavalinkClient.init(client);
      if (manager) console.log("✅ Lavalink manager initialized.");
    } catch (err) {
      console.warn(
        "⚠️ Failed to initialize Lavalink manager:",
        err.message || err,
      );
    }
    // Initialize discord-player (optional, will use Lavalink if configured)
    try {
      const dp = discordPlayerClient.init(client);
      if (dp) console.log("✅ discord-player initialized.");
    } catch (err) {
      console.warn(
        "⚠️ Failed to initialize discord-player:",
        err.message || err,
      );
    }
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
// Startup health checks for music dependencies
const { spawnSync } = require("child_process");
const checkDep = (cmd, args = ["--version"]) => {
  try {
    const res = spawnSync(cmd, args, { encoding: "utf8" });
    if (res.status === 0) return true;
    return false;
  } catch {
    return false;
  }
};

const hasFfmpeg = checkDep("ffmpeg", ["-version"]);
const hasYtDlp = checkDep("yt-dlp", ["--version"]); // yt-dlp CLI
let hasOpus = false;
try {
  require("@discordjs/opus");
  hasOpus = true;
} catch (e1) {
  try {
    require("node-opus");
    hasOpus = true;
  } catch (e2) {
    try {
      require("opusscript");
      hasOpus = true;
    } catch (e3) {
      hasOpus = false;
    }
  }
}

if (!hasFfmpeg || !hasOpus || !hasYtDlp) {
  console.warn("--- Music dependency check ---");
  if (!hasFfmpeg)
    console.warn(
      "⚠️ ffmpeg not found in PATH. Install ffmpeg and ensure it's in PATH.",
    );
  if (!hasYtDlp)
    console.warn(
      "⚠️ yt-dlp not found. Install yt-dlp (pip or download exe) for more reliable extraction.",
    );
  if (!hasOpus)
    console.warn(
      "⚠️ No Opus encoder found. Install @discordjs/opus or opusscript for audio encoding.",
    );
  console.warn("-------------------------------");
}

connectWithRetry();
