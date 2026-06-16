const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function checkUser() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);

    // Find the user with username "Coca" or matching the ID
    const users = await User.find({ "rpg.classKey": { $ne: null } }).exec();
    
    for (const u of users) {
      console.log(`User: ${u.userId} | Name: ${u.rpg.name || 'N/A'} | Class: ${u.rpg.classKey} | Level: ${u.rpg.level}`);
      console.log("Godset Backup:", JSON.stringify(u.rpg.godsetBackup));
      
      const nonGodsetItems = (u.rpg.items || []).filter(item => !item.isGodset);
      console.log(`Non-godset items count: ${nonGodsetItems.length}`);
      if (nonGodsetItems.length > 0) {
        console.log("Sample non-godset items:");
        nonGodsetItems.slice(0, 5).forEach(item => {
          console.log(`  - ID: ${item.id} | Name: ${item.name} | Level: ${item.level} | Power: ${item.power}`);
        });
      }
      console.log("--------------------------------------");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUser();
