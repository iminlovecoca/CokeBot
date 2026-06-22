const mongoose = require("mongoose");
const Item = require("../models/cokemon/Item");

const runVerify = async () => {
  console.log("🧪 ĐANG KIỂM TRA SEED VẬT PHẨM SỰ KIỆN...");
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://127.0.0.1:27017/test");
    }

    // Seed/Update souls
    let soulsItem = await Item.findOne({ item_id: "souls" });
    if (!soulsItem) {
      soulsItem = await Item.create({
        item_id: "souls",
        name: "Linh Hồn",
        description: "Linh hồn thu được từ Hexia và Godhexa. Dùng làm tiền tệ để mua vũ khí tại Cửa Hàng Sự Kiện Hex.",
        item_type: "key_item",
        price: null,
        emoji: "<:souls:1518749776538243082>"
      });
      console.log("🟣 Đã seed souls!");
    } else {
      console.log("✅ souls đã tồn tại:", soulsItem.name, soulsItem.emoji);
    }

    // Seed/Update hexpiece
    let pieceItem = await Item.findOne({ item_id: "hexpiece" });
    if (!pieceItem) {
      pieceItem = await Item.create({
        item_id: "hexpiece",
        name: "Mảnh Vũ Khí Hex",
        description: "Mảnh vỡ vũ khí cổ xưa rơi từ Godhexa. Dùng để đổi trang bị Hex tại Cửa Hàng Sự Kiện Hex.",
        item_type: "key_item",
        price: null,
        emoji: "<:piece:1518749774403338433>"
      });
      console.log("🟣 Đã seed hexpiece!");
    } else {
      console.log("✅ hexpiece đã tồn tại:", pieceItem.name, pieceItem.emoji);
    }

    console.log("🎉 XÁC MINH CƠ SỞ DỮ LIỆU THÀNH CÔNG!");
  } catch (err) {
    console.error("❌ Lỗi xác minh:", err);
  } finally {
    await mongoose.connection.close();
  }
};

runVerify();
