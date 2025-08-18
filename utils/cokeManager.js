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
  if (!delta) return (await User.findOne({ userId }))?.coke ?? 0;

  const doc = await User.findOneAndUpdate(
    { userId },
    { $inc: { coke: delta }, $setOnInsert: { userId, coke: 0 } },
    { new: true, upsert: true }
  );
  return doc.coke;
}

async function debitIfEnough(userId, amount) {
  if (amount <= 0) return { ok: false };

  await User.updateOne(
    { userId },
    { $setOnInsert: { userId, coke: 0 } },
    { upsert: true }
  );

  const updated = await User.findOneAndUpdate(
    { userId, coke: { $gte: amount } },
    { $inc: { coke: -amount } },
    { new: true }
  );

  if (!updated) return { ok: false };
  return { ok: true, balance: updated.coke };
}

async function credit(userId, amount) {
  if (amount <= 0) return;
  await adjustCoke(userId, amount);
}

module.exports = { getCoke, adjustCoke, debitIfEnough, credit };
