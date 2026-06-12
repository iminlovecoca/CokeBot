const mongoose = require("mongoose");

const noituGuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now },
  gameState: {
    running: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    currentWord: { type: String, default: null },
    currentPlayerId: { type: String, default: null },
    words: { type: [String], default: [] },
    lastUpdatedAt: { type: Number, default: null },
  }
});

module.exports = mongoose.model("NoituGuild", noituGuildSchema);
