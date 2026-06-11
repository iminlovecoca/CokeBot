const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

const runMigration = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    console.log("Connecting to database...", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const users = await User.find({ "rpg.items": { $exists: true } }).exec();
    console.log(`Found ${users.length} users with RPG items.`);

    let nextId = 1;

    for (const user of users) {
      if (!user.rpg || !user.rpg.items || user.rpg.items.length === 0) continue;

      const idMap = new Map(); // maps old item.id -> new unique ID

      for (const item of user.rpg.items) {
        const oldId = item.id;
        const newId = nextId++;
        item.id = newId;
        idMap.set(oldId, newId);
      }

      // Update equipped references if this user had equipped slots
      if (user.rpg.equipped) {
        for (const slot of Object.keys(user.rpg.equipped)) {
          const oldEquippedId = user.rpg.equipped[slot];
          if (oldEquippedId && idMap.has(oldEquippedId)) {
            user.rpg.equipped[slot] = idMap.get(oldEquippedId);
          }
        }
      }
    }

    const maxGlobalId = nextId - 1;
    console.log(`Assigned unique IDs to all items. Max ID: ${maxGlobalId}`);

    for (const user of users) {
      if (!user.rpg) continue;
      user.rpg.lastItemId = maxGlobalId;
      user.markModified("rpg");
      await user.save();
      console.log(`Saved user ${user.userId} (${user.rpg.name || "No Name"}).`);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

runMigration();
