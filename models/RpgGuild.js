const mongoose = require("mongoose");


const RpgGuildSchema = new mongoose.Schema(
  {
    leaderId: { type: String, required: true, unique: true },
    members: { type: [String], default: [] },
    chapterProgress: { type: Number, default: 0 },
  },
  { timestamps: true }
);
// Indexes for fast lookup
RpgGuildSchema.index({ leaderId: 1 }, { unique: true });
RpgGuildSchema.index({ members: 1 });

module.exports = mongoose.model("RpgGuild", RpgGuildSchema);
