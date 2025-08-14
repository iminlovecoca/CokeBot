const User = require('../models/User');

const locks = new Map();

async function withLock(userId, fn) {
  while (locks.has(userId)) {
    await locks.get(userId);
  }
  let resolveLock;
  const lockPromise = new Promise((res) => { resolveLock = res; });
  locks.set(userId, lockPromise);
  try {
    return await fn();
  } finally {
    locks.delete(userId);
    resolveLock();
  }
}

async function getCoke(userId) {
  const user = await User.findOne({ userId });
  return user?.coke ?? 0;
}

async function adjustCoke(userId, delta) {
  return withLock(userId, async () => {
    const doc = await User.findOneAndUpdate(
      { userId },
      { $inc: { coke: delta } },
      { new: true, upsert: true }
    );
    return doc.coke;
  });
}

async function debitIfEnough(userId, amount) {
  if (amount <= 0) return { ok: false };
  return withLock(userId, async () => {
    const user = await User.findOne({ userId }) || await User.create({ userId, coke: 0 });
    if (user.coke < amount) return { ok: false };
    user.coke -= amount;
    await user.save();
    return { ok: true, balance: user.coke };
  });
}

async function credit(userId, amount) {
  if (amount <= 0) return;
  await adjustCoke(userId, amount);
}

module.exports = { getCoke, adjustCoke, debitIfEnough, credit };
