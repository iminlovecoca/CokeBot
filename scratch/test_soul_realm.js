const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load env variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cokegamble";

// Mock environment
process.env.OWNER_ID = "745950731638407210";

// Import models & utils from CokeBot
const User = require("../models/User");
const { getOrCreateUser, isDev } = require("../utils/userUtil");
const { getRpgClass, calculateRpgPower, addRpgGearToUser } = require("../utils/rpgUtil");
const { finishBoss, performBossAttack } = require("../commands/rpg/boss");
const config = require("../data/config");

// Speed up setTimeout inside test dialogues
const originalSetTimeout = global.setTimeout;
let speedUpTimeouts = true;
global.setTimeout = (callback, delay, ...args) => {
  if (speedUpTimeouts && typeof delay === "number") {
    if (delay === 10000 || delay === 2500) {
      return originalSetTimeout(callback, 5, ...args);
    }
  }
  return originalSetTimeout(callback, delay, ...args);
};

// Mock Discord.js Structures
class MockMessageCollector {
  constructor() {
    this.callbacks = {};
  }
  on(event, callback) {
    this.callbacks[event] = callback;
    return this;
  }
  trigger(event, ...args) {
    if (this.callbacks[event]) {
      this.callbacks[event](...args);
    }
  }
}

const mockClient = {
  users: {
    fetch: async (id) => ({
      id,
      username: `TestUser_${id}`,
      displayName: `TestDisplay_${id}`,
      send: async (payload) => {
        console.log(`[DM to ${id}]`, JSON.stringify(payload));
      }
    })
  },
  allItems: [
    { item_id: "somber-7", name: "Somber Smithing Stone [7]", emoji: "💎" },
    { item_id: "somber-8", name: "Somber Smithing Stone [8]", emoji: "💎" },
    { item_id: "somber-9", name: "Somber Smithing Stone [9]", emoji: "💎" },
    { item_id: "wc", name: "Weapon Crate", emoji: "📦" }
  ],
  rpgBosses: new Map()
};

async function testRetreatFlow() {
  console.log("\n========================================");
  console.log("TESTING FLOW 1: Retreat (Rút lui)");
  console.log("========================================");

  const testUserId = "123456";
  const user = await getOrCreateUser(testUserId);
  user.rpg = user.rpg || {};
  user.rpg.classKey = "mage";
  user.rpg.level = 100;
  user.rpg.exp = 0;
  user.rpg.nickname = "Saitama Mage";
  user.rpg.items = [];
  user.rpg.equipped = {};
  user.coke = 10000;
  await user.save();

  const activeBoss = {
    id: `test-boss-${Date.now()}`,
    channelId: "test-channel-123",
    boss: {
      key: "boss_XI",
      name: "Malzareth",
      rank: "thuongnhan",
      hp: 135000,
      maxHp: 135000,
      attackPower: 3200,
      armor: 2200,
      magicResist: 2200,
      damageType: "physical",
      emoji: "🐉"
    },
    hp: 0,
    maxHp: 135000,
    participants: new Map([
      [testUserId, { damage: 50000, attacks: 3, hp: 1000 }]
    ]),
    lastHitUserId: testUserId,
    defeated: true,
    allowSoulRealm: true
  };

  mockClient.rpgBosses.set(activeBoss.channelId, activeBoss);

  let collectorInstance = null;
  const mockChannel = {
    id: activeBoss.channelId,
    send: async (payload) => {
      console.log("[Channel Msg]", payload.content || (payload.embeds && payload.embeds[0]?.data?.title));
      if (payload.components && payload.components.length > 0) {
        // Return a mock message that allows collector creation
        return {
          id: "invite-msg-123",
          edit: async (editPayload) => {
            console.log("[Invite Msg Edited]", editPayload);
          },
          createMessageComponentCollector: (options) => {
            collectorInstance = new MockMessageCollector();
            return collectorInstance;
          }
        };
      }
      return { id: "normal-msg-123" };
    }
  };

  // Call finishBoss
  await finishBoss({ client: mockClient, channel: mockChannel, activeBoss });

  // Await setImmediate to allow startSoulRealmInvite to run
  await new Promise(resolve => setImmediate(resolve));

  console.log("Checking if rewards are escrowed (not added to DB yet):");
  const freshUser = await User.findOne({ userId: testUserId });
  console.log("User Coke (should still be 10000):", freshUser.coke);
  console.log("Escrow object exists:", !!activeBoss.lastHitEscrow);
  console.log("Escrow Coke Gain:", activeBoss.lastHitEscrow.cokeGain);

  if (collectorInstance) {
    console.log("\nSimulating clicking 'Rút lui' button...");
    // Trigger retreat reason
    collectorInstance.trigger("end", [], "retreat");
  }

  // Await async reward distribution
  await new Promise(resolve => setTimeout(resolve, 500));

  const finalUser = await User.findOne({ userId: testUserId });
  console.log("\nAfter Retreat:");
  console.log("User Coke (should be greater than 10000):", finalUser.coke);
  console.log("User RPG Exp (should be greater than 0):", finalUser.rpg?.exp);
}

async function testSoulRealmCombatWinFlow() {
  console.log("\n========================================");
  console.log("TESTING FLOW 2: Soul Realm Battle Win (Thắng)");
  console.log("========================================");

  const testUserId = "123456";
  const user = await getOrCreateUser(testUserId);
  user.rpg = user.rpg || {};
  user.rpg.classKey = "warrior"; // Warrior will test warrior.png and Trọng Kiếm
  user.rpg.level = 100;
  user.rpg.exp = 0;
  user.rpg.nickname = "Saitama Warrior";
  const godWeapon = {
    id: 99999,
    uid: "w-god",
    name: "God Slayer Sword",
    slot: "weapon",
    subType: "Longsword",
    rarity: "Divine",
    power: 100000,
    quality: 100,
    stats: { str: 99, dex: 99, vigor: 99 },
    level: 1,
    scaling: { str: "S", dex: "S" }
  };
  user.rpg.items = [godWeapon];
  user.rpg.equipped = { weapon: 99999 };
  user.coke = 10000;
  await user.save();

  const activeBoss = {
    id: `test-boss-${Date.now()}`,
    channelId: "test-channel-123",
    boss: {
      key: "boss_XI",
      name: "Malzareth",
      rank: "thuongnhan",
      hp: 135000,
      maxHp: 135000,
      attackPower: 3200,
      armor: 2200,
      magicResist: 2200,
      damageType: "physical",
      emoji: "🐉"
    },
    hp: 0,
    maxHp: 135000,
    participants: new Map([
      [testUserId, { damage: 50000, attacks: 3, hp: 1000 }]
    ]),
    lastHitUserId: testUserId,
    defeated: true,
    allowSoulRealm: true
  };

  mockClient.rpgBosses.set(activeBoss.channelId, activeBoss);

  let collectorInstance = null;
  const mockChannel = {
    id: activeBoss.channelId,
    send: async (payload) => {
      console.log("[Channel Msg]", payload.content || (payload.embeds && (payload.embeds[0]?.data?.title || payload.embeds[0]?.title)));
      const embedTitle = payload.embeds && (payload.embeds[0]?.data?.title || payload.embeds[0]?.title);
      if (payload.embeds && embedTitle === "🌌 CHIẾN TRƯỜNG CÕI LINH HỒN 🌌") {
        // Return a mock battle message
        return {
          id: "battle-msg-123",
          edit: async (editPayload) => {
            console.log("\n[Battle Screen Update]");
            if (editPayload.embeds) {
              const emb = editPayload.embeds[0];
              console.log("Title:", emb.data.title);
              // Print last log
              const fieldLogs = emb.data.fields.find(f => f.name === "📝 Nhật ký trận đấu");
              console.log("Latest Log:", fieldLogs?.value.split("\n").pop());
              // Print Boss & Player HP
              const fieldBoss = emb.data.fields.find(f => f.name.startsWith("👹 Kẻ địch"));
              const fieldPlayer = emb.data.fields.find(f => f.name.startsWith("👤"));
              console.log("Boss HP Info:", fieldBoss?.value);
              console.log("Player HP Info:", fieldPlayer?.value.replace(/\n/g, " | "));
            }
          },
          awaitMessageComponent: async (options) => {
            // Mock player action input:
            // We want to alternate: Attack -> Skill (when 100% rage) -> Attack
            // Since we have x2 damage, Warrior skill [Trọng Kiếm] does x4 * x2 = x8 damage.
            // Let's print decision
            const ragePercent = options.filter ? 100 : 0; // dummy
            // Let's decide based on state: if we have potions, let's attack
            // For testing, let's just trigger Attack or Skill
            const freshUserLocal = await User.findOne({ userId: testUserId });
            // Since player state is in memory in boss.js, we can return a mock customId
            // We can check the active logs to see how it resolves.
            // Let's return Attack or Potion or Skill.
            // Let's do Attack first
            return {
              customId: "soul_combat_attack",
              user: { id: testUserId },
              deferUpdate: async () => {}
            };
          }
        };
      }
      if (payload.components && payload.components.length > 0) {
        return {
          id: "invite-msg-123",
          edit: async (editPayload) => {},
          createMessageComponentCollector: (options) => {
            collectorInstance = new MockMessageCollector();
            return collectorInstance;
          }
        };
      }
      return { id: "normal-msg-123" };
    }
  };

  // Call finishBoss
  await finishBoss({ client: mockClient, channel: mockChannel, activeBoss });

  // Await setImmediate to allow startSoulRealmInvite to run
  await new Promise(resolve => setImmediate(resolve));

  if (collectorInstance) {
    console.log("\nSimulating clicking 'Tiến vào' button...");
    // Disable timeout speedup slightly to let dialogues print
    collectorInstance.trigger("end", [], "enter");
  }

  // Await dialogue and combat to finish (since it has setTimeout intervals, we wait a bit)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check rewards
  const finalUser = await User.findOne({ userId: testUserId });
  console.log("\nAfter Battle Win:");
  console.log("Items in RPG inventory:", finalUser.rpg?.items?.length);
  if (finalUser.rpg?.items?.length > 0) {
    const item = finalUser.rpg.items[0];
    console.log("Won Item Name:", item.name);
    console.log("Won Item Rarity:", item.rarity);
    console.log("Won Item Power:", item.power);
  }
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  await testRetreatFlow();
  await testSoulRealmCombatWinFlow();

  console.log("\nTests completed! Closing connection.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
