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
  let remaining = cooldown;
  message.reply(`⏱ | Vui lòng chờ **${remaining}s** để dùng lại.`).then(msg => {
    const interval = setInterval(async () => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        msg.delete().catch(() => {});
      } else {
        await msg.edit(`⏱ | Vui lòng chờ **${remaining}s** để dùng lại.`).catch(() => {
          clearInterval(interval);
        });
      }
    }, 1000);
  }).catch(() => {});
}

module.exports = { checkAndSetCooldown, notifyCooldown }
