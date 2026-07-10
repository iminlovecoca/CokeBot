const { Client, GatewayIntentBits, AttachmentBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const dotenv = require("dotenv");
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("ready", async () => {
  console.log("Bot is ready");
  // Use one of the boss channel IDs from .env
  const channelId = (process.env.RPG_BOSS_CHANNEL_IDS || "").split(",")[0];
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    console.error("Channel not found:", channelId);
    process.exit(1);
  }

  // Load converter monkeypatch
  require("../utils/v2Converter");

  const activeBoss = {
    boss: {
      name: "Test Boss",
      emoji: "👹",
      asset: "boss_01.webp"
    }
  };

  const { buildBossComponentsV2, getAttachment } = require("../features/rpgBossSpawner");

  const message = await channel.send({
    content: "Testing boss spawn attachments",
    embeds: [],
    components: [buildBossComponentsV2(activeBoss)],
    files: [getAttachment(activeBoss.boss)],
    flags: MessageFlags.IsComponentsV2,
  }).catch(console.error);

  if (message) {
    console.log("Message ID:", message.id);
    console.log("Attachments size:", message.attachments.size);
    console.log("Attachments keys:", Array.from(message.attachments.keys()));
    console.log("Attachments raw data:", JSON.stringify(message.attachments.toJSON()));
  }

  process.exit(0);
});

client.login(process.env.TOKEN);
