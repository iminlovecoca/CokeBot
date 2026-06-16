const BotLock = require('../models/BotLock');
const OWNER_ID = process.env.OWNER_ID;

async function loadBotLock(client) {
  try {
    let doc = await BotLock.findById('singleton');
    if (!doc) {
      doc = await BotLock.create({ _id: 'singleton', locked: false, lockedFeatures: [] });
    }
    client.botLocked = !!doc.locked;
    client.lockedFeatures = doc.lockedFeatures || [];
    console.log(`🔒 Bot lock status: ${client.botLocked ? 'LOCKED' : 'UNLOCKED'}, Locked features: ${client.lockedFeatures.join(', ')}`);
  } catch (e) {
    console.error('❌ Failed to load bot lock status:', e);
    client.botLocked = false;
    client.lockedFeatures = [];
  }
}

function shouldBlockCommand(client, userId) {
  return client.botLocked && userId !== OWNER_ID;
}

module.exports = { loadBotLock, shouldBlockCommand };
