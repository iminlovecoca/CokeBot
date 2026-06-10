const User = require("../models/User");

// Mock mockUser
const mockUser = {
  userId: "12345",
  rpg: {
    classKey: "warrior",
    level: 1,
    stats: {},
    equipped: {},
    items: [],
    lastItemId: 0
  },
  markModified: () => {},
  save: async function() { return this; }
};

// Mock mongoose User methods to avoid DB connection buffering timeouts
User.findOne = (query) => {
  const chain = {
    lean: () => chain,
    sort: () => chain,
    exec: async () => null
  };
  
  if (query && query.userId === "12345") {
    return mockUser;
  }
  
  return chain;
};

User.create = async (data) => {
  return mockUser;
};

const cooldown = require("../utils/cooldown");
cooldown.checkAndSetCooldown = () => 0;

const weaponlist = require("../commands/admin/weaponlist");
const removegear = require("../commands/admin/removegear");
const addgodset = require("../commands/admin/addgodset");
const sacrifice = require("../commands/rpg/sacrifice");

async function runTests() {
  console.log("=== STARTING ADMIN & USER COMMANDS VERIFICATION ===\n");

  // 1. Verify weaponlist metadata
  console.log("Testing weaponlist command definition...");
  if (weaponlist.name !== "weaponlist" || !weaponlist.aliases.includes("weapons")) {
    throw new Error("FAIL: weaponlist name or aliases incorrect!");
  }
  console.log("SUCCESS: weaponlist command definition verified.\n");

  // 2. Verify removegear metadata
  console.log("Testing removegear command definition...");
  if (removegear.name !== "removegear" || !removegear.aliases.includes("deletegear")) {
    throw new Error("FAIL: removegear name or aliases incorrect!");
  }
  console.log("SUCCESS: removegear command definition verified.\n");

  // 3. Verify addgodset metadata & logic
  console.log("Testing addgodset command...");
  if (addgodset.name !== "addgodset" || !addgodset.aliases.includes("godset")) {
    throw new Error("FAIL: addgodset name or aliases incorrect!");
  }

  const mockMessage = {
    author: { id: "745950731638407210" }, // Owner ID
    mentions: {
      users: {
        first: () => ({ id: "12345" })
      }
    },
    client: {
      users: {
        fetch: async () => ({ id: "12345" })
      }
    },
    reply: (response) => {
      mockMessage.repliedWith = response;
      return response;
    }
  };

  // Test case 1: weapon matching 'shadow'
  console.log("Testing addgodset with weapon 'shadow'...");
  await addgodset.execute(mockMessage, ["<@12345>", "shadow"]);

  // Verify level, stats, and equipped weapon
  if (mockUser.rpg.level !== 120) {
    throw new Error(`FAIL: Level not 120 (got ${mockUser.rpg.level})`);
  }
  if (mockUser.rpg.stats.vigor !== 99 || mockUser.rpg.stats.str !== 99) {
    throw new Error("FAIL: Stats not maxed out at 99");
  }

  const weaponItem = mockUser.rpg.items.find(item => item.slot === "weapon" && item.id === mockUser.rpg.equipped.weapon);
  if (!weaponItem) {
    throw new Error("FAIL: Weapon not generated and added to inventory");
  }
  if (weaponItem.subType !== "Shadow Dagger") {
    throw new Error(`FAIL: Weapon subtype did not match 'Shadow Dagger' (got ${weaponItem.subType})`);
  }
  if (weaponItem.upgradeLevel !== 10) {
    throw new Error(`FAIL: Weapon upgradeLevel is not +10 (got ${weaponItem.upgradeLevel})`);
  }

  const armorItem = mockUser.rpg.items.find(item => item.slot === "armor" && item.id === mockUser.rpg.equipped.armor);
  if (!armorItem) {
    throw new Error("FAIL: Armor not generated and added to inventory");
  }
  if (armorItem.upgradeLevel !== 0) {
    throw new Error(`FAIL: Armor upgradeLevel is not 0 (got ${armorItem.upgradeLevel})`);
  }
  console.log("SUCCESS: weapon name 'shadow' matched, stats and levels maxed.\n");

  // Test case 2: weapon matching 'fire sword'
  console.log("Testing addgodset with weapon 'fire sword'...");
  await addgodset.execute(mockMessage, ["<@12345>", "fire", "sword"]);
  const newWeaponItem = mockUser.rpg.items.find(item => item.slot === "weapon" && item.id === mockUser.rpg.equipped.weapon);
  if (newWeaponItem.subType !== "Fire Sword") {
    throw new Error(`FAIL: Weapon subtype did not match 'Fire Sword' (got ${newWeaponItem.subType})`);
  }
  console.log("SUCCESS: weapon name 'fire sword' matched.\n");

  // Test case 3: fallback on custom weapon name
  console.log("Testing addgodset with custom weapon name 'ultimate blade'...");
  await addgodset.execute(mockMessage, ["<@12345>", "ultimate", "blade"]);
  const customWeaponItem = mockUser.rpg.items.find(item => item.slot === "weapon" && item.id === mockUser.rpg.equipped.weapon);
  if (customWeaponItem.subType !== "Ultimate Blade") {
    throw new Error(`FAIL: Custom weapon subtype did not match 'Ultimate Blade' (got ${customWeaponItem.subType})`);
  }
  console.log("SUCCESS: custom weapon 'Ultimate Blade' matched and fell back properly.\n");

  // 4. Verify sacrifice command logic
  console.log("Testing sacrifice command...");
  if (sacrifice.name !== "sacrifice" || !sacrifice.aliases.includes("sac")) {
    throw new Error("FAIL: sacrifice name or aliases incorrect!");
  }

  // Set mockUser items with some unequipped common items
  mockUser.rpg.items = [
    { id: 900, rarity: "Common", slot: "weapon", power: 10 },
    { id: 901, rarity: "Common", slot: "armor", power: 10 },
    { id: 902, rarity: "Rare", slot: "weapon", power: 30 }
  ];
  mockUser.rpg.equipped = { weapon: 902 }; // weapon 902 is equipped, 900/901 are not
  mockUser.rpg.autohunt = { essence: 0 };

  const mockSacrificeMessage = {
    author: { id: "12345" },
    reply: async (response) => {
      mockSacrificeMessage.repliedWith = response;
      return {
        delete: async () => {}
      };
    }
  };

  // Sacrifice 1 common item
  await sacrifice.execute(mockSacrificeMessage, ["common", "1"]);
  if (mockUser.rpg.autohunt.essence !== 10) {
    throw new Error(`FAIL: expected 10 essence after sacrificing 1 common item, got ${mockUser.rpg.autohunt.essence}`);
  }
  if (mockUser.rpg.items.length !== 2) {
    throw new Error(`FAIL: expected 2 items remaining in inventory, got ${mockUser.rpg.items.length}`);
  }

  // Sacrifice all remaining common items (1 left)
  await sacrifice.execute(mockSacrificeMessage, ["common", "all"]);
  if (mockUser.rpg.autohunt.essence !== 20) {
    throw new Error(`FAIL: expected 20 essence after sacrificing all common items, got ${mockUser.rpg.autohunt.essence}`);
  }
  if (mockUser.rpg.items.length !== 1 || mockUser.rpg.items[0].id !== 902) {
    throw new Error(`FAIL: expected only equipped item 902 remaining, got inventory length ${mockUser.rpg.items.length}`);
  }
  console.log("SUCCESS: sacrifice command logic verified.\n");

  console.log("=== ALL ADMIN & USER COMMANDS TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
