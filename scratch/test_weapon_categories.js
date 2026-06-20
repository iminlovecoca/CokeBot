const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const { 
  generateRpgGearDrop, 
  isDungeonWeapon, 
  getEquippedItems,
  getGearDisplayName,
  getEffectiveRpgStats,
  getWeaponPower
} = require("../utils/rpgUtil");
const User = require("../models/User");
const config = require("../data/config");

const runTest = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    // Clean up old test user
    await User.deleteMany({ userId: "test_weapon_cat_user" }).exec();

    // Create a mock user
    const user = await User.create({
      userId: "test_weapon_cat_user",
      username: "WeaponTester",
      coke: 500000,
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

    console.log("Mock User created.");

    console.log("\n--- TEST CASE 1: Event Weapon Restrictions ---");
    try {
      await generateRpgGearDrop(user, {
        forceDrop: true,
        slot: "weapon",
        subType: "riverofblood",
      });
      console.log("FAIL: Generated riverofblood without Event/Admin privileges!");
    } catch (err) {
      console.log("PASS: Blocked riverofblood generation as expected. Error:", err.message);
    }

    try {
      const gear = await generateRpgGearDrop(user, {
        forceDrop: true,
        slot: "weapon",
        subType: "duskanddawn",
        fromEvent: true,
      });
      console.log(`PASS: Generated event weapon duskanddawn using fromEvent. Rarity: ${gear.rarity} (Expected: Ancient), SubType: ${gear.subType}`);
    } catch (err) {
      console.log("FAIL: Failed to generate duskanddawn with fromEvent flag:", err.message);
    }

    console.log("\n--- TEST CASE 2: Dungeon Weapon Restrictions ---");
    try {
      await generateRpgGearDrop(user, {
        forceDrop: true,
        slot: "weapon",
        subType: "firesword",
      });
      console.log("FAIL: Generated firesword without Dungeon/Admin privileges!");
    } catch (err) {
      console.log("PASS: Blocked firesword generation as expected. Error:", err.message);
    }

    try {
      const gear = await generateRpgGearDrop(user, {
        forceDrop: true,
        slot: "weapon",
        subType: "firesword",
        fromDungeon: true,
      });
      console.log(`PASS: Generated dungeon weapon firesword using fromDungeon. Rarity: ${gear.rarity} (Expected: Ancient), SubType: ${gear.subType}`);
    } catch (err) {
      console.log("FAIL: Failed to generate firesword with fromDungeon flag:", err.message);
    }

    console.log("\n--- TEST CASE 3: Normal Weapon Generation (No constraints) ---");
    try {
      const gear = await generateRpgGearDrop(user, {
        forceDrop: true,
        slot: "weapon",
        subType: "longsword",
      });
      console.log(`PASS: Generated normal weapon longsword without flags. Rarity: ${gear.rarity}, SubType: ${gear.subType}`);
    } catch (err) {
      console.log("FAIL: Failed to generate normal weapon:", err.message);
    }

    console.log("\n--- TEST CASE 4: Admin Bypass and Rarity Override ---");
    try {
      const gear = await generateRpgGearDrop(user, {
        forceDrop: true,
        slot: "weapon",
        subType: "riverofblood",
        rarity: "Divine",
        fromAdmin: true,
      });
      console.log(`PASS: Admin generated riverofblood with Divine override. Rarity: ${gear.rarity} (Expected: Divine), SubType: ${gear.subType}`);
    } catch (err) {
      console.log("FAIL: Admin failed to generate riverofblood:", err.message);
    }

    console.log("\n--- TEST CASE 5: Upgrade Stones Verification ---");
    const testNormal = { slot: "weapon", subType: "longsword" };
    const testDungeon = { slot: "weapon", subType: "firesword" };
    const testEvent = { slot: "weapon", subType: "riverofblood" };

    console.log(`longsword - isDungeonWeapon: ${isDungeonWeapon(testNormal)} (Expected: false)`);
    console.log(`firesword - isDungeonWeapon: ${isDungeonWeapon(testDungeon)} (Expected: true)`);
    console.log(`riverofblood - isDungeonWeapon: ${isDungeonWeapon(testEvent)} (Expected: true)`);

    console.log("\n--- TEST CASE 6: Class Command ID Display Rendering ---");
    // Equip some mock gear to user
    const gearW = { id: 101, slot: "weapon", subType: "Hỏa Long Thần Kiếm", rarity: "Ancient", power: 1200, upgradeLevel: 5 };
    const gearA = { id: 202, slot: "armor", subType: "Heavy Armor", rarity: "Epic", power: 450, upgradeLevel: 0 };
    user.rpg.items = [gearW, gearA];
    user.rpg.equipped = { weapon: 101, armor: 202 };
    
    // Simulate class.js rendering of equipLines
    const equippedItems = getEquippedItems(user);
    const slots = ["weapon", "armor", "helmet", "boots", "ring", "necklace"];
    const equipLines = slots.map((slot) => {
      const slotName = config.rpg.gear_slot_names[slot] || slot;
      const item = equippedItems[slot];
      if (item) {
        const ownerStats = getEffectiveRpgStats(user);
        const finalPower = item.slot === "weapon" ? getWeaponPower(item, ownerStats) : item.power;
        return `• ${slotName}: \`G${item.id}\` **${getGearDisplayName(item)}** (+${finalPower.toLocaleString()} Lực chiến)`;
      } else {
        return `• ${slotName}: ❎`;
      }
    }).join("\n");

    console.log("Equipped gear lines:\n" + equipLines);
    if (equipLines.includes("`G101`") && equipLines.includes("`G202`")) {
      console.log("PASS: Equip lines rendered correctly with G[ID] prefixes.");
    } else {
      console.log("FAIL: Missing G[ID] prefixes in equip lines.");
    }

    // Clean up
    await User.deleteMany({ userId: "test_weapon_cat_user" }).exec();
    mongoose.connection.close();
    console.log("\nDB connection closed.");
  } catch (err) {
    console.error("Test execution failed:", err);
    mongoose.connection.close();
  }
};

runTest();
