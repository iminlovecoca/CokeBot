const User = require('../models/User');

const SPAM_LIMIT = 5;
const SPAM_WINDOW = 10 * 1000;
const WARN_TIMEOUT = 10 * 60 * 1000;
const BAN_DURATION = 36 * 60 * 60 * 1000;

const userActions = new Map();
const userCollectors = new Map();

async function checkSpam(message) {
  const userId = message.author.id;
  const now = Date.now();

  if (!userActions.has(userId)) userActions.set(userId, []);
  const actions = userActions.get(userId).filter(ts => now - ts < SPAM_WINDOW);
  actions.push(now);
  userActions.set(userId, actions);

  let user = await User.findOne({ userId });
  if (!user) user = await User.create({ userId });

  if (user.warned) {
    message.reply(
      '⚠️ | Bạn đang bị cảnh báo spam tool!\n' +
      'Vui lòng trả lời `yes` nếu bạn là người thật.\n' +
      'Nếu không trả lời trong 10 phút, bạn sẽ bị ban 36h.'
    );
    return true;
  }

  if (actions.length > SPAM_LIMIT) {
    user.warned = true;
    user.warnedAt = now;
    await user.save();

    message.reply(
      '⚠️ | Bạn có dấu hiệu spam tool!\n' +
      'Vui lòng trả lời `yes` nếu bạn là người thật.\n' +
      'Nếu không trả lời trong 10 phút, bạn sẽ bị ban 36h.'
    );

    if (userCollectors.has(userId)) return true;

    const client = message.client;
    const collector = client.on('messageCreate', async (m) => {
      if (m.author.id === userId && m.content.trim().toLowerCase() === 'yes') {
        user.warned = false;
        user.warnedAt = null;
        await user.save();
        m.reply('✅ | Cảm ơn bạn đã xác nhận! Cảnh báo đã được gỡ.');
        clearTimeout(userCollectors.get(userId).timeout);
        client.removeListener('messageCreate', userCollectors.get(userId).listener);
        userCollectors.delete(userId);
      }
    });

    const timeout = setTimeout(async () => {
      const latestUser = await User.findOne({ userId });
      if (latestUser && latestUser.warned) {
        latestUser.bannedUntil = Date.now() + BAN_DURATION;
        latestUser.warned = false;
        latestUser.warnedAt = null;
        await latestUser.save();
        message.reply('🔒 | Bạn đã bị ban 36h do không xác nhận sau cảnh báo spam.');
      }
      client.removeListener('messageCreate', userCollectors.get(userId).listener);
      userCollectors.delete(userId);
    }, WARN_TIMEOUT);

    userCollectors.set(userId, { listener: collector, timeout });
    return true;
  }
  return false;
}

module.exports = { checkSpam };