const mongoose = require("mongoose");
const { runTransactionWithRetry } = require("../utils/miscUtil");

const testTxn = async () => {
  console.log("🧪 ĐANG KIỂM TRA TRANSACTIONS FALLBACK...");
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://127.0.0.1:27017/test");
    }

    const testFunc = async (session) => {
      console.log(`   • Chạy hàm giao dịch, session nhận được: ${session ? "Hợp lệ" : "null (Chế độ độc lập)"}`);
      // Try to find a document
      const dummy = await mongoose.connection.db.collection("items").findOne({}, { session });
      console.log("   • Truy vấn DB thành công!");
    };

    await runTransactionWithRetry(testFunc);
    console.log("🎉 KIỂM TRA TRANSACTIONS FALLBACK HOÀN TẤT VÀ THÀNH CÔNG!");
  } catch (err) {
    console.error("❌ Lỗi kiểm tra transaction:", err);
  } finally {
    await mongoose.connection.close();
  }
};

testTxn();
