const mongoose = require("mongoose");

const RpgGuildSchema = new mongoose.Schema(
  {
    leaderId: { type: String, required: true, unique: true },
    members: { type: [String], default: [] }, // Discord IDs (includes leader, max 3)
    chapterProgress: { type: Number, default: 0 }, // 0 = play chapter 1, 1 = play chapter 2, etc.
  },
  { timestamps: true }
);

module.exports = mongoose.model("RpgGuild", RpgGuildSchema);
