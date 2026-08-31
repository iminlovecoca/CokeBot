const cooldowns = {}
const activeCooldownTimers = new Map()
const MAX_CONCURRENT_TIMERS = 20

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
  const timerKey = `${message.author.id}:${message.commandName || 'unknown'}`
  let remaining = cooldown;

  const existingTimer = activeCooldownTimers.get(timerKey);
  if (existingTimer) {
    clearInterval(existingTimer.interval);
    existingTimer.msg.delete().catch(() => {});
    activeCooldownTimers.delete(timerKey);
  }

  if (activeCooldownTimers.size >= MAX_CONCURRENT_TIMERS) {
    const oldestKey = activeCooldownTimers.keys().next().value;
    const oldestTimer = activeCooldownTimers.get(oldestKey);
    if (oldestTimer) {
      clearInterval(oldestTimer.interval);
      oldestTimer.msg.delete().catch(() => {});
    }
    activeCooldownTimers.delete(oldestKey);
  }

  message.reply(`⏱ | Vui lòng chờ **${remaining}s** để dùng lại.`).then(msg => {
    const cleanup = () => {
      clearInterval(interval);
      activeCooldownTimers.delete(timerKey);
    };
    const interval = setInterval(async () => {
      remaining--;
      if (remaining <= 0) {
        cleanup();
        msg.delete().catch(() => {});
      } else {
        await msg.edit(`⏱ | Vui lòng chờ **${remaining}s** để dùng lại.`).catch(() => {
          cleanup();
        });
      }
    }, 1000);
    activeCooldownTimers.set(timerKey, { interval, msg });
  }).catch(() => {});
}

module.exports = { checkAndSetCooldown, notifyCooldown }
