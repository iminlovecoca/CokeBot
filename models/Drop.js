const mongoose = require('mongoose');

const dropSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  amount: { type: Number, default: 0 },
  picked: { type: [String], default: [] },
  expireAt: { type: Date, default: Date.now, index: { expires: 0 } }
});

module.exports = mongoose.model('Drop', dropSchema);
