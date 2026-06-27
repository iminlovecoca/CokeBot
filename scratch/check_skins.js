const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";

async function run() {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  // Get raw collection to bypass Mongoose schema restrictions!
  const db = mongoose.connection.db;
  const usersCollection = db.collection("users");

  const usersWithRootSkins = await usersCollection.find({ ownedSkins: { $exists: true, $ne: [] } }).toArray();
  console.log(`Found ${usersWithRootSkins.length} users with root ownedSkins:`);
  
  for (const user of usersWithRootSkins) {
    console.log(`User ID: ${user.userId}, Root ownedSkins:`, user.ownedSkins);
    
    // Merge them into rpg.ownedSkins
    const currentRpg = user.rpg || {};
    const currentRpgSkins = currentRpg.ownedSkins || [];
    
    // Union arrays
    const mergedSkins = Array.from(new Set([...currentRpgSkins, ...user.ownedSkins]));
    
    console.log(`Merging into rpg.ownedSkins:`, mergedSkins);
    
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { "rpg.ownedSkins": mergedSkins },
        $unset: { ownedSkins: "" } // remove root-level ownedSkins
      }
    );
    console.log(`Updated user ${user.userId} successfully.`);
  }

  // Also let's check what's inside users' rpg.ownedSkins
  const allRpgSkins = await usersCollection.find({ "rpg.ownedSkins": { $exists: true } }).toArray();
  console.log(`Total users with rpg.ownedSkins: ${allRpgSkins.length}`);
  for (const u of allRpgSkins) {
    console.log(`User ${u.userId}:`, u.rpg.ownedSkins);
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

run().catch(console.error);
