const cooldowns = {};

function setCooldown(userId, commandName, seconds) {
  if (!cooldowns[userId]) cooldowns[userId] = {};
  cooldowns[userId][commandName] = Date.now() + seconds * 1000;
}

function getRemainingCooldown(userId, commandName) {
  if (!cooldowns[userId] || !cooldowns[userId][commandName]) return 0;
  const now = Date.now();
  const expire = cooldowns[userId][commandName];
  return expire > now ? Math.ceil((expire - now) / 1000) : 0;
}

module.exports = { setCooldown, getRemainingCooldown };
