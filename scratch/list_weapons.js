const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB");

    const users = await User.find({ "rpg.items.slot": "weapon" }).exec();
    const weaponSubtypes = new Map();

    for (const user of users) {
      if (user.rpg && user.rpg.items) {
        for (const item of user.rpg.items) {
          if (item.slot === "weapon") {
            const key = `${item.subType} | ${item.name}`;
            if (!weaponSubtypes.has(key)) {
              weaponSubtypes.set(key, {
                subType: item.subType,
                name: item.name,
                imageKey: item.imageKey,
                count: 1
              });
            } else {
              weaponSubtypes.get(key).count++;
            }
          }
        }
      }
    }

    console.log("Unique weapons in DB:");
    for (const info of weaponSubtypes.values()) {
      console.log(`- SubType: "${info.subType}" | Name: "${info.name}" | ImageKey: "${info.imageKey}" | Count: ${info.count}`);
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

run();
