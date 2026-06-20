const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Item = require("../models/cokemon/Item");
const User = require("../models/User");

const runCleanup = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB.");

    // 1. Delete cristal-10 item from the database
    const deleteResult = await Item.deleteOne({ item_id: "cristal-10" }).exec();
    console.log(`Deleted cristal-10 item from DB:`, deleteResult);

    // 2. Convert cristal-10 in user inventories to cristal-9
    const users = await User.find({ "inventory.cristal-10": { $gt: 0 } }).exec();
    console.log(`Found ${users.length} users with cristal-10 in inventory.`);
    for (const user of users) {
      if (user.inventory) {
        const qty10 = user.inventory.get("cristal-10") || 0;
        const qty9 = user.inventory.get("cristal-9") || 0;
        user.inventory.set("cristal-9", qty9 + qty10);
        user.inventory.delete("cristal-10");
        user.markModified("inventory");
        await user.save();
        console.log(`Converted ${qty10} cristal-10 to cristal-9 for user ${user.userId} (${user.username})`);
      }
    }

    // 3. Force trigger seedUpgradeStones to ensure cristal-9 name is updated in DB
    const { seedUpgradeStones } = require("../utils/rpgUtil");
    const mockClient = { allItems: [] };
    await seedUpgradeStones(mockClient);
    console.log("Re-seeded upgrade stones successfully.");

    mongoose.connection.close();
    console.log("DB connection closed.");
  } catch (error) {
    console.error("Cleanup failed:", error);
    mongoose.connection.close();
  }
};

runCleanup();
