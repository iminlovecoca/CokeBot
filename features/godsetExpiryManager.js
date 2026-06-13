const User = require("../models/User");
const { revokeRpgGodset } = require("../utils/rpgUtil");

const initializeGodsetExpirations = async (client) => {
  try {
    const expiredOrActive = await User.find({
      "rpg.godsetBackup.expiresAt": { $ne: null }
    }).exec();

    console.log(`⏰ Loaded ${expiredOrActive.length} active temporary godsets from DB.`);

    for (const u of expiredOrActive) {
      const expiresAt = new Date(u.rpg.godsetBackup.expiresAt).getTime();
      const remainingMs = expiresAt - Date.now();

      if (remainingMs <= 0) {
        // Expired while bot was offline
        console.log(`Revoking expired godset for offline user ${u.userId}`);
        await revokeRpgGodset(u.userId, client);
      } else {
        // Schedule revocation
        console.log(`Scheduling godset revocation for ${u.userId} in ${remainingMs}ms`);
        setTimeout(async () => {
          await revokeRpgGodset(u.userId, client);
        }, remainingMs);
      }
    }
  } catch (err) {
    console.error("❌ Error initializing godset expirations:", err);
  }
};

module.exports = { initializeGodsetExpirations };
