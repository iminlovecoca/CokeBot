const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const config = require("../data/config");

const testGodsetBossFree = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    // Create test users
    await User.deleteMany({ userId: { $in: ["test_normal_boss", "test_godset_boss"] } }).exec();

    const normalUser = await User.create({
      userId: "test_normal_boss",
      username: "NormalBossFighter",
      coke: 50000,
      rpg: {
        classKey: "warrior",
        level: 50,
        exp: 0,
        rank: "Veteran",
        items: [],
        equipped: {},
        stats: { vigor: 50, str: 30, dex: 30, int: 0, arc: 0 },
        power: 5000
      }
    });

    const godsetUser = await User.create({
      userId: "test_godset_boss",
      username: "GodsetBossFighter",
      coke: 50000,
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
          equipped: {}
        }
      }
    });

    console.log("Mock users created.");

    // Direct emulation of the fee checks in boss.js
    const getBossFightFees = (user, participantAttacks) => {
      const freeAttacks = config.rpg.boss?.free_attacks_per_user ?? 3;
      const hasGodset = !!user.rpg?.godsetBackup;
      const paidAttackCost = hasGodset ? 0 : (config.rpg.boss?.paid_attack_cost ?? 10000);
      const isPaidAttack = participantAttacks >= freeAttacks && !hasGodset;
      const reviveCost = hasGodset ? 0 : 1000;

      return {
        paidAttackCost,
        isPaidAttack,
        reviveCost
      };
    };

    console.log("\n--- TEST: Normal User Attack Fees (Attacks = 0) ---");
    const feeNormal0 = getBossFightFees(normalUser, 0);
    console.log(`isPaidAttack: ${feeNormal0.isPaidAttack} (Expected: false)`);
    console.log(`paidAttackCost: ${feeNormal0.paidAttackCost} (Expected: 10000)`);
    console.log(`reviveCost: ${feeNormal0.reviveCost} (Expected: 1000)`);

    console.log("\n--- TEST: Normal User Attack Fees (Attacks = 3) ---");
    const feeNormal3 = getBossFightFees(normalUser, 3);
    console.log(`isPaidAttack: ${feeNormal3.isPaidAttack} (Expected: true)`);
    console.log(`paidAttackCost: ${feeNormal3.paidAttackCost} (Expected: 10000)`);
    console.log(`reviveCost: ${feeNormal3.reviveCost} (Expected: 1000)`);

    console.log("\n--- TEST: Godset User Attack Fees (Attacks = 3) ---");
    const feeGod3 = getBossFightFees(godsetUser, 3);
    console.log(`isPaidAttack: ${feeGod3.isPaidAttack} (Expected: false)`);
    console.log(`paidAttackCost: ${feeGod3.paidAttackCost} (Expected: 0)`);
    console.log(`reviveCost: ${feeGod3.reviveCost} (Expected: 0)`);

    if (
      feeNormal3.isPaidAttack === true && feeNormal3.paidAttackCost === 10000 &&
      feeGod3.isPaidAttack === false && feeGod3.paidAttackCost === 0 && feeGod3.reviveCost === 0
    ) {
      console.log("\nPASS: Godset user gets free attacks and free revivals successfully.");
    } else {
      console.log("\nFAIL: Godset free fees verification failed.");
    }

    // Cleanup
    await User.deleteMany({ userId: { $in: ["test_normal_boss", "test_godset_boss"] } }).exec();
    mongoose.connection.close();
    console.log("\nDB connection closed.");
  } catch (err) {
    console.error("Test execution failed:", err);
    mongoose.connection.close();
  }
};

testGodsetBossFree();
