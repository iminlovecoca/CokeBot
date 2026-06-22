const mongoose = require("mongoose");

const HexEventStateSchema = new mongoose.Schema({
  _id: { type: String, default: "hex_event" },
  active: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null },
  activatedAt: { type: Date, default: null },
  activatedBy: { type: String, default: null }
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model("HexEventState", HexEventStateSchema);
