const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const { getStartingStats, calculateRpgPower, getRpgRank } = require("../utils/rpgUtil");

async function restore() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);

    // Default to your user ID (745950731638407210)
    const targetUserId = "745950731638407210"; 
    const user = await User.findOne({ userId: targetUserId });
    
    if (!user) {
      console.log(`❌ Không tìm thấy người dùng với ID ${targetUserId} trong cơ sở dữ liệu!`);
      process.exit(1);
    }

    const targetLevel = parseInt(process.argv[2], 10);
    if (isNaN(targetLevel) || targetLevel <= 0) {
      console.log("❌ Vui lòng nhập cấp độ muốn khôi phục!");
      console.log("Ví dụ: node scratch/restore_coca.js 50");
      process.exit(1);
    }

    console.log(`Bắt đầu khôi phục nhân vật ${user.rpg.name || 'Coca'} (ID: ${user.userId})...`);
    
    // 1. Reset level and rank
    user.rpg.level = targetLevel;
    user.rpg.rank = getRpgRank(targetLevel);
    user.rpg.exp = 0;

    // 2. Remove all godset items from inventory
    user.rpg.items = (user.rpg.items || []).filter(item => !item.isGodset);

    // 3. Unequip all slots
    user.rpg.equipped = {};

    // 4. Reset stats to class starting stats (points will be available to reallocate)
    const starting = getStartingStats(user);
    user.rpg.stats = { ...starting };

    // 5. Clear godsetBackup field
    user.rpg.godsetBackup = undefined;

    // 6. Recalculate power
    user.rpg.power = calculateRpgPower(user);

    user.markModified("rpg");
    await user.save();

    console.log(`\n✅ KHÔI PHỤC THÀNH CÔNG!`);
    console.log(`• Tên nhân vật: ${user.rpg.name}`);
    console.log(`• Cấp độ mới: ${user.rpg.level} (Rank: ${user.rpg.rank})`);
    console.log(`• Đã xóa toàn bộ trang bị God Set.`);
    console.log(`• Đã tháo toàn bộ trang bị thường (bạn hãy gõ xgear để mặc lại trang bị của mình).`);
    console.log(`• Điểm chỉ số đã được reset về mặc định của class: ${JSON.stringify(user.rpg.stats)}`);
    console.log(`• Bạn có ${targetLevel - 1} điểm thuộc tính chưa cộng. Hãy dùng lệnh xstat trong Discord để cộng lại chỉ số.`);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Lỗi khi khôi phục:", err);
    process.exit(1);
  }
}

restore();
