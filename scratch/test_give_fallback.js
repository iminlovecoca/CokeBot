require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { giveCmd } = require("../utils/userUtil");

const runTest = async () => {
  console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ GIAO DỊCH CHUYỂN COKE (XGIVE)...");

  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ Thiếu biến môi trường MONGO_URI trong .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Đã kết nối với MongoDB.");

    // Setup two test users
    const senderId = "test_sender_123";
    const receiverId = "test_receiver_456";

    // Clean up and create/init users
    await User.deleteMany({ userId: { $in: [senderId, receiverId] } });
    
    const sender = await User.create({ userId: senderId, coke: 50000 });
    const receiver = await User.create({ userId: receiverId, coke: 10000 });

    console.log(`Trước giao dịch:`);
    console.log(`  • Sender (${senderId}) Coke: ${sender.coke}`);
    console.log(`  • Receiver (${receiverId}) Coke: ${receiver.coke}`);

    const vnNow = new Date();
    const dateKey = `${vnNow.getFullYear()}-${vnNow.getMonth() + 1}-${vnNow.getDate()}`;
    const amountToTransfer = 15000;

    console.log(`\nTiến hành chuyển ${amountToTransfer} Coke...`);
    const success = await giveCmd(senderId, receiverId, amountToTransfer, vnNow, dateKey);

    if (success) {
      console.log("✅ giveCmd trả về kết quả thành công!");
    } else {
      throw new Error("❌ giveCmd trả về kết quả thất bại!");
    }

    // Read updated balances
    const updatedSender = await User.findOne({ userId: senderId });
    const updatedReceiver = await User.findOne({ userId: receiverId });

    console.log(`\nSau giao dịch:`);
    console.log(`  • Sender (${senderId}) Coke: ${updatedSender.coke}`);
    console.log(`  • Receiver (${receiverId}) Coke: ${updatedReceiver.coke}`);

    if (updatedSender.coke !== 35000) {
      throw new Error(`❌ Số dư người gửi không khớp! Kì vọng: 35000, Thực tế: ${updatedSender.coke}`);
    }
    if (updatedReceiver.coke !== 25000) {
      throw new Error(`❌ Số dư người nhận không khớp! Kì vọng: 25000, Thực tế: ${updatedReceiver.coke}`);
    }

    console.log("\n🎉 GIAO DỊCH XGIVE CHẠY VÀ CẬP NHẬT SỐ DƯ THÀNH CÔNG TRÊN MONGO CHẾ ĐỘ ĐỘC LẬP!");

    // Clean up test users
    await User.deleteMany({ userId: { $in: [senderId, receiverId] } });

  } catch (error) {
    console.error("❌ XẢY RA LỖI KHI CHẠY KIỂM THỬ:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Đã đóng kết nối MongoDB.");
  }
};

runTest();
