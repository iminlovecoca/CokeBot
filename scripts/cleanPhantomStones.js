require('dotenv').config();
const mongoose = require('mongoose');

async function cleanPhantomStones() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MongoDB URI found in environment!');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');
  const User = require('../models/User');

  const users = await User.find({ inventory: { $exists: true } });
  console.log(`Checking ${users.length} users...`);

  let modifiedCount = 0;
  for (const user of users) {
    if (!user.inventory) continue;
    let modified = false;

    if (user.inventory instanceof Map) {
      for (const [k, v] of Array.from(user.inventory.entries())) {
        if (/^(cristal|somber)[-_]?([9]|[1-9]\d+)$/i.test(k)) {
          user.inventory.delete(k);
          modified = true;
          console.log(`User ${user.userId}: removed ${k} (qty: ${v})`);
        }
      }
    } else if (typeof user.inventory === 'object') {
      for (const k of Object.keys(user.inventory)) {
        if (/^(cristal|somber)[-_]?([9]|[1-9]\d+)$/i.test(k)) {
          console.log(`User ${user.userId}: removed ${k} (qty: ${user.inventory[k]})`);
          delete user.inventory[k];
          modified = true;
        }
      }
    }

    if (modified) {
      user.markModified('inventory');
      await user.save();
      modifiedCount++;
    }
  }

  console.log(`Done! Cleaned phantom stones from ${modifiedCount} users.`);
  await mongoose.disconnect();
}

cleanPhantomStones().catch(console.error);
