const mongoose = require("mongoose");
const { useItem } = require("../utils/userUtil");

const runVerifyUse = async () => {
  console.log("🧪 ĐANG KIỂM TRA LỆNH SỬ DỤNG VẬT PHẨM SỰ KIỆN...");
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://127.0.0.1:27017/test");
    }

    const mockClient = {
      allItems: [
        { item_id: "souls", name: "Linh Hồn", item_type: "key_item", price: null },
        { item_id: "hexpiece", name: "Mảnh Vũ Khí Hex", item_type: "key_item", price: null }
      ]
    };

    const mockUser = {
      id: "123456",
      username: "MockUser"
    };

    try {
      await useItem(mockClient, mockUser, "mock_channel", "souls", null, 1);
    } catch (err) {
      console.log("✅ Kết quả khi dùng souls:");
      console.log(err.message);
      if (!err.message.includes("Cửa Hàng Sự Kiện Hex")) {
        throw new Error("❌ Không hiển thị đúng thông báo hướng dẫn cho souls!");
      }
    }

    try {
      await useItem(mockClient, mockUser, "mock_channel", "hexpiece", null, 1);
    } catch (err) {
      console.log("✅ Kết quả khi dùng hexpiece:");
      console.log(err.message);
      if (!err.message.includes("Cửa Hàng Sự Kiện Hex")) {
        throw new Error("❌ Không hiển thị đúng thông báo hướng dẫn cho hexpiece!");
      }
    }

    console.log("🎉 XÁC MINH SỬ DỤNG VẬT PHẨM HOÀN TẤT VÀ THÀNH CÔNG!");
  } catch (err) {
    console.error("❌ Lỗi xác minh sử dụng:", err);
  } finally {
    await mongoose.connection.close();
  }
};

runVerifyUse();
