const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function cleanup() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    // Query for mock users
    const mockPatterns = [
      { userId: /^test_/ },
      { userId: /^mock_/ },
      { userId: /^sim_/ },
      { userId: "99999999999999999" },
      { username: /^Mock/ },
      { username: /^test_/ }
    ];

    const mockUsers = await User.find({ $or: mockPatterns }).exec();
    console.log(`Found ${mockUsers.length} mock/test users in database.`);

    for (const u of mockUsers) {
      console.log(`- Deleting User ID: ${u.userId} | Username: ${u.username}`);
    }

    if (mockUsers.length > 0) {
      const deleteResult = await User.deleteMany({ $or: mockPatterns }).exec();
      console.log(`Successfully deleted ${deleteResult.deletedCount} mock/test users.`);
    } else {
      console.log("No mock users to delete.");
    }

    await mongoose.disconnect();
    console.log("Disconnected from DB.");
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}

cleanup();
