const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const { checkAndResetDailyQuests, generateRandomQuest, updateQuestProgress } = require("../utils/questUtil");

const runTest = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    console.log("Connecting to DB...", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected!");

    // Find any user with RPG character
    const user = await User.findOne({ "rpg.classKey": { $ne: null } }).exec();
    if (!user) {
      console.log("No RPG user found to test!");
      process.exit(0);
    }

    console.log(`Testing with user: ${user.userId} (${user.rpg.name})`);

    // Reset quests field to force a fresh daily generation
    user.rpg.quests = {
      active: [],
      lastDailyAt: null,
      rerollsLeft: 1
    };
    user.markModified("rpg");
    await user.save();

    console.log("Triggering checkAndResetDailyQuests...");
    await checkAndResetDailyQuests(user);

    // Refresh user from DB
    const freshUser = await User.findOne({ userId: user.userId }).exec();
    console.log("Active quests generated:", JSON.stringify(freshUser.rpg.quests.active, null, 2));
    console.log("Rerolls remaining:", freshUser.rpg.quests.rerollsLeft);
    console.log("lastDailyAt reset to:", freshUser.rpg.quests.lastDailyAt);

    // Test updating a progress
    const active = freshUser.rpg.quests.active;
    if (active.length > 0) {
      const firstQuest = active[0];
      console.log(`Simulating progress on first quest of type "${firstQuest.type}"...`);
      await updateQuestProgress(user.userId, firstQuest.type, firstQuest.target, null);
      
      const afterUpdate = await User.findOne({ userId: user.userId }).exec();
      console.log("Quest list after progress update:", JSON.stringify(afterUpdate.rpg.quests.active, null, 2));
    }

    console.log("Quest test completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
};

runTest();
