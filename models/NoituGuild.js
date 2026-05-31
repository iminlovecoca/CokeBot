const mongoose = require("mongoose");

const noituGuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NoituGuild", noituGuildSchema);
