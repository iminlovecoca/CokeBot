require("dotenv").config();
const mongoose = require("mongoose");
const TaixiuState = require("../models/TaixiuState");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const rooms = await TaixiuState.find({});
  console.log(`Found ${rooms.length} room(s):`);
  for (const r of rooms) {
    console.log(`- Channel: ${r.channelId}`);
    console.log(`  Msg: ${r.messageId}`);
    console.log(`  Round: ${r.round}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  taiPool: ${r.taiPool}`);
    console.log(`  xiuPool: ${r.xiuPool}`);
    console.log(`  playersTai:`, JSON.stringify(Object.fromEntries(r.playersTai || new Map())));
    console.log(`  playersXiu:`, JSON.stringify(Object.fromEntries(r.playersXiu || new Map())));
  }

  mongoose.connection.close();
}

run().catch(console.error);
