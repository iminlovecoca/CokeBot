const mongoose = require("mongoose");

const battleSeasonSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "battle_rank" },
    seasonId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    lastResetAt: { type: Date, default: null },
    resetLockId: { type: String, default: null },
    resetLockAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.BattleSeason || mongoose.model("BattleSeason", battleSeasonSchema);
