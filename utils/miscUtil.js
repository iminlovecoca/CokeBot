const mongoose = require('mongoose')

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

module.exports = {
    runTransactionWithRetry
}