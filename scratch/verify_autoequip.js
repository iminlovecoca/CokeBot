const User = require("../models/User");

// Mock mongoose findOne to avoid buffering timeout without DB connection
User.findOne = () => ({
  lean: () => ({
    exec: async () => null
  }),
  sort: () => ({
    exec: async () => null
  }),
  exec: async () => null
});

// Mocking requireRpgCharacter before requiring the command
const mockUser = {
  userId: "999999",
  rpg: {
    classKey: "mage",
    level: 10,
    power: 0,
    stats: {
      vigor: 10,
      str: 5,
      dex: 5,
      int: 20,
      arc: 10
    },
    equipped: {
      weapon: 1, // Currently equipped common staff
      armor: null
    },
    items: [
      // Weapons
      {
        id: 1,
        slot: "weapon",
        subType: "Staff",
        rarity: "Common",
        power: 50,
        stats: { int: 2 },
        upgradeLevel: 0
      },
      {
        id: 2,
        slot: "weapon",
        subType: "Longsword",
        rarity: "Legendary",
        power: 200,
        stats: { str: 10 },
        upgradeLevel: 0
      },
      {
        id: 3,
        slot: "weapon",
        subType: "Staff",
        rarity: "Mythic",
        power: 250,
        stats: { int: 15 },
        upgradeLevel: 0
      },
      // Armor
      {
        id: 4,
        slot: "armor",
        subType: "Mage Robe",
        rarity: "Rare",
        power: 80,
        stats: { int: 8, mr: 5 }
      },
      {
        id: 5,
        slot: "armor",
        subType: "Heavy Armor",
        rarity: "Legendary",
        power: 100,
        stats: { str: 12, pr: 8 }
      }
    ]
  },
  markModified: function(path) {
    this.modifiedPath = path;
  },
  save: async function() {
    this.saved = true;
    return this;
  }
};

const rpgUtil = require("../utils/rpgUtil");
rpgUtil.requireRpgCharacter = async (userId) => {
  return { user: mockUser, rpgClass: { name: "Mage" } };
};
rpgUtil.getRpgItems = (user) => user.rpg.items;
rpgUtil.calculateRpgPower = (user) => {
  return 400;
};
rpgUtil.getGearDisplayName = (item) => `[${item.rarity}] ${item.subType}`;

// 2. Now require the command
const autoequip = require("../commands/rpg/autoequip");

const runTests = async () => {
  console.log("=== VERIFYING AUTO EQUIP COMMAND ===");

  let repliedPayload = null;
  const mockMessage = {
    author: { id: "745950731638407210" },
    reply: (payload) => {
      repliedPayload = payload;
      return Promise.resolve(payload);
    }
  };

  await autoequip.execute(mockMessage, []);
  console.log("Test 1 - Replied description:");
  console.log(repliedPayload.embeds[0].data.description);
  console.log("Test 1 - Equipped fields:");
  console.log(JSON.stringify(repliedPayload.embeds[0].data.fields, null, 2));

  console.log("Equipped Weapon ID:", mockUser.rpg.equipped.weapon);
  console.log("Equipped Armor ID:", mockUser.rpg.equipped.armor);

  if (mockUser.rpg.equipped.weapon !== 3) {
    console.error("FAIL: Did not auto-equip the Mythic Staff.");
    process.exit(1);
  }
  if (mockUser.rpg.equipped.armor !== 4) {
    console.error("FAIL: Did not auto-equip the Mage Robe.");
    process.exit(1);
  }

  console.log("SUCCESS: Auto-equip correctly optimized gear for Mage class!");
  console.log("=== ALL AUTO EQUIP TESTS PASSED SUCCESSFULLY! ===");
};

runTests().catch(err => {
  console.error("CRITICAL TEST FAILURE:", err);
  process.exit(1);
});
