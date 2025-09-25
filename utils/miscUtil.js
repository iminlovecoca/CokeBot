const mongoose = require('mongoose')
const config = require('../data/config')

const runTransactionWithRetry = async (txnFunc) => {
    const MAX_RETRIES = 3
    for (let i = 0; i < MAX_RETRIES; i++) {
        const session = await mongoose.startSession()
        try {
            await session.withTransaction(txnFunc)
            return
        } catch (error) {
            if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError') && i < MAX_RETRIES - 1) {
                console.log(`Write conflict detected. Retrying transaction... (Attempt ${i + 2})`)
                continue
            } else {
                throw error
            }
        } finally {
            session.endSession()
        }
    }
}

const getDebuffPercentage = async userId => {
    let debuffPercentage = 0
    if (config.gamble_settings.enable_special_treatment) {
        const { getTotalCoke } = require('./userUtil')
        const totalCoke = await getTotalCoke(userId)
        if (totalCoke > 10000000) {
            debuffPercentage = 0.35
        } else if (totalCoke > 5000000) {
            debuffPercentage = 0.25
        } else if (totalCoke > 2000000) {
            debuffPercentage = 0.15
        }
    }
    return debuffPercentage
}

module.exports = {
    runTransactionWithRetry, getDebuffPercentage
}