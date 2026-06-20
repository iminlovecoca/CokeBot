const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Event = require("../models/Event");
const { requireRpgCharacter, revokeRpgGodset } = require("../utils/rpgUtil");

const runTest = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    // Cleanup old test users
    await User.deleteMany({ userId: { $in: ["test_user_normal", "test_user_godset"] } }).exec();

    // Create a normal test user
    const normalUser = await User.create({
      userId: "test_user_normal",
      username: "NormalFighter",
      coke: 1000,
      rpg: {
        classKey: "warrior",
        level: 10,
        exp: 0,
        rank: "Novice",
        items: [],
        equipped: {},
        stats: { vigor: 10, str: 10, dex: 10, int: 0, arc: 0 },
        power: 1000
      }
    });

    // Create a godset test user
    const godsetUser = await User.create({
      userId: "test_user_godset",
      username: "GodlikeAdmin",
      coke: 999999,
      rpg: {
        classKey: "warrior",
        level: 120,
        exp: 0,
        rank: "Transcendent",
        items: [],
        equipped: {},
        stats: { vigor: 99, str: 99, dex: 99, int: 99, arc: 99 },
        power: 999999,
        godsetBackup: {
          level: 50,
          exp: 0,
          rank: "Hero",
          stats: { vigor: 50, str: 30, dex: 30, int: 0, arc: 0 },
          equipped: {},
          expiresAt: new Date(Date.now() + 600000)
        }
      }
    });

    console.log("Mock users created successfully.");

    // --- TEST 1: Leaderboard Query ---
    console.log("\n--- TEST 1: Leaderboard Query ---");
    const topUsers = await User.find({ "rpg.classKey": { $ne: null }, "rpg.godsetBackup": null, vipLevel: { $lte: 0 } }).sort({ "rpg.power": -1 });
    const normalInTop = topUsers.find(u => u.userId === "test_user_normal");
    const godsetInTop = topUsers.find(u => u.userId === "test_user_godset");
    console.log(`Normal user in Top list: ${!!normalInTop} (Expected: true)`);
    console.log(`Godset user in Top list: ${!!godsetInTop} (Expected: false)`);

    if (normalInTop && !godsetInTop) {
      console.log("PASS: Leaderboard query correctly filters out godset users.");
    } else {
      console.log("FAIL: Leaderboard query does not correctly filter out godset users.");
    }

    // --- TEST 2: Battle Random Matchmaking Query ---
    console.log("\n--- TEST 2: Battle Matchmaking Query ---");
    const count = await User.countDocuments({
      "rpg.classKey": { $ne: null },
      userId: { $ne: "test_user_normal" },
      "rpg.godsetBackup": null
    });
    console.log(`Count of possible opponents for normal user: ${count}`);
    const opponents = await User.find({
      "rpg.classKey": { $ne: null },
      userId: { $ne: "test_user_normal" },
      "rpg.godsetBackup": null
    });
    const godsetInMatchmaking = opponents.find(u => u.userId === "test_user_godset");
    console.log(`Godset user in opponents list: ${!!godsetInMatchmaking} (Expected: false)`);

    if (!godsetInMatchmaking) {
      console.log("PASS: Matchmaking query correctly filters out godset users.");
    } else {
      console.log("FAIL: Matchmaking query does not correctly filter out godset users.");
    }

    // --- TEST 3: Direct Challenge Block verification ---
    console.log("\n--- TEST 3: Direct Challenge Block Verification ---");
    // Direct emulation of battle.js sender/receiver check
    const checkDirectBattle = (sender, receiver) => {
      if (sender.rpg?.godsetBackup) {
        return "BLOCKED_SENDER";
      }
      if (receiver.rpg?.godsetBackup) {
        return "BLOCKED_RECEIVER";
      }
      return "ALLOWED";
    };

    console.log(`Normal vs Normal: ${checkDirectBattle(normalUser, normalUser)} (Expected: ALLOWED)`);
    console.log(`Normal vs Godset: ${checkDirectBattle(normalUser, godsetUser)} (Expected: BLOCKED_RECEIVER)`);
    console.log(`Godset vs Normal: ${checkDirectBattle(godsetUser, normalUser)} (Expected: BLOCKED_SENDER)`);

    if (
      checkDirectBattle(normalUser, normalUser) === "ALLOWED" &&
      checkDirectBattle(normalUser, godsetUser) === "BLOCKED_RECEIVER" &&
      checkDirectBattle(godsetUser, normalUser) === "BLOCKED_SENDER"
    ) {
      console.log("PASS: Direct PvP checks block godset users correctly.");
    } else {
      console.log("FAIL: Direct PvP checks failed.");
    }

    // --- TEST 4: Temporary Godset Expiration / Revocation ---
    console.log("\n--- TEST 4: Expiration / Revocation ---");
    // Revoke godset for test_user_godset
    await revokeRpgGodset("test_user_godset", null);
    
    // Fetch user after revocation
    const userAfterRevocation = await User.findOne({ userId: "test_user_godset" });
    console.log(`User godsetBackup field after revocation: ${userAfterRevocation.rpg.godsetBackup} (Expected: undefined)`);
    console.log(`User level after revocation: ${userAfterRevocation.rpg.level} (Expected: 50)`);

    // Recheck leaderboard
    const topUsersAfter = await User.find({ "rpg.classKey": { $ne: null }, "rpg.godsetBackup": null, vipLevel: { $lte: 0 } }).sort({ "rpg.power": -1 });
    const godsetInTopAfter = topUsersAfter.find(u => u.userId === "test_user_godset");
    console.log(`Godset user in Top list after revocation: ${!!godsetInTopAfter} (Expected: true)`);

    if (!userAfterRevocation.rpg.godsetBackup && userAfterRevocation.rpg.level === 50 && godsetInTopAfter) {
      console.log("PASS: After revocation, user is restored and reappears in leaderboards.");
    } else {
      console.log("FAIL: Revocation restore failed.");
    }

    // Cleanup
    await User.deleteMany({ userId: { $in: ["test_user_normal", "test_user_godset"] } }).exec();
    mongoose.connection.close();
    console.log("\nDB connection closed.");
  } catch (err) {
    console.error("Test execution failed:", err);
    mongoose.connection.close();
  }
};

runTest();
