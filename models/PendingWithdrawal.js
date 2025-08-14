const mongoose = require('mongoose');

const PendingWithdrawalSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    unlockAt: { type: Date, required: true } // thời điểm có thể rút
});

module.exports = mongoose.model('PendingWithdrawal', PendingWithdrawalSchema);