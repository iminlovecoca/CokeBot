const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const config = require("../data/config");
const { calculateRpgPower, getGearDisplayName, generateGearStats, getItemImageFile } = require("../utils/rpgUtil");

const maxVarianceByRarity = {
  Common: 1,
  Rare: 1,
  Epic: 2,
  Legendary: 3,
  Mythic: 4,
  Ancient: 5,
  Divine: 7
};

const runSync = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    console.log("Connecting to database...", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const users = await User.find({ "rpg.classKey": { $ne: null } }).exec();
    console.log(`Found ${users.length} users with RPG characters.`);

    let updatedUsersCount = 0;
    let updatedGearsCount = 0;

    for (const user of users) {
      if (!user.rpg || !user.rpg.items) continue;

      let modified = false;
      const items = user.rpg.items;

      for (const item of items) {
        let gearModified = false;
        
        // 1. Convert Crystal Necklace to Mage Necklace
        const subNameLower = String(item.subType || "").toLowerCase();
        if (item.slot === "necklace" && (subNameLower.includes("crystal") || subNameLower.includes("cristal"))) {
          item.subType = "Mage Necklace";
          item.emoji = "<:mageneck:1517491429478367252>";
          item.imageKey = "Necklace/mageneck.png";
          item.name = getGearDisplayName(item);
          gearModified = true;
        }

        const rarity = item.rarity || "Common";
        const rarityConfig = config.rpg.gear_rarities[rarity];
        if (!rarityConfig) continue;

        const level = 1;
        if (item.level !== level) {
          item.level = level;
          gearModified = true;
        }
        const levelBonus = Math.floor(level * 4.5);

        // 2. Reconstruct variance from quality
        const quality = item.quality || 50;
        const variance = 0.9 + 0.2 * ((quality - 10) / 90);

        // 3. Recalculate power
        const newBasePower = Math.floor((rarityConfig.power + levelBonus) * variance);
        if (item.power !== newBasePower) {
          item.power = newBasePower;
          gearModified = true;
        }

        // 4. Recalculate sellPrice
        const newSellPrice = Math.floor((rarityConfig.sell + level * 18) * variance);
        if (item.sellPrice !== newSellPrice) {
          item.sellPrice = newSellPrice;
          gearModified = true;
        }

        // 5. Recalculate stats using fixed + random slot rules (preventing overlaps)
        const newStats = generateGearStats(item.slot, rarity, quality, item.subType || item.subtype || "");
        if (JSON.stringify(item.stats) !== JSON.stringify(newStats)) {
          item.stats = newStats;
          gearModified = true;
        }

        // 6. Recalculate imageKey to ensure correct asset path resolution
        const newImg = getItemImageFile(item);
        if (newImg && item.imageKey !== newImg) {
          item.imageKey = newImg;
          gearModified = true;
        }

        if (gearModified) {
          // Re-generate name to match new stats / subtype changes if any
          item.name = getGearDisplayName(item);
          updatedGearsCount++;
          modified = true;
        }
      }

      if (modified) {
        user.rpg.power = calculateRpgPower(user);
        user.markModified("rpg");
        await user.save();
        updatedUsersCount++;
      }
    }

    console.log(`\n🎉 Gear Synchronization Completed!`);
    console.log(`- Synchronized ${updatedGearsCount} gears across ${updatedUsersCount} users.`);
    
    await mongoose.connection.close();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runSync();
