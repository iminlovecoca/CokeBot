const mongoose = require("mongoose");

const RpgGuildSchema = new mongoose.Schema(
  {
    leaderId: { type: String, required: true, unique: true },
    members: { type: [String], default: [] }, 
    chapterProgress: { type: Number, default: 0 }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("RpgGuild", RpgGuildSchema);
