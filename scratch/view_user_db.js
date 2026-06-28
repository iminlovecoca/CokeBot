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
      console.log(`User: ${u.userId} | Name: ${u.rpg.name || 'N/A'}`);
      console.log("RPG Object:", JSON.stringify(u.rpg, null, 2));
      console.log("--------------------------------------");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkUser();
