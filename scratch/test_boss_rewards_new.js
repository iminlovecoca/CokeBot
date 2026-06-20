const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const SpawnedBoss = require("../models/SpawnedBoss");
const User = require("../models/User");
const { finishBoss } = require("../commands/rpg/boss");

const runTest = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cokebot";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    // Clean up old test users
    await User.deleteMany({ userId: { $in: ["test_user_a", "test_user_b", "test_user_c"] } }).exec();

    // Create 3 test users
    const userA = await User.create({
      userId: "test_user_a",
      username: "Top1_LastHit",
      coke: 100000,
      rpg: {
        classKey: "warrior",
        level: 50,
        exp: 0,
        rank: "Veteran",
        items: [],
        equipped: {},
        stats: { vigor: 50, str: 30, dex: 30, int: 0, arc: 0 },
        power: 5000
      }
    });

    const userB = await User.create({
      userId: "test_user_b",
      username: "Top2_Participant",
      coke: 100000,
      rpg: {
        classKey: "mage",
        level: 45,
        exp: 0,
        rank: "Veteran",
        items: [],
        equipped: {},
        stats: { vigor: 40, str: 10, dex: 20, int: 50, arc: 0 },
        power: 4500
      }
    });

    const userC = await User.create({
      userId: "test_user_c",
      username: "Top3_Participant",
      coke: 100000,
      rpg: {
        classKey: "assassin",
        level: 40,
        exp: 0,
        rank: "Veteran",
        items: [],
        equipped: {},
        stats: { vigor: 35, str: 15, dex: 45, int: 10, arc: 0 },
        power: 4000
      }
    });

    console.log("Created 3 test users.");

    // Define mock boss: thuongnhan (Cấp Thượng Nhân)
    const mockBoss = {
      key: "plaxidusax",
      name: "Plaxidusax",
      emoji: "⚡",
      rank: "thuongnhan",
      hp: 120000,
      recommended_power: 22000,
      exp: 40000
    };

    const activeBoss = {
      id: `test-reward-${Date.now()}`,
      channelId: "test-channel-rewards",
      boss: mockBoss,
      hp: 0,
      maxHp: mockBoss.hp,
      participants: new Map([
        ["test_user_a", { damage: 60000, attacks: 6, lastAttackAt: Date.now(), hp: 1000, koUntil: 0 }],
        ["test_user_b", { damage: 40000, attacks: 4, lastAttackAt: Date.now(), hp: 800, koUntil: 0 }],
        ["test_user_c", { damage: 20000, attacks: 2, lastAttackAt: Date.now(), hp: 700, koUntil: 0 }]
      ]),
      lastHitUserId: "test_user_a", // User A gets Last Hit
      defeated: true,
      rewarded: false,
      messageId: "99999",
      messageIds: ["99999"]
    };

    // Save boss state to DB
    const dbBoss = await SpawnedBoss.create({
      bossId: activeBoss.id,
      channelId: activeBoss.channelId,
      boss: activeBoss.boss,
      hp: activeBoss.hp,
      maxHp: activeBoss.maxHp,
      defeated: true,
      rewarded: false,
      participants: {
        "test_user_a": activeBoss.participants.get("test_user_a"),
        "test_user_b": activeBoss.participants.get("test_user_b"),
        "test_user_c": activeBoss.participants.get("test_user_c")
      },
      lastHitUserId: activeBoss.lastHitUserId,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + 600000,
      messageId: activeBoss.messageId,
      messageIds: activeBoss.messageIds
    });
    activeBoss.dbId = dbBoss._id;

    console.log("Mock Boss created in DB.");

    // Mock client and channel
    const mockChannel = {
      id: "test-channel-rewards",
      send: async (payload) => {
        console.log("\n[Channel Message Sent]:");
        if (payload.embeds) {
          const emb = payload.embeds[0];
          console.log(`Title: ${emb.data.title}`);
          console.log(`Description:\n${emb.data.description}`);
          if (emb.data.footer) console.log(`Footer: ${emb.data.footer.text}`);
        }
      },
      messages: {
        fetch: async () => ({
          edit: async (payload) => {
            console.log(`[Boss Message Edited]: Defeated State updated`);
          }
        })
      }
    };

    const mockClient = {
      rpgBosses: new Map([[activeBoss.channelId, activeBoss]]),
      users: {
        fetch: async (id) => {
          const names = {
            test_user_a: "Top1_LastHit",
            test_user_b: "Top2_Participant",
            test_user_c: "Top3_Participant"
          };
          return {
            id,
            username: names[id],
            displayName: names[id],
            send: async (payload) => {
              console.log(`\n[DM sent to ${names[id]}]:`);
              const emb = payload.embeds[0];
              console.log(`Title: ${emb.data.title}`);
              console.log(`Description: ${emb.data.description}`);
              emb.data.fields.forEach(f => {
                console.log(`Field - ${f.name}:\n${f.value}`);
              });
            }
          };
        }
      },
      allItems: [
        { item_id: "somber-7", name: "Somber Smithing Stone [7]", emoji: "💎" },
        { item_id: "somber-8", name: "Somber Smithing Stone [8]", emoji: "💎" },
        { item_id: "somber-9", name: "Somber Smithing Stone [9]", emoji: "💎" },
        { item_id: "dungeonkey", name: "Dungeon Key", emoji: "🔑" },
        { item_id: "wc", name: "Lootbox", emoji: "📦" }
      ]
    };

    // Execute reward distribution
    console.log("\nExecuting finishBoss...");
    await finishBoss({
      client: mockClient,
      channel: mockChannel,
      activeBoss
    });

    console.log("\n--- Checking rewards in DB ---");
    const updatedUserA = await User.findOne({ userId: "test_user_a" }).exec();
    const updatedUserB = await User.findOne({ userId: "test_user_b" }).exec();
    const updatedUserC = await User.findOne({ userId: "test_user_c" }).exec();

    console.log(`\nUser A (Top 1 & Last Hit):`);
    console.log(`Coke: 100k -> ${updatedUserA.coke} (+${updatedUserA.coke - 100000})`);
    console.log(`EXP: ${updatedUserA.rpg.exp}`);
    console.log(`Inventory:`, Object.fromEntries(updatedUserA.inventory || new Map()));

    console.log(`\nUser B (Top 2):`);
    console.log(`Coke: 100k -> ${updatedUserB.coke} (+${updatedUserB.coke - 100000})`);
    console.log(`EXP: ${updatedUserB.rpg.exp}`);
    console.log(`Inventory:`, Object.fromEntries(updatedUserB.inventory || new Map()));

    console.log(`\nUser C (Top 3):`);
    console.log(`Coke: 100k -> ${updatedUserC.coke} (+${updatedUserC.coke - 100000})`);
    console.log(`EXP: ${updatedUserC.rpg.exp}`);
    console.log(`Inventory:`, Object.fromEntries(updatedUserC.inventory || new Map()));

    // Clean up test database documents
    await User.deleteMany({ userId: { $in: ["test_user_a", "test_user_b", "test_user_c"] } }).exec();
    await SpawnedBoss.findByIdAndDelete(dbBoss._id).exec();
    console.log("\nCleaned up test documents.");

    mongoose.connection.close();
    console.log("DB connection closed.");
  } catch (error) {
    console.error("Test failed:", error);
    mongoose.connection.close();
  }
};

runTest();
