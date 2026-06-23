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
    console.log("Connected to DB");

    // 1. Find a test user or create one
    let testUser = await User.findOne({ "rpg.classKey": { $ne: null } }).exec();
    if (!testUser) {
      console.log("No RPG user found, creating a mock user...");
      testUser = await User.create({
        userId: "99999999999999999",
        username: "MockTester",
        coke: 1000,
        rpg: {
          classKey: "warrior",
          level: 10,
          exp: 0,
          rank: "Novice",
          items: [],
          equipped: {},
          stats: { vigor: 10, str: 5, dex: 5, int: 0, arc: 0 },
          power: 100
        }
      });
    }

    const testUserId = testUser.userId;
    console.log(`Using test user: ${testUserId} (${testUser.username})`);

    // Clean up any old test bosses
    await SpawnedBoss.deleteMany({ channelId: "test-channel-recovery" }).exec();

    // 2. Create a mock active boss structure
    const mockBoss = {
      key: "erdtree-avatar",
      name: "Erdtree Avatar",
      emoji: "🎄",
      rank: "thuong",
      hp: 18000,
      recommended_power: 300
    };

    const activeBoss = {
      id: `test-${Date.now()}`,
      channelId: "test-channel-recovery",
      boss: mockBoss,
      hp: 0,
      maxHp: mockBoss.hp,
      participants: new Map([
        [testUserId, { damage: 5000, attacks: 5, lastAttackAt: Date.now(), hp: 100, koUntil: 0 }]
      ]),
      lastHitUserId: testUserId,
      defeated: true,
      rewarded: false,
      messageId: "12345",
      messageIds: ["12345"]
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
        [testUserId]: activeBoss.participants.get(testUserId)
      },
      lastHitUserId: activeBoss.lastHitUserId,
      spawnedAt: Date.now(),
      expiresAt: Date.now() + 600000,
      messageId: activeBoss.messageId,
      messageIds: activeBoss.messageIds
    });
    activeBoss.dbId = dbBoss._id;

    console.log(`Created mock boss ${dbBoss.bossId} in DB. Defeated: true, Rewarded: false`);

    // Mock client and channel
    const mockChannel = {
      id: "test-channel-recovery",
      send: async () => {},
      messages: {
        fetch: async () => ({
          edit: async () => {}
        })
      }
    };

    const mockClient = {
      rpgBosses: new Map(),
      emit: () => {},
      users: {
        fetch: async () => ({
          send: async () => {}
        })
      },
      allItems: [
        { item_id: "somber-4", name: "Somber Stone 4", emoji: "💎" },
        { item_id: "dungeonkey", name: "Dungeon Key", emoji: "🔑" }
      ]
    };

    // Reload user to capture initial items/coke
    const userBefore = await User.findOne({ userId: testUserId }).exec();
    const initialItemCount = userBefore.rpg.items.length;
    const initialCoke = userBefore.coke;

    console.log(`Initial items: ${initialItemCount}, initial Coke: ${initialCoke}`);

    // Run finishBoss (First time)
    console.log("Running finishBoss (First time)...");
    await finishBoss({ client: mockClient, channel: mockChannel, activeBoss });

    // Verify DB update
    const dbBossAfter1 = await SpawnedBoss.findById(dbBoss._id).exec();
    console.log(`DB Boss After 1: Defeated=${dbBossAfter1.defeated}, Rewarded=${dbBossAfter1.rewarded}, RewardedUserIds=${JSON.stringify(dbBossAfter1.rewardedUserIds)}`);
    
    const userAfter1 = await User.findOne({ userId: testUserId }).exec();
    const after1ItemCount = userAfter1.rpg.items.length;
    const after1Coke = userAfter1.coke;
    console.log(`After 1 items: ${after1ItemCount}, Coke: ${after1Coke}`);

    if (!dbBossAfter1.rewardedUserIds.includes(testUserId)) {
      throw new Error("FAIL: User ID not added to rewardedUserIds!");
    }
    if (after1ItemCount <= initialItemCount) {
      throw new Error("FAIL: User did not receive items!");
    }

    // Reset rewarded flag in activeBoss memory and DB, but KEEP rewardedUserIds to simulate recovery from crash
    activeBoss.rewarded = false;
    dbBossAfter1.rewarded = false;
    await dbBossAfter1.save();

    console.log("Reset boss rewarded to false in DB, keeping rewardedUserIds. Running finishBoss (Second time)...");
    await finishBoss({ client: mockClient, channel: mockChannel, activeBoss });

    // Verify user was NOT double rewarded
    const userAfter2 = await User.findOne({ userId: testUserId }).exec();
    const after2ItemCount = userAfter2.rpg.items.length;
    const after2Coke = userAfter2.coke;
    console.log(`After 2 items: ${after2ItemCount}, Coke: ${after2Coke}`);

    if (after2ItemCount !== after1ItemCount || after2Coke !== after1Coke) {
      throw new Error("FAIL: Double-reward protection failed! User received rewards twice.");
    }

    console.log("SUCCESS: Double-reward protection and recovery verified perfectly!");

    // Cleanup test boss
    await SpawnedBoss.findByIdAndDelete(dbBoss._id).exec();
    await mongoose.connection.close();
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
};

runTest();
