const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const { isDungeonWeapon, getGearDisplayName, calculateRpgPower } = require("../utils/rpgUtil");

const testSetupgrade = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    await User.deleteMany({ userId: "test_setupgrade_user" }).exec();

    // Create a mock user with a normal weapon and a dungeon weapon in their inventory
    const user = await User.create({
      userId: "test_setupgrade_user",
      username: "UpgradeTester",
      coke: 1000,
      rpg: {
        classKey: "warrior",
        level: 50,
        exp: 0,
        rank: "Veteran",
        items: [
          { id: 10, slot: "weapon", subType: "Longsword", rarity: "Common", power: 100, upgradeLevel: 0 },
          { id: 20, slot: "weapon", subType: "Fire Sword", rarity: "Ancient", power: 800, upgradeLevel: 0 },
          { id: 30, slot: "armor", subType: "Heavy Armor", rarity: "Epic", power: 300 }
        ],
        equipped: { weapon: 10 },
        stats: { vigor: 50, str: 30, dex: 30, int: 0, arc: 0 },
        power: 5000
      }
    });

    console.log("Mock User created.");

    // Helper to simulate the logic inside setupgrade.js
    const simulateUpgrade = (user, itemId, targetLevel) => {
      const items = user.rpg.items || [];
      const itemIndex = items.findIndex(it => it.id === itemId);
      if (itemIndex === -1) return "NOT_FOUND";

      const item = items[itemIndex];
      if (item.slot !== "weapon") return "NOT_WEAPON";

      const isSpecial = isDungeonWeapon(item);
      const maxLevel = isSpecial ? 10 : 25;

      if (targetLevel > maxLevel) {
        return `EXCEED_LIMIT_${maxLevel}`;
      }

      item.upgradeLevel = targetLevel;
      item.name = getGearDisplayName(item);
      user.markModified("rpg");
      user.rpg.power = calculateRpgPower(user);
      return "SUCCESS";
    };

    console.log("\n--- TEST 1: Upgrade Normal Weapon up to +25 ---");
    console.log(`Normal weapon: ${user.rpg.items[0].subType}`);
    const r1 = simulateUpgrade(user, 10, 15);
    console.log(`Upgrade normal to +15: ${r1} (Expected: SUCCESS), current level: ${user.rpg.items[0].upgradeLevel}`);
    const r2 = simulateUpgrade(user, 10, 25);
    console.log(`Upgrade normal to +25: ${r2} (Expected: SUCCESS), current level: ${user.rpg.items[0].upgradeLevel}`);
    const r3 = simulateUpgrade(user, 10, 26);
    console.log(`Upgrade normal to +26: ${r3} (Expected: EXCEED_LIMIT_25)`);

    console.log("\n--- TEST 2: Upgrade Special Weapon up to +10 ---");
    console.log(`Special weapon: ${user.rpg.items[1].subType}`);
    const r4 = simulateUpgrade(user, 20, 5);
    console.log(`Upgrade special to +5: ${r4} (Expected: SUCCESS), current level: ${user.rpg.items[1].upgradeLevel}`);
    const r5 = simulateUpgrade(user, 20, 10);
    console.log(`Upgrade special to +10: ${r5} (Expected: SUCCESS), current level: ${user.rpg.items[1].upgradeLevel}`);
    const r6 = simulateUpgrade(user, 20, 11);
    console.log(`Upgrade special to +11: ${r6} (Expected: EXCEED_LIMIT_10)`);

    console.log("\n--- TEST 3: Attempt to upgrade non-weapon slot ---");
    const r7 = simulateUpgrade(user, 30, 5);
    console.log(`Upgrade armor slot: ${r7} (Expected: NOT_WEAPON)`);

    if (
      r1 === "SUCCESS" && r2 === "SUCCESS" && r3 === "EXCEED_LIMIT_25" &&
      r4 === "SUCCESS" && r5 === "SUCCESS" && r6 === "EXCEED_LIMIT_10" &&
      r7 === "NOT_WEAPON"
    ) {
      console.log("\nPASS: setupgrade logic verification passed successfully!");
    } else {
      console.log("\nFAIL: setupgrade logic verification failed.");
    }

    await User.deleteMany({ userId: "test_setupgrade_user" }).exec();
    mongoose.connection.close();
    console.log("\nDB connection closed.");
  } catch (err) {
    console.error("Test execution failed:", err);
    mongoose.connection.close();
  }
};

testSetupgrade();
