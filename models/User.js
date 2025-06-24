const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  coke: { type: Number, default: 0 },
  lastDaily: { type: Date, default: null }
});

module.exports = mongoose.model('User', userSchema);
