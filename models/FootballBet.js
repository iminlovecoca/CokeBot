const mongoose = require("mongoose");

const footballBetSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    matchId: { type: String, required: true, index: true },
    fixtureTag: { type: String, required: true, index: true },
    competitionKey: { type: String, default: "", index: true },
    competitionName: { type: String, default: "" },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    kickoffAt: { type: Date, required: true, index: true },
    betType: { type: String, enum: ["winner", "score"], required: true },
    prediction: { type: String, required: true },
    pickTeam: { type: String, required: true },
    predictedScore: {
      home: { type: Number, default: null },
      away: { type: Number, default: null },
    },
    stake: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "won", "lost", "cancelled"],
      default: "pending",
      index: true,
    },
    payout: { type: Number, default: 0 },
    actualScore: {
      home: { type: Number, default: null },
      away: { type: Number, default: null },
    },
    resultStatus: { type: String, default: "" },
    source: { type: Object, default: {} },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

footballBetSchema.index({ userId: 1, matchId: 1, status: 1 });

module.exports = mongoose.model("FootballBet", footballBetSchema);
