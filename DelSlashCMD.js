require("dotenv").config();
const {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  Events,
} = require("discord.js");

const clientId = "1381672632004382840";
const token = process.env.TOKEN;

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Đang tiến hành xóa các slash command cũ...");

    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("Đã xóa sạch lệnh cấp Toàn cầu thành công!");

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    const ready = new Promise((resolve) =>
      client.once(Events.ClientReady, resolve),
    );
    await client.login(token);
    await ready;

    const guildIds = [...client.guilds.cache.keys()];
    for (const guildId of guildIds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [],
      });
      console.log(`Đã xóa sạch lệnh cấp Server: ${guildId}`);
    }

    await client.destroy();
  } catch (error) {
    console.error(error);
  }
})();
