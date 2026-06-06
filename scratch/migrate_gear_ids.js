const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

const compareStats = (s1 = {}, s2 = {}) => {
  const keys1 = Object.keys(s1).sort();
  const keys2 = Object.keys(s2).sort();
  if (keys1.length !== keys2.length) return false;
  return keys1.every((key) => s1[key] === s2[key]);
};

const runMigration = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    console.log("Connecting to database...", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const users = await User.find({ "rpg.items": { $exists: true } }).exec();
    console.log(`Found ${users.length} users with RPG items.`);

    // Group items by unique properties
    const uniqueGroups = [];
    let nextId = 1;

    // First pass: collect all items and group them
    for (const user of users) {
      if (!user.rpg || !user.rpg.items) continue;

      for (const item of user.rpg.items) {
        // Find existing matching group
        let foundGroup = uniqueGroups.find((group) => {
          return (
            group.name === item.name &&
            group.slot === item.slot &&
            group.rarity === item.rarity &&
            group.level === item.level &&
            group.power === item.power &&
            group.quality === item.quality &&
            group.sellPrice === item.sellPrice &&
            compareStats(group.stats, item.stats)
          );
        });

        if (foundGroup) {
          foundGroup.occurrences.push({ user, item });
        } else {
          uniqueGroups.push({
            id: nextId++,
            name: item.name,
            slot: item.slot,
            rarity: item.rarity,
            level: item.level,
            power: item.power,
            quality: item.quality,
            sellPrice: item.sellPrice,
            stats: item.stats,
            occurrences: [{ user, item }],
          });
        }
      }
    }

    console.log(`Grouped all items into ${uniqueGroups.length} unique gear types.`);

    // Second pass: Update IDs in users' items and equipped slots
    for (const group of uniqueGroups) {
      for (const occurrence of group.occurrences) {
        const { user, item } = occurrence;

        // Save old ID to update equipped references
        const oldId = item.id;
        const newId = group.id;

        // Update item ID
        item.id = newId;

        // Update equipped references if this item was equipped
        if (user.rpg.equipped) {
          for (const slot of Object.keys(user.rpg.equipped)) {
            if (user.rpg.equipped[slot] === oldId) {
              user.rpg.equipped[slot] = newId;
            }
          }
        }
      }
    }

    // Save all users and set their lastItemId to the max ID
    const maxGlobalId = nextId - 1;
    for (const user of users) {
      if (!user.rpg) continue;
      user.rpg.lastItemId = maxGlobalId;
      user.markModified("rpg");
      await user.save();
      console.log(`Updated user ${user.userId} (${user.rpg.name || "No Name"}).`);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

runMigration();
