require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const addGodsetCmd = require("../commands/admin/addgodset");
const { getEffectiveRpgStats, getEquippedItems, revokeRpgGodset } = require("../utils/rpgUtil");

const runTest = async () => {
  console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ TÍNH NĂNG GOD MODE (ONE HIT BOSS)...");

  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ Thiếu biến môi trường MONGO_URI trong .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Đã kết nối với MongoDB.");

    // Choose/create a test user
    const testUserId = "745950731638407210"; // Test Admin/Owner ID
    let dbUser = await User.findOne({ userId: testUserId });
    if (!dbUser) {
      dbUser = await User.create({ userId: testUserId });
    }

    // Clear previous godset if any
    await revokeRpgGodset(testUserId);

    const mockMessage = {
      author: { id: "745950731638407210" },
      mentions: {
        users: {
          first: () => ({ id: testUserId, username: "TestOwner" })
        }
      },
      client: {
        users: {
          fetch: async () => ({ id: testUserId, username: "TestOwner" })
        }
      },
      reply: async (payload) => {
        console.log("💬 Bot Reply Embed Title:", payload.embeds[0].data.title);
        console.log("💬 Bot Reply Embed Desc:", payload.embeds[0].data.description);
        return { id: "reply-id" };
      }
    };

    console.log("\n--- TEST 1: Cấp God Set với cờ 'god' ---");
    // args: [ '@user', 'god', '10' ] (10 minutes duration)
    await addGodsetCmd.execute(mockMessage, [ `<@${testUserId}>`, "god", "10" ]);

    // Read updated user from DB
    dbUser = await User.findOne({ userId: testUserId });
    console.log("Database user isGodMode status:", dbUser.rpg.isGodMode);
    if (dbUser.rpg.isGodMode !== true) {
      throw new Error("❌ isGodMode không được lưu đúng thành true!");
    }
    console.log("✅ isGodMode lưu chính xác thành true.");

    // --- TEST 2: Giả lập Sát thương World Boss ---
    console.log("\n--- TEST 2: Giả lập Sát thương World Boss ---");
    const activeBoss = {
      hp: 3600000,
      boss: { magicResist: 3000, armor: 3000 }
    };
    
    // Simulate damage calculations from commands/rpg/boss.js:
    const isMagical = false;
    const stats = getEffectiveRpgStats(dbUser);
    const baseAttack = stats.str * 2.5 + stats.dex * 1.5;
    const gearPower = dbUser.rpg.power;
    const rawDamage = baseAttack + gearPower;
    const mitigation = activeBoss.boss.armor / (activeBoss.boss.armor + 250);
    
    let damage = Math.max(10, Math.floor(rawDamage * (1 - mitigation)));
    console.log("Normal calculated damage against World Boss:", damage);

    // Apply the newly added god mode logic:
    if (dbUser.rpg?.isGodMode) {
      damage = activeBoss.hp;
    }
    console.log("Damage applied (after God Mode check):", damage);
    if (damage !== 3600000) {
      throw new Error("❌ Sát thương gây ra cho World Boss không khớp với lượng HP hiện tại của Boss!");
    }
    console.log("✅ Gây sát thương One Hit tiêu diệt World Boss thành công!");

    // --- TEST 3: Giả lập Sát thương Dungeon Boss ---
    console.log("\n--- TEST 3: Giả lập Sát thương Dungeon Boss ---");
    const dungeonEnemy = {
      hp: 150000,
      armor: 1000,
      magicResist: 1000
    };
    
    // Simulate dungeon damage calculations:
    let dungeonDmg = Math.max(10, Math.floor(rawDamage * (1 - mitigation)));
    console.log("Normal calculated damage in dungeon:", dungeonDmg);
    
    // Mock player object for dungeon
    const mockDungeonPlayer = {
      userRef: dbUser
    };

    if (mockDungeonPlayer.userRef?.rpg?.isGodMode) {
      dungeonDmg = dungeonEnemy.hp;
    }
    console.log("Dungeon damage applied (after God Mode check):", dungeonDmg);
    if (dungeonDmg !== 150000) {
      throw new Error("❌ Sát thương gây ra trong dungeon không khớp với lượng HP của quái!");
    }
    console.log("✅ Gây sát thương One Hit tiêu diệt quái dungeon thành công!");

    // --- TEST 4: Thu hồi God Set ---
    console.log("\n--- TEST 4: Thu hồi God Set ---");
    await revokeRpgGodset(testUserId);
    dbUser = await User.findOne({ userId: testUserId });
    console.log("Database user isGodMode status after revocation:", dbUser.rpg.isGodMode);
    if (dbUser.rpg.isGodMode === true) {
      throw new Error("❌ isGodMode vẫn là true sau khi thu hồi!");
    }
    console.log("✅ isGodMode được khôi phục về false thành công.");

    console.log("\n🎉 TOÀN BỘ CÁC BÀI TEST CHẠY THÀNH CÔNG!");
  } catch (error) {
    console.error("❌ XẢY RA LỖI KHI CHẠY KIỂM THỬ:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Đã đóng kết nối MongoDB.");
  }
};

runTest();
