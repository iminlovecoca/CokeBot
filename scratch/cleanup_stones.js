require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set in .env file.");
  process.exit(1);
}

async function runCleanup() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected successfully.\n");

    const users = await User.find({}).exec();
    console.log(`🔍 Scanning ${users.length} users for exploited upgrade stones...`);

    let affectedUsersCount = 0;

    for (const user of users) {
      if (!user.inventory || user.inventory.size === 0) continue;

      let hasModifications = false;
      const originalStones = [];
      const cleanedStones = [];

      for (const [itemId, qty] of user.inventory.entries()) {
        const isSomberExploitable = itemId.startsWith("somber-") && parseInt(itemId.split("-")[1], 10) >= 4;
        const isCristalExploitable = itemId.startsWith("cristal-");

        if (isSomberExploitable || isCristalExploitable) {
          // If the quantity is greater than 10, it's considered exploited because boss/dungeon drops are rare and in small amounts.
          if (qty > 10) {
            originalStones.push(`${itemId}: x${qty}`);
            
            // Set to a safe cap (e.g. 1) or delete it. Let's delete/reset it to 0 to discourage exploitation.
            user.inventory.delete(itemId);
            cleanedStones.push(`${itemId}: Reset to 0`);
            hasModifications = true;
          }
        }
      }

      if (hasModifications) {
        affectedUsersCount++;
        user.markModified("inventory");
        await user.save();
        console.log(`👤 User ID: ${user.userId} (${user.rpg?.name || "No RPG Name"})`);
        console.log(`   - Trước: ${originalStones.join(", ")}`);
        console.log(`   - Sau  : ${cleanedStones.join(", ")}`);
        console.log(`-----------------------------------------------`);
      }
    }

    console.log(`\n🎉 HỢP LỆ & HOÀN TẤT DỌN DẸP!`);
    console.log(`   - Tổng số người dùng bị ảnh hưởng và đã xử lý: ${affectedUsersCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Xảy ra lỗi trong quá trình dọn dẹp:", error);
    process.exit(1);
  }
}

runCleanup();
