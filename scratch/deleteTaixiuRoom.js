require("dotenv").config();
const mongoose = require("mongoose");
const TaixiuState = require("../models/TaixiuState");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const channelIdToDelete = "1247800258738655232";
  const result = await TaixiuState.deleteOne({ channelId: channelIdToDelete });
  
  if (result.deletedCount > 0) {
    console.log(`Successfully deleted Tai Xiu room for channel ${channelIdToDelete}`);
  } else {
    console.log(`No Tai Xiu room found for channel ${channelIdToDelete}`);
  }

  mongoose.connection.close();
}

run().catch(console.error);
