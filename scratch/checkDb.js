const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const SpawnedBoss = require("../models/SpawnedBoss");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test");
  console.log("Connected to MongoDB");
  
  const bosses = await SpawnedBoss.find().sort({ createdAt: -1 }).limit(5);
  for (const b of bosses) {
    console.log(`Boss: ${b.boss.name} (${b.bossId})`);
    console.log(`  Defeated: ${b.defeated}`);
    console.log(`  ImageUrl: ${b.imageUrl}`);
    console.log(`  MessageIds: ${JSON.stringify(b.messageIds)}`);
    console.log(`  MessageId: ${b.messageId}`);
    console.log("------------------------");
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
