const cooldowns = {};

const setCooldown = (userId, commandName, seconds) => {
  if (!cooldowns[userId]) cooldowns[userId] = {};
  cooldowns[userId][commandName] = Date.now() + seconds * 1000;
}

const getRemainingCooldown = (userId, commandName) => {
  if (!cooldowns[userId] || !cooldowns[userId][commandName]) return 0;
  const now = Date.now();
  const expire = cooldowns[userId][commandName];
  return expire > now ? Math.ceil((expire - now) / 1000) : 0;
}

const notifyCooldown = (message, cooldown) => {
  return message.reply(`⏱ | Vui lòng chờ **${cooldown}s** để chơi lại.`).then((msg) => {
      let remaining = cooldown;
    const interval = setInterval(() => {
      remaining--
      if (remaining > 0) msg.edit(`⏱ | Vui lòng chờ **${remaining}s** để chơi lại.`)
      else {
        clearInterval(interval)
        msg.delete().catch(() => {})
      }
    }, 1000)
  })
}

module.exports = { setCooldown, getRemainingCooldown, notifyCooldown };
