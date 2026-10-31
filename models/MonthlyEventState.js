const mongoose = require("mongoose");

const MonthlyEventStateSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "monthly_event" },
    lastAnnouncedMonth: { type: String, default: "" }, // Format: "2026-11"
    lastAnnouncedAt: { type: Date, default: null },
    announcementChannelId: { type: String, default: "" },
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("MonthlyEventState", MonthlyEventStateSchema);
