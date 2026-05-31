module.exports = {
  init(client) {
    try {
      const { Player } = require("discord-player");
      const player = new Player(client, {
        ytdlOptions: { filter: "audioonly", quality: "highestaudio" },
      });

      player.on("error", (queue, error) => {
        console.warn("[discord-player] Player error:", error);
      });

      client.discordPlayer = player;
      console.log(
        "✅ discord-player initialized (if Lavalink configured, it will be used).",
      );
      return player;
    } catch (err) {
      console.log(
        "ℹ️ discord-player not installed or failed to init. To enable, run: npm install discord-player @discord-player/extractor @discordjs/opus",
      );
      return null;
    }
  },

  async play(client, requestMessage, query) {
    try {
      const player = client.discordPlayer;
      if (!player) return false;
      // discord-player's play can accept a Message and a query/url
      await player.play(requestMessage, query);
      return true;
    } catch (err) {
      console.warn("[discord-player] play failed:", err?.message || err);
      return false;
    }
  },
};
