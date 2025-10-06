const cooldowns = {}

const checkAndSetCooldown = (userId, commandName, seconds) => {
  if (!cooldowns[userId]) {
      cooldowns[userId] = {}
  }
  const now = Date.now()
  const expire = cooldowns[userId][commandName] || 0
  if (expire > now) {
    return Math.ceil((expire - now) / 1000)
  }
  cooldowns[userId][commandName] = now + seconds * 1000
  return 0
}

const notifyCooldown = (message, cooldown) => {
  message.reply(`⏱ | Vui lòng chờ **${cooldown}s** để chơi lại.`).then(msg => {
    setTimeout(() => {
      msg.delete().catch(() => {})
    }, cooldown * 1000)
  }).catch(() => {})
}

module.exports = { checkAndSetCooldown, notifyCooldown }
