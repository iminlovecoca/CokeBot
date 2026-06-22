require("dotenv").config();
const mongoose = require("mongoose");
const simCommand = require("../commands/admin/sim");

const runTest = async () => {
  console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ GIẢ LẬP WORLD BOSS...");

  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ Thiếu biến môi trường MONGO_URI trong .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Đã kết nối với MongoDB.");

    // Mock client allItems
    const client = {
      allItems: [
        { item_id: "souls", name: "Linh Hồn", emoji: "<:souls:1518749776538243082>" },
        { item_id: "hexpiece", name: "Mảnh Vũ Khí Hex", emoji: "<:piece:1518749774403338433>" }
      ]
    };

    const mockMessage = {
      author: { id: "745950731638407210" }, // Admin user ID (dev)
      client: client,
      channel: {
        id: "test-channel",
        send: async (payload) => {
          console.log("📺 CHANNEL SEND:", JSON.stringify(payload, null, 2));
          return { id: "mock-msg-id" };
        }
      },
      reply: async (payload) => {
        if (typeof payload === "string") {
          console.log("💬 MSG REPLY:", payload);
        } else {
          console.log("💬 MSG REPLY (Embeds):");
          if (payload.embeds) {
            for (const emb of payload.embeds) {
              console.log("  Color:", emb.data.color);
              console.log("  Title:", emb.data.title);
              console.log("  Description:\n", emb.data.description);
              console.log("  Fields:", JSON.stringify(emb.data.fields, null, 2));
            }
          }
        }
        return { id: "mock-reply-id" };
      }
    };

    console.log("\n--- TEST 1: Giả lập Boss Hexia với 30 người chơi ---");
    await simCommand.execute(mockMessage, ["boss", "hexia", "30"]);

    console.log("\n--- TEST 2: Giả lập Boss Godhexa với 30 người chơi ---");
    await simCommand.execute(mockMessage, ["boss", "godhexa", "30"]);

  } catch (error) {
    console.error("❌ XẢY RA LỖI KHI CHẠY GIẢ LẬP:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Đã đóng kết nối MongoDB.");
  }
};

runTest();
