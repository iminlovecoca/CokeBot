const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const config = require("../data/config");
const {
  generateRpgGearDrop,
  addRpgGearToUser,
  calculateRpgPower,
  dungeonWeapons,
} = require("../utils/rpgUtil");

const TARGET_USER_ID = "1136526046557118505";

async function run() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB at:", mongoUri);

  let user = await User.findOne({ userId: TARGET_USER_ID });
  if (!user) {
    user = new User({ userId: TARGET_USER_ID });
  }

  // 1. General User stats & currency
  user.coke = 999999999;
  user.cokeGC = 999999999;
  user.level = 100;
  user.luck = 100;
  user.tea = 99999;
  user.cookie = 99999;
  user.dailyStreak = 999;
  user.zooPoints = 999999;
  user.huntStones = {
    boost: { stone1: 999, stone2: 999, stone3: 999 },
    multi: { stone1: 999, stone2: 999, stone3: 999 },
    fixed: { stone1: 999, stone2: 999, stone3: 999 },
  };

  // 2. Full Inventory of Items
  const itemIds = [
    "catch-net",
    "lure-standard",
    "lure-volcano",
    "lure-frozen",
    "lure-cavern",
    "lure-power",
    "lure-forest",
    "lure-warlord",
    "lure-eerie",
    "thunder-stone",
    "moon-stone",
    "fire-stone",
    "leaf-stone",
    "water-stone",
    "sun-stone",
    "dusk-stone",
    "dawn-stone",
    "shiny-stone",
    "ice-stone",
    "prism-scale",
    "kings-rock",
    "metal-coat",
    "protector",
    "dragon-scale",
    "electirizer",
    "magmarizer",
    "upgrade",
    "dubious-disc",
    "reaper-cloth",
    "deep-sea-tooth",
    "deep-sea-scale",
    "oval-stone",
    "razor-fang",
    "razor-claw",
    "rare-candy",
    "souls",
    "hexpiece",
    "wc",
    "weapon_box",
    "abyssalhorn",
    "enhancement_stone",
    "essence",
  ];

  if (!user.inventory) {
    user.inventory = new Map();
  }
  for (const id of itemIds) {
    user.inventory.set(id, 9999);
  }
  user.markModified("inventory");

  // 3. RPG Character Attributes
  if (!user.rpg) user.rpg = {};
  user.rpg.classKey = user.rpg.classKey || "warrior";
  user.rpg.characterAsset = user.rpg.characterAsset || "Warrior_male.png";
  user.rpg.level = 120;
  user.rpg.exp = 0;
  user.rpg.rank = "Transcendent";
  user.rpg.stats = {
    vigor: 99,
    pr: 99,
    mr: 99,
    str: 99,
    dex: 99,
    int: 99,
    arc: 99,
  };
  user.rpg.hiddenFromBattle = true;
  user.rpg.clearedDungeons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  user.rpg.claimedBossWeapons = dungeonWeapons.map((dw) => dw.key);

  // Skins
  const skins = [
    "Warrior_02.png",
    "Warrior_03.png",
    "Warrior_04.png",
    "WarriorMecha.gif",
    "Assassin_13.png",
    "Assassin_14.png",
    "Assassin_15.png",
    "Assassin_16.png",
    "Mage_07.png",
    "Mage_08.png",
    "Mage_10.png",
    "Paladin_18.png",
    "Paladin_20.png",
  ];
  user.rpg.ownedSkins = skins;

  // Pets
  const petTypes = [
    { key: "sabertiger", name: "Hổ Răng Kiếm (Legendary)", emoji: "🐯" },
    { key: "mammoth", name: "Voi Ma Mút (Legendary)", emoji: "🐘" },
    { key: "eagle", name: "Đại Bàng Huyền Thoại (Legendary)", emoji: "🦅" },
    { key: "shark", name: "Cá Mập Cổ Đại (Legendary)", emoji: "🦈" },
    { key: "snake", name: "Mãng Xà Hoàng Gia (Legendary)", emoji: "🐍" },
  ];

  user.rpg.pets = petTypes.map((p) => ({
    uid: `pet-${p.key}`,
    key: p.key,
    name: p.name,
    rarity: "Legendary",
    level: 100,
    exp: 0,
    emoji: p.emoji,
  }));
  user.rpg.equippedPet = user.rpg.pets[0];

  // 4. Equipment Generation (Divine +10 Max Quality 100%)
  const slots = ["weapon", "armor", "helmet", "boots", "ring", "necklace"];
  user.rpg.items = [];
  user.rpg.equipped = {};

  // Main 6 slots
  for (const slot of slots) {
    const isWeapon = slot === "weapon";
    const gear = await generateRpgGearDrop(user, {
      forceDrop: true,
      slot,
      rarity: "Divine",
      level: 120,
      upgradeLevel: 10,
      quality: 100,
      subType: isWeapon ? "Holy Sword" : null,
      fromAdmin: true,
    });
    if (gear) {
      addRpgGearToUser(user, gear);
      user.rpg.equipped[slot] = gear.id;
      user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, gear.id);
    }
  }

  // All Dungeon & Event Weapons as extra max items in inventory
  for (const dw of dungeonWeapons) {
    const weaponGear = await generateRpgGearDrop(user, {
      forceDrop: true,
      slot: "weapon",
      rarity: "Divine",
      level: 120,
      upgradeLevel: 10,
      quality: 100,
      subType: dw.name,
      fromAdmin: true,
    });
    if (weaponGear) {
      addRpgGearToUser(user, weaponGear);
      user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, weaponGear.id);
    }
  }

  user.rpg.power = calculateRpgPower(user);
  user.markModified("rpg");

  await user.save();
  console.log(`✅ Successfully updated full account for user ${TARGET_USER_ID}!`);
  console.log(`   - Level: ${user.rpg.level}`);
  console.log(`   - Power: ${user.rpg.power}`);
  console.log(`   - Hidden from battle: ${user.rpg.hiddenFromBattle}`);
  console.log(`   - Items in RPG inventory: ${user.rpg.items.length}`);
  console.log(`   - Items in General inventory: ${user.inventory.size}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Failed to update user account:", err);
  process.exit(1);
});
