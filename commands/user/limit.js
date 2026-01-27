const { getUser } = require('../../utils/userUtil')
const { formatVNCurrency } = require('../../utils/format')
const { getPerDayLimit, getPerTransactionLimit } = require('../../utils/transactionUtil')

module.exports = {
    name: 'limit',
    description: 'Xem giới hạn chuyển/nhận coke.',
    async execute(message) {
        const userId = message.author.id
        const user = await getUser(userId)

        const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
        const dateKey = `${vnNow.getFullYear()}-${vnNow.getMonth() + 1}-${vnNow.getDate()}`
        const dailyGive = user.dailyGive || {}
        const dailyReceive = user.dailyReceive || {}
        const sentToday = dailyGive[dateKey] || 0
        const receivedToday = dailyReceive[dateKey] || 0
        let [sendPerDayLimit, receivePerDayLimit] = getPerDayLimit(user.level || 1)
        let perTransactionLimit = getPerTransactionLimit(user.level || 1)
        sendPerDayLimit = user.vipLevel ? Infinity : sendPerDayLimit
        receivePerDayLimit = user.vipLevel ? Infinity : receivePerDayLimit
        perTransactionLimit = user.vipLevel ? Infinity : perTransactionLimit
        await message.reply(
            `💳 **|** Giới hạn giao dịch: **${formatVNCurrency(perTransactionLimit)} coke**.\n` +
            `💸 **|** Giới hạn gửi: **${formatVNCurrency(sentToday)}/${formatVNCurrency(sendPerDayLimit)} coke**.\n` +
            `💵 **|** Giới hạn nhận: **${formatVNCurrency(receivedToday)}/${formatVNCurrency(receivePerDayLimit)} coke**.`
        )
    }
}