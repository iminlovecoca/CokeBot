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
        
        try {
          const discordUser = await client.users.fetch(u.userId).catch(() => null);
          if (discordUser) {
            try {
              const dmChannel = await discordUser.createDM();
              await dmChannel.send(`⏰ **[HuntBot]** Autohunt của bạn đã kết thúc! Hãy dùng lệnh \`${config.prefix}xautohunt\` để nhận thưởng.`);
            } catch (sendErr) {
              if (sendErr.code === 50278 || sendErr.code === 50007) {
                console.log(`ℹ️ Could not DM offline autohunt reminder to ${u.userId} (No mutual guilds or DMs blocked).`);
              } else {
                console.error(`Failed to send offline DM to ${u.userId}:`, sendErr);
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch user or handle offline autohunt reminder for ${u.userId}:`, err);
        } finally {
          u.rpg.autohunt.dmReminder = false;
          u.markModified("rpg");
          await u.save();
        }
      } else {
        
        setTimeout(async () => {
          try {
            const refreshed = await User.findOne({ userId: u.userId });
            if (refreshed?.rpg?.autohunt?.isActive && refreshed?.rpg?.autohunt?.dmReminder) {
              const discordUser = await client.users.fetch(u.userId).catch(() => null);
              if (discordUser) {
                try {
                  const dmChannel = await discordUser.createDM();
                  await dmChannel.send(`⏰ **[HuntBot]** Autohunt của bạn đã kết thúc! Hãy dùng lệnh \`${config.prefix}xautohunt\` để nhận thưởng.`);
                } catch (sendErr) {
                  if (sendErr.code === 50278 || sendErr.code === 50007) {
                    console.log(`ℹ️ Could not DM autohunt reminder to ${u.userId} (No mutual guilds or DMs blocked).`);
                  } else {
                    console.error(`Failed to send DM to ${u.userId}:`, sendErr);
                  }
                }
              }
              refreshed.rpg.autohunt.dmReminder = false;
              refreshed.markModified("rpg");
              await refreshed.save();
            }
          } catch (err) {
            console.error(`Failed to handle autohunt reminder for ${u.userId}:`, err);
          }
        }, remainingMs);
      }
    }
  } catch (err) {
    console.error("❌ Error initializing autohunt reminders:", err);
  }
};

module.exports = { initializeAutohuntReminders };
