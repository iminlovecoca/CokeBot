const User = require("../models/User");
const config = require("../data/config");

const initializeAutohuntReminders = async (client) => {
  try {
    const activeReminders = await User.find({
      "rpg.autohunt.isActive": true,
      "rpg.autohunt.dmReminder": true,
    }).exec();

    console.log(`⏰ Loaded ${activeReminders.length} active autohunt reminders from DB.`);

    for (const u of activeReminders) {
      const startTime = new Date(u.rpg.autohunt.startTime).getTime();
      const durationMs = u.rpg.autohunt.durationHours * 60 * 60 * 1000;
      const elapsedMs = Date.now() - startTime;
      const remainingMs = durationMs - elapsedMs;

      if (remainingMs <= 0) {
        // Already finished while bot was offline: Send DM immediately
        try {
          const discordUser = await client.users.fetch(u.userId).catch(() => null);
          if (discordUser) {
            const dmChannel = await discordUser.createDM();
            await dmChannel.send(`⏰ **[HuntBot]** Autohunt của bạn đã kết thúc! Hãy dùng lệnh \`${config.prefix}xautohunt\` để nhận thưởng.`);
          }
          u.rpg.autohunt.dmReminder = false;
          u.markModified("rpg");
          await u.save();
        } catch (err) {
          console.error(`Failed to send offline autohunt reminder to ${u.userId}:`, err);
        }
      } else {
        // Schedule reminder for the remaining duration
        setTimeout(async () => {
          try {
            const refreshed = await User.findOne({ userId: u.userId });
            if (refreshed?.rpg?.autohunt?.isActive && refreshed?.rpg?.autohunt?.dmReminder) {
              const discordUser = await client.users.fetch(u.userId).catch(() => null);
              if (discordUser) {
                const dmChannel = await discordUser.createDM();
                await dmChannel.send(`⏰ **[HuntBot]** Autohunt của bạn đã kết thúc! Hãy dùng lệnh \`${config.prefix}xautohunt\` để nhận thưởng.`);
              }
              refreshed.rpg.autohunt.dmReminder = false;
              refreshed.markModified("rpg");
              await refreshed.save();
            }
          } catch (err) {
            console.error(`Failed to send autohunt reminder to ${u.userId}:`, err);
          }
        }, remainingMs);
      }
    }
  } catch (err) {
    console.error("❌ Error initializing autohunt reminders:", err);
  }
};

module.exports = { initializeAutohuntReminders };
