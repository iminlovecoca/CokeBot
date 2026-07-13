const BotLock = require('../models/BotLock');
const OWNER_ID = process.env.OWNER_ID;

async function loadBotLock(client) {
  try {
    let doc = await BotLock.findById('singleton');
    if (!doc) {
      doc = await BotLock.create({ _id: 'singleton', locked: false, lockedFeatures: [], allowedUsers: [] });
    }
    client.botLocked = !!doc.locked;
    client.lockedFeatures = doc.lockedFeatures || [];
    
    // Gộp dev_ids và allowedUsers từ DB
    const config = require('../data/config');
    client.allowedIds = Array.from(new Set([
      ...(config.permissions.dev_ids || []),
      ...(doc.allowedUsers || [])
    ]));

    console.log(`🔒 Bot lock status: ${client.botLocked ? 'LOCKED' : 'UNLOCKED'}, Locked features: ${client.lockedFeatures.join(', ')}`);
  } catch (e) {
    console.error('❌ Failed to load bot lock status:', e);
    client.botLocked = false;
    client.lockedFeatures = [];
    client.allowedIds = [];
  }
}

function shouldBlockCommand(client, userId) {
  return client.botLocked && userId !== OWNER_ID;
}

module.exports = { loadBotLock, shouldBlockCommand };
