const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const HexEventState = require("../models/HexEventState");
const { getWeaponScaling, getWeaponPower } = require("../utils/rpgUtil");

// Mock database connection if needed, otherwise use existing Mongoose connection
const runTests = async () => {
  console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ SỰ KIỆN HEX...");

  try {
    // Connect if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://127.0.0.1:27017/test");
      console.log("🔌 Đã kết nối với MongoDB Test DB.");
    }

    // Test 1: Mongoose HexEventState Model
    console.log("\n--- TEST 1: Khởi tạo/Cập nhật HexEventState ---");
    let state = await HexEventState.findById("hex_event");
    if (!state) {
      state = new HexEventState({ _id: "hex_event" });
    }
    state.active = true;
    state.activatedAt = new Date();
    
    // Calculate Monday expiry
    const timezone = "Asia/Ho_Chi_Minh";
    const now = DateTime.now().setZone(timezone);
    const dayOfWeek = now.weekday;
    let daysToAdd = 0;
    if (dayOfWeek === 1) {
      daysToAdd = 0;
    } else {
      daysToAdd = 8 - dayOfWeek;
    }
    const expiresAt = now.plus({ days: daysToAdd }).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).toJSDate();
    state.expiresAt = expiresAt;
    state.activatedBy = "mock_admin";
    
    await state.save();
    console.log("✅ Lưu HexEventState thành công:");
    console.log(`   • Active: ${state.active}`);
    console.log(`   • ExpiresAt: ${state.expiresAt}`);
    
    const retrieved = await HexEventState.findById("hex_event");
    if (retrieved && retrieved.active === true && retrieved.activatedBy === "mock_admin") {
      console.log("✅ Đọc HexEventState từ DB khớp hoàn toàn!");
    } else {
      throw new Error("❌ Dữ liệu đọc từ DB không khớp!");
    }

    // Test 2: Hex Weapons Custom Scaling
    console.log("\n--- TEST 2: Kiểm tra Scaling và Sức mạnh Vũ khí Hex ---");
    const testItems = [
      {
        name: "Axesnake",
        item: { slot: "weapon", subType: "Axesnake", rarity: "Mythic", power: 1450, upgradeLevel: 0 },
        expectedScaling: { str: "S", dex: "-", int: "-", arc: "-" }
      },
      {
        name: "Sunbow",
        item: { slot: "weapon", subType: "Sunbow", rarity: "Mythic", power: 1450, upgradeLevel: 0 },
        expectedScaling: { str: "-", dex: "S", int: "A", arc: "-" }
      },
      {
        name: "Clawhex",
        item: { slot: "weapon", subType: "Clawhex", rarity: "Mythic", power: 1450, upgradeLevel: 0 },
        expectedScaling: { str: "S", dex: "S", int: "-", arc: "-" }
      },
      {
        name: "Spearhex",
        item: { slot: "weapon", subType: "Spearhex", rarity: "Mythic", power: 1450, upgradeLevel: 0 },
        expectedScaling: { str: "S", dex: "-", int: "-", arc: "S" }
      },
      {
        name: "Shieldhex",
        item: { slot: "weapon", subType: "Shieldhex", rarity: "Mythic", power: 1450, upgradeLevel: 0 },
        expectedScaling: { str: "-", dex: "-", int: "-", arc: "S", pr: "S", mr: "S" }
      }
    ];

    const mockStats = { vigor: 50, str: 60, dex: 40, int: 30, arc: 25, pr: 20, mr: 15 };

    for (const testCase of testItems) {
      const scaling = getWeaponScaling(testCase.item);
      console.log(`• Vũ khí: ${testCase.name}`);
      console.log(`  └ Scaling thực tế: ${JSON.stringify(scaling)}`);
      
      // Match scaling structure
      for (const stat of ["str", "dex", "int", "arc", "pr", "mr"]) {
        if ((testCase.expectedScaling[stat] || "-") !== (scaling[stat] || "-")) {
          throw new Error(`❌ Sai scaling tại thuộc tính ${stat} cho ${testCase.name}. Kì vọng: ${testCase.expectedScaling[stat]}, thực tế: ${scaling[stat]}`);
        }
      }
      
      const calculatedPower = getWeaponPower(testCase.item, mockStats);
      console.log(`  └ Sức mạnh tính toán với stats (str:60, dex:40, int:30, arc:25, pr:20, mr:15): ${calculatedPower}`);
      if (calculatedPower <= 1450) {
        throw new Error(`❌ Lỗi tính toán sức mạnh vũ khí: Lực chiến không được cộng thêm từ scaling!`);
      }
      console.log(`  ✅ Thống kê lực chiến hợp lệ (Power: ${calculatedPower} > Base: 1450)`);
    }

    console.log("\n🎉 TOÀN BỘ CÁC BÀI TEST CHẠY THÀNH CÔNG!");
  } catch (error) {
    console.error("❌ XẢY RA LỖI KHI CHẠY KIỂM THỬ:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Đã đóng kết nối MongoDB.");
  }
};

runTests();
