const User = require("../models/User");
const config = require("../data/config");

const checkAndSendReminders = async (client) => {
  try {
    const activeReminders = await User.find(
      { "rpg.autohunt.isActive": true, "rpg.autohunt.dmReminder": true },
      { userId: 1, "rpg.autohunt.startTime": 1, "rpg.autohunt.durationHours": 1 }
    ).lean();

    if (!activeReminders || activeReminders.length === 0) return;

    const now = Date.now();

    for (const u of activeReminders) {
      if (!u.rpg?.autohunt?.startTime || !u.rpg?.autohunt?.durationHours) continue;

      const startTime = new Date(u.rpg.autohunt.startTime).getTime();
      const durationMs = u.rpg.autohunt.durationHours * 60 * 60 * 1000;
      const endTime = startTime + durationMs;

      if (now >= endTime) {
        
        await User.updateOne(
          { _id: u._id },
          { $set: { "rpg.autohunt.dmReminder": false } }
        );

        try {
          const discordUser = await client.users.fetch(u.userId).catch(() => null);
          if (discordUser) {
            try {
              const dmChannel = await discordUser.createDM();
              await dmChannel.send(
                `⏰ **[HuntBot]** Autohunt của bạn đã kết thúc! Hãy dùng lệnh \`autohunt\` để nhận thưởng.`
              );
            } catch (sendErr) {
              if (sendErr.code === 50278 || sendErr.code === 50007) {
                console.log(`ℹ️ Could not DM autohunt reminder to ${u.userId} (DMs blocked or no mutual server).`);
              } else {
                console.error(`Failed to send DM to ${u.userId}:`, sendErr);
              }
            }
          }
        } catch (err) {
          console.error(`Failed to handle autohunt reminder for ${u.userId}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error checking autohunt reminders:", err);
  }
};

const initializeAutohuntReminders = async (client) => {
  try {
    
    await checkAndSendReminders(client);

    
    setInterval(() => {
      checkAndSendReminders(client).catch((err) =>
        console.error("❌ Error in periodic autohunt reminder check:", err)
      );
    }, 30000);

    console.log("⏰ Autohunt reminder background service initialized.");
  } catch (err) {
    console.error("❌ Error initializing autohunt reminders:", err);
  }
};

module.exports = { initializeAutohuntReminders, checkAndSendReminders };

