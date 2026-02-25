const mongoose = require('mongoose')
const { DateTime } = require('luxon')
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
        // } else if (totalCoke > 2000000) {
        //     debuffPercentage = 0.15
        }
    }
    return debuffPercentage
}

const capitalizeFirstLetter = str => {
    if (str.length === 0) return ""
    return str.charAt(0).toUpperCase() + str.slice(1)
}

const formatDuration = totalSeconds => {
    if (totalSeconds <= 0) {
        return "0 giây"
    }

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts = []
    if (hours > 0) {
        parts.push(`${hours} giờ`)
    }
    if (minutes > 0) {
        parts.push(`${minutes} phút`)
    }
    if (seconds > 0) {
        parts.push(`${seconds} giây`)
    }
    return parts.join(' ')
}

const formatDateTimeToVietnamese = (luxonDateTime) => {
    if (!luxonDateTime || !luxonDateTime.isValid) {
        return "Ngày không hợp lệ";
    }

    return luxonDateTime
        .setZone('Asia/Ho_Chi_Minh')
        .setLocale('vi')
        .toFormat('EEEE, dd MMMM, yyyy, HH:mm:ss');
}

const calculateStd = arr => {
    if (arr.length < 2) return 0
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length
    return Math.sqrt(variance)
}

const splitMessage = (text, maxLength = 2000) => {
    if (text.length <= maxLength) {
        return [text]
    }

    const chunks = []
    const lines = text.split('\n')
    let currentChunk = ''

    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > maxLength) {
            chunks.push(currentChunk)
            currentChunk = ''
        }
        currentChunk += (currentChunk ? '\n' : '') + line
    }

    if (currentChunk) {
        chunks.push(currentChunk)
    }
    return chunks
}

const cleanString = str => {
    return str.toLowerCase()
        .replace(/[.,\/#!$%\^&*;:{}=\-_`~()?!]/g, " ") // remove punctuation
        .replace(/\s{2,}/g, " ") // remove extra spaces
        .trim()
}

module.exports = {
    runTransactionWithRetry,
    getDebuffPercentage,
    capitalizeFirstLetter,
    formatDuration,
    formatDateTimeToVietnamese,
    calculateStd,
    splitMessage,
    cleanString
}