require("dotenv").config();
const mongoose = require("mongoose");
const TaixiuState = require("../models/TaixiuState");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const rooms = await TaixiuState.find({});
  console.log(`Found ${rooms.length} room(s):`);
  for (const r of rooms) {
    console.log(`- Channel: ${r.channelId}, Msg: ${r.messageId}, Round: ${r.round}, Status: ${r.status}`);
  }

  mongoose.connection.close();
}

run().catch(console.error);
