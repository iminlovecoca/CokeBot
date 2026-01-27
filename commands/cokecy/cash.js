const { isDev, isAdmin, getTotalCoke } = require('../../utils/userUtil')
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown')
const { formatVNCurrency } = require('../../utils/format')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')

module.exports = {
  name: 'cash',
  aliases: ['money', 'balance'],
  description: 'Xem số coke hiện có của bạn hoặc người khác',
  async execute(message, args) {
    const userId = message.author.id
    const cooldownSeconds = 3

    const remainingCooldown = checkAndSetCooldown(userId, 'cash', cooldownSeconds)
    if (remainingCooldown > 0) {
      return notifyCooldown(message, remainingCooldown)
    }

    let targetId = userId
    let displayName = message.author.username
    if (args.length && message.mentions.users.size > 0) {
      const targetUser = message.mentions.users.first()
      if (!isDev(userId) && !isAdmin(userId)) {
        throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền xem số coke của người khác.`)
      }
      targetId = targetUser.id
      displayName = targetUser.username
    }
    const total = await getTotalCoke(targetId)
    await message.reply(`${config.emoji.money} **|** **${displayName}**, hiện có **${formatVNCurrency(total)} coke**.`)
  }
}