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

    const ids = [3539, 432, 4462];
    for (const id of ids) {
      const user = await User.findOne({ "rpg.items.id": id }).exec();
      if (user) {
        const item = user.rpg.items.find(i => i.id === id);
        console.log(`Item ID: ${id}`);
        console.log(JSON.stringify(item, null, 2));
        console.log("------------------------");
      } else {
        console.log(`Item ID: ${id} not found`);
        console.log("------------------------");
      }
    }
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
};

run();
