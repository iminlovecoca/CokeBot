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

    const dueReminders = activeReminders.filter((u) => {
      if (!u.rpg?.autohunt?.startTime || !u.rpg?.autohunt?.durationHours) return false;
      const startTime = new Date(u.rpg.autohunt.startTime).getTime();
      const durationMs = u.rpg.autohunt.durationHours * 60 * 60 * 1000;
      return now >= startTime + durationMs;
    });

    if (dueReminders.length === 0) return;

    const dbOps = dueReminders.map((u) =>
      User.updateOne(
        { _id: u._id },
        { $set: { "rpg.autohunt.dmReminder": false } }
      ).catch((err) => console.error(`Failed to update autohunt reminder for ${u.userId}:`, err))
    );
    await Promise.all(dbOps);

    const BATCH_SIZE_DM = 8;
    const message = `⏰ **[HuntBot]** Autohunt của bạn đã kết thúc! Hãy dùng lệnh \`autohunt\` để nhận thưởng.`;

    for (let i = 0; i < dueReminders.length; i += BATCH_SIZE_DM) {
      const batch = dueReminders.slice(i, i + BATCH_SIZE_DM);

      await Promise.all(
        batch.map(async (u) => {
          try {
            const discordUser = client.users.cache.get(u.userId) || (await client.users.fetch(u.userId).catch(() => null));
            if (!discordUser) return;
            const dmChannel = await discordUser.createDM().catch(() => null);
            if (!dmChannel) return;
            await dmChannel.send(message).catch((sendErr) => {
              if (sendErr.code === 50278 || sendErr.code === 50007) {
                console.log(`ℹ️ Could not DM autohunt reminder to ${u.userId} (DMs blocked or no mutual server).`);
              } else {
                console.error(`Failed to send DM to ${u.userId}:`, sendErr);
              }
            });
          } catch (err) {
            console.error(`Failed to handle autohunt reminder for ${u.userId}:`, err);
          }
        })
      );
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

