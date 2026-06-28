const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  rewards: {
    coke: { type: Number, required: true, default: 0 },
    gear: {
      rank: { type: String, default: null }, 
      type: { type: String, default: null }, 
      name: { type: String, default: null } 
    },
    other: {
      name: { type: String, default: null },
      quantity: { type: Number, default: 0 }
    }
  },
  requirement: {
    type: { type: String, default: null },
    target: { type: Number, default: 0 },
    chapter: { type: Number, default: null }
  },
  active: { type: Boolean, default: true }
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
