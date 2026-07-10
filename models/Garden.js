const mongoose = require('mongoose');

const cellSchema = new mongoose.Schema({
  plant:        { type: String,  default: null },   // plant emoji or null
  growth:       { type: Number,  default: 0    },   // 0=Seed 1=Sprout 2=Bloom 3=Ready
  seedType:     { type: String,  default: null },   // 'vegetable'|'flower'|'fruit'
  hasBug:       { type: Boolean, default: false },
  bugType:      { type: String,  default: null },
  bugAppearsAt: { type: Date,    default: null },   // when bug becomes visible
  bugDestroyAt: { type: Date,    default: null },   // when bug destroys plant
  immune:       { type: Boolean, default: false },   // immune after bug caught
  plantedAt:    { type: Date,    default: null  },
  isWatered:    { type: Boolean, default: false }
}, { _id: false });

const gardenSchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true },
  cells:    { type: [cellSchema], required: true },

  // Seed inventory (bought from shop)
  inventory: {
    vegetable: { type: Number, default: 0 },
    flower:    { type: Number, default: 0 },
    fruit:     { type: Number, default: 0 }
  },

  // Daily check-in tracking
  totalDays:       { type: Number, default: 0    },
  totalEarned:     { type: Number, default: 0    },
  lastCheckinDate: { type: Date,   default: null },  // last day user opened garden
  lastWateredDate: { type: Date,   default: null },  // last day plants were watered

  // Modifiers
  nextWaterDoubled:  { type: Boolean, default: false },
  luckyHarvestActive:{ type: Boolean, default: false },

  // Active random event
  activeEvent: {
    eventType: { type: String, default: null },
    name:      { type: String, default: null },
    emoji:     { type: String, default: null }
  },

  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Garden', gardenSchema);
