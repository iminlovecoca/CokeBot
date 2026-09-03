const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");
const { dungeonWeapons } = require("../utils/rpgUtil");

const BOT_NPC_LIST = [
  // --- Common Bots (Lv. 20 - 24, Beginner Tier, Power ~6,000 - 10,000) ---
  {
    userId: "bot_pvp_1",
    name: "Shadow",
    classKey: "assassin",
    characterAsset: "Assassin_male.png",
    battleRank: "Common",
    battleLp: 20,
    lvl: 20,
    statPts: 120,
    weapon: { name: "Dao Săn Đêm +4", enhance: 4, power: 450, subType: "poisondagger" },
    armor: { name: "Áo Da Bóng Đêm +4", enhance: 4, power: 250 },
    helmet: { name: "Mũ Vải Sát Thủ +4", enhance: 4, power: 180 },
    boots: { name: "Giày Nhẹ Tàng Hình +4", enhance: 4, power: 180 },
    petKey: "bee",
    petName: "Ong",
    petEmoji: "🐝",
    petLvl: 18,
  },
  {
    userId: "bot_pvp_2",
    name: "Viper",
    classKey: "assassin",
    characterAsset: "Assassin_female.png",
    battleRank: "Common",
    battleLp: 35,
    lvl: 22,
    statPts: 140,
    weapon: { name: "Song Đao Thép +5", enhance: 5, power: 550, subType: "poisondagger" },
    armor: { name: "Giáp Da Thép +5", enhance: 5, power: 300 },
    helmet: { name: "Mũ Da Báo +5", enhance: 5, power: 220 },
    boots: { name: "Giày Da Rắn +5", enhance: 5, power: 220 },
    petKey: "snail",
    petName: "Ốc Sên",
    petEmoji: "🐌",
    petLvl: 20,
  },
  {
    userId: "bot_pvp_3",
    name: "Ghost",
    classKey: "assassin",
    characterAsset: "Assassin_male.png",
    battleRank: "Common",
    battleLp: 15,
    lvl: 24,
    statPts: 150,
    weapon: { name: "Dao Găm Thép +5", enhance: 5, power: 580, subType: "shadowdagger" },
    armor: { name: "Áo Vải Ngụy Trang +5", enhance: 5, power: 320 },
    helmet: { name: "Mặt Nạ Ảo Ảnh +5", enhance: 5, power: 240 },
    boots: { name: "Giày Lướt Gió +5", enhance: 5, power: 240 },
    petKey: "ladybug",
    petName: "Bọ Rùa",
    petEmoji: "🐞",
    petLvl: 22,
  },

  // --- Rare Bots (Lv. 30 - 38, Skilled Tier, Power ~13,000 - 19,000) ---
  {
    userId: "bot_pvp_4",
    name: "Kratos",
    classKey: "warrior",
    characterAsset: "Warrior_male.png",
    battleRank: "Rare",
    battleLp: 15,
    lvl: 32,
    statPts: 240,
    weapon: { name: "Thương Bạc +6", enhance: 6, power: 950, subType: "firesword" },
    armor: { name: "Áo Giáp Bạc +6", enhance: 6, power: 550 },
    helmet: { name: "Mũ Chiến Binh Bạc +6", enhance: 6, power: 400 },
    boots: { name: "Ủng Thiết Giáp +6", enhance: 6, power: 400 },
    petKey: "duck",
    petName: "Vịt",
    petEmoji: "🦆",
    petLvl: 28,
  },
  {
    userId: "bot_pvp_5",
    name: "Valkyrie",
    classKey: "warrior",
    characterAsset: "Warrior_female.png",
    battleRank: "Rare",
    battleLp: 40,
    lvl: 35,
    statPts: 270,
    weapon: { name: "Trọng Kiếm Thép +7", enhance: 7, power: 1150, subType: "firesword" },
    armor: { name: "Giáp Toàn Thân Nữ Chiến Binh +7", enhance: 7, power: 650 },
    helmet: { name: "Mũ Cánh Kim Loại +7", enhance: 7, power: 480 },
    boots: { name: "Giày Thép Hiệp Sĩ +7", enhance: 7, power: 480 },
    petKey: "rooster",
    petName: "Gà Trống",
    petEmoji: "🐓",
    petLvl: 32,
  },
  {
    userId: "bot_pvp_6",
    name: "Lancer",
    classKey: "warrior",
    characterAsset: "Warrior_male.png",
    battleRank: "Rare",
    battleLp: 25,
    lvl: 38,
    statPts: 300,
    weapon: { name: "Rìu Chiến Cự Nhân +7", enhance: 7, power: 1250, subType: "firesword" },
    armor: { name: "Áo Giáp Sắt Nung +7", enhance: 7, power: 720 },
    helmet: { name: "Mũ Sừng Chiến Binh +7", enhance: 7, power: 520 },
    boots: { name: "Chiến Hài Nặng +7", enhance: 7, power: 520 },
    petKey: "cow",
    petName: "Bò",
    petEmoji: "🐄",
    petLvl: 35,
  },

  // --- Epic Bots (Lv. 48 - 55, Veteran Tier, Power ~25,000 - 35,000) ---
  {
    userId: "bot_pvp_7",
    name: "Ignis",
    classKey: "mage",
    characterAsset: "Mage_male.png",
    battleRank: "Epic",
    battleLp: 10,
    lvl: 48,
    statPts: 450,
    weapon: { name: "Gậy Phép Tinh Thạch +8", enhance: 8, power: 1750, subType: "bluestaff" },
    armor: { name: "Áo Choàng Pháp Sư Lửa +8", enhance: 8, power: 1050 },
    helmet: { name: "Nón Ma Thuật Tinh Tú +8", enhance: 8, power: 750 },
    boots: { name: "Giày Đệm Ma Lực +8", enhance: 8, power: 750 },
    petKey: "monkey",
    petName: "Khỉ",
    petEmoji: "🐒",
    petLvl: 45,
  },
  {
    userId: "bot_pvp_8",
    name: "Frost",
    classKey: "mage",
    characterAsset: "Mage_female.png",
    battleRank: "Epic",
    battleLp: 30,
    lvl: 52,
    statPts: 520,
    weapon: { name: "Gậy Băng Sương +9", enhance: 9, power: 2150, subType: "bluestaff" },
    armor: { name: "Áo Choàng Băng Tuyết +9", enhance: 9, power: 1250 },
    helmet: { name: "Vương Miện Băng Giá +9", enhance: 9, power: 900 },
    boots: { name: "Ủng Băng Cực +9", enhance: 9, power: 900 },
    petKey: "horse",
    petName: "Ngựa",
    petEmoji: "🐎",
    petLvl: 50,
  },
  {
    userId: "bot_pvp_9",
    name: "Arcane",
    classKey: "mage",
    characterAsset: "Mage_male.png",
    battleRank: "Epic",
    battleLp: 45,
    lvl: 55,
    statPts: 560,
    weapon: { name: "Quyền Trượng Hư Không +9", enhance: 9, power: 2350, subType: "bluestaff" },
    armor: { name: "Pháp Bào Bí Ẩn +9", enhance: 9, power: 1380 },
    helmet: { name: "Khăn Trùm Hư Không +9", enhance: 9, power: 980 },
    boots: { name: "Giày Thần Du +9", enhance: 9, power: 980 },
    petKey: "scorpion",
    petName: "Bọ Cạp",
    petEmoji: "🦂",
    petLvl: 52,
  },

  // --- Legendary Bots (Lv. 65 - 75, Elite Master Tier, Power ~45,000 - 62,000) ---
  {
    userId: "bot_pvp_10",
    name: "Hawkeye",
    classKey: "archer",
    characterAsset: "Archer_male.png",
    battleRank: "Legendary",
    battleLp: 25,
    lvl: 65,
    statPts: 750,
    weapon: { name: "Cung Trọng Lực GravityBow +10", enhance: 10, power: 3200, subType: "gravitybow" },
    armor: { name: "Giáp Nhẹ Liệp Thủ +10", enhance: 10, power: 1900 },
    helmet: { name: "Mũ Trùm Ưng Nhãn +10", enhance: 10, power: 1400 },
    boots: { name: "Giày Lướt Gió Thần Tốc +10", enhance: 10, power: 1400 },
    petKey: "eagle",
    petName: "Đại Bàng",
    petEmoji: "<a:eagle:1531537266042736731>",
    petLvl: 62,
  },
  {
    userId: "bot_pvp_11",
    name: "Phoenix",
    classKey: "archer",
    characterAsset: "Archer_female.png",
    battleRank: "Legendary",
    battleLp: 45,
    lvl: 70,
    statPts: 850,
    weapon: { name: "Cung Phượng Hoàng SunBow +11", enhance: 11, power: 3800, subType: "sunbow" },
    armor: { name: "Áo Choàng Lông Phượng +11", enhance: 11, power: 2250 },
    helmet: { name: "Trâm Cài Lửa Thiêng +11", enhance: 11, power: 1650 },
    boots: { name: "Chiến Hài Lửa Bất Diệt +11", enhance: 11, power: 1650 },
    petKey: "sabertiger",
    petName: "Hổ Răng Kiếm",
    petEmoji: "<a:sabertiger:1531537287836340255>",
    petLvl: 68,
  },
  {
    userId: "bot_pvp_12",
    name: "Ranger",
    classKey: "archer",
    characterAsset: "Archer_male.png",
    battleRank: "Legendary",
    battleLp: 10,
    lvl: 75,
    statPts: 950,
    weapon: { name: "Xà Tiễn Tàn Bạo +11", enhance: 11, power: 4100, subType: "axesnake" },
    armor: { name: "Giáp Vảy Rắn Độc +11", enhance: 11, power: 2450 },
    helmet: { name: "Mũ Đầu Xà Hoàng Gia +11", enhance: 11, power: 1800 },
    boots: { name: "Giày Trườn Bão Táp +11", enhance: 11, power: 1800 },
    petKey: "mammoth",
    petName: "Voi Ma Mút",
    petEmoji: "<a:mammoth:1531537276675559434>",
    petLvl: 72,
  },

  // --- Mythic Bots (Lv. 82 - 90, Champion Tier, Power ~76,000 - 110,000) ---
  {
    userId: "bot_pvp_13",
    name: "Titan",
    classKey: "paladin",
    characterAsset: "Paladin_male.png",
    battleRank: "Mythic",
    battleLp: 15,
    lvl: 82,
    statPts: 1250,
    weapon: { name: "Khiên Thần Titan Shieldhex +12", enhance: 12, power: 5100, subType: "shieldhex" },
    armor: { name: "Đại Giáp Thần Titan +12", enhance: 12, power: 3400 },
    helmet: { name: "Thiết Diện Cự Thần +12", enhance: 12, power: 2500 },
    boots: { name: "Chiến Hài Động Đất +12", enhance: 12, power: 2500 },
    petKey: "rockcat",
    petName: "Thạch Nham Miêu",
    petEmoji: "<:rockcat:1531002667680137417>",
    petLvl: 78,
  },
  {
    userId: "bot_pvp_14",
    name: "Colossus",
    classKey: "paladin",
    characterAsset: "Paladin_male.png",
    battleRank: "Mythic",
    battleLp: 35,
    lvl: 88,
    statPts: 1450,
    weapon: { name: "Búa Thần Khổng Lồ HolySword +13", enhance: 13, power: 5800, subType: "holysword" },
    armor: { name: "Thánh Giáp Thánh Quang +13", enhance: 13, power: 3900 },
    helmet: { name: "Mũ Hộ Vệ Bất Bại +13", enhance: 13, power: 2900 },
    boots: { name: "Giày Trụ Vững Vàng +13", enhance: 13, power: 2900 },
    petKey: "icebear",
    petName: "Băng Hùng",
    petEmoji: "<:icebear:1531002670121222354>",
    petLvl: 84,
  },
  {
    userId: "bot_pvp_15",
    name: "Reaper",
    classKey: "assassin",
    characterAsset: "Assassin_female.png",
    battleRank: "Mythic",
    battleLp: 50,
    lvl: 90,
    statPts: 1550,
    weapon: { name: "River of Blood Tuyệt Diệt +13", enhance: 13, power: 6200, subType: "riverofblood" },
    armor: { name: "Áo Choàng Huyết Nguyệt +13", enhance: 13, power: 3600 },
    helmet: { name: "Mặt Nạ Tử Thần +13", enhance: 13, power: 2700 },
    boots: { name: "Giày Hút Hồn +13", enhance: 13, power: 2700 },
    petKey: "moonwolf",
    petName: "Nguyệt Lang",
    petEmoji: "<:moonwolf:1531002665536983091>",
    petLvl: 86,
  },

  // --- Ancient Bots (Lv. 95 - 105, Overlord Tier, Power ~125,000 - 185,000) ---
  {
    userId: "bot_pvp_16",
    name: "Aegis",
    classKey: "paladin",
    characterAsset: "Paladin_male.png",
    battleRank: "Ancient",
    battleLp: 35,
    lvl: 98,
    statPts: 2100,
    weapon: { name: "Thánh Khiên Cổ Đại Shieldhex +14", enhance: 14, power: 8200, subType: "shieldhex" },
    armor: { name: "Cổ Đại Long Giáp +14", enhance: 14, power: 5500 },
    helmet: { name: "Vương Miện Cổ Đại Thần Hộ +14", enhance: 14, power: 4100 },
    boots: { name: "Ủng Cổ Thần Vĩnh Cửu +14", enhance: 14, power: 4100 },
    petKey: "argentinosaurus",
    petName: "Argentinosaurus",
    petEmoji: "<:Argentinosaurus:1531012502815772743>",
    petLvl: 94,
  },
  {
    userId: "bot_pvp_17",
    name: "Warlord",
    classKey: "warrior",
    characterAsset: "Warrior_male.png",
    battleRank: "Ancient",
    battleLp: 20,
    lvl: 105,
    statPts: 2400,
    weapon: { name: "Thánh Thương Spearhex Cổ Đại +14", enhance: 14, power: 8800, subType: "spearhex" },
    armor: { name: "Giáp Thống Lĩnh Chiến Trường +14", enhance: 14, power: 5800 },
    helmet: { name: "Mũ Bá Vương Cổ Đại +14", enhance: 14, power: 4400 },
    boots: { name: "Ủng Chinh Phục Thế Giới +14", enhance: 14, power: 4400 },
    petKey: "tyrannosaurus",
    petName: "Tyrannosaurus",
    petEmoji: "<:Tyrannosaurus:1531012505105596478>",
    petLvl: 96,
  },

  // --- Divine Bots (Lv. 120 - 130, Supreme God Tier, Power ~190,000 - 310,000) ---
  {
    userId: "bot_pvp_18",
    name: "Phantom",
    classKey: "assassin",
    characterAsset: "Assassin_male.png",
    battleRank: "Divine",
    battleLp: 45,
    lvl: 122,
    statPts: 3200,
    weapon: { name: "Dusk and Dawn Tuyệt Thế +15", enhance: 15, power: 12500, subType: "duskanddawn" },
    armor: { name: "Thần Giáp Vô Hình Thần Thánh +15", enhance: 15, power: 8200 },
    helmet: { name: "Mặt Nạ Thần Linh Thượng Giới +15", enhance: 15, power: 6200 },
    boots: { name: "Giày Vượt Không Gian Thần Tốc +15", enhance: 15, power: 6200 },
    petKey: "phoenix",
    petName: "Phượng Hoàng",
    petEmoji: "<:Phoenix:1531346250903851188>",
    petLvl: 99,
  },
  {
    userId: "bot_pvp_19",
    name: "Berserk",
    classKey: "warrior",
    characterAsset: "Warrior_male.png",
    battleRank: "Divine",
    battleLp: 80,
    lvl: 128,
    statPts: 3600,
    weapon: { name: "Thần Kiếm Eclipsesoul Divine +15", enhance: 15, power: 13800, subType: "eclipsesoul" },
    armor: { name: "Thánh Giáp Thần Long Tối Cao +15", enhance: 15, power: 9200 },
    helmet: { name: "Thần Mão Long Vương +15", enhance: 15, power: 6800 },
    boots: { name: "Chiến Hài Đạp Thiên Thần Thánh +15", enhance: 15, power: 6800 },
    petKey: "shenlong",
    petName: "Thần Long",
    petEmoji: "<:Shenlong:1531346248525807698>",
    petLvl: 100,
  }
];

const RANK_PROFILES = {
  Common: { level: 20, statPts: 120, enhance: 4, weapon: 450, armor: 250, helmet: 180, boots: 180, lp: 20 },
  Rare: { level: 30, statPts: 250, enhance: 6, weapon: 950, armor: 550, helmet: 400, boots: 400, lp: 35 },
  Epic: { level: 45, statPts: 480, enhance: 8, weapon: 1800, armor: 1050, helmet: 750, boots: 750, lp: 50 },
  Legendary: { level: 62, statPts: 780, enhance: 10, weapon: 3400, armor: 2000, helmet: 1450, boots: 1450, lp: 65 },
  Mythic: { level: 80, statPts: 1300, enhance: 12, weapon: 6000, armor: 3800, helmet: 2800, boots: 2800, lp: 80 },
  Ancient: { level: 96, statPts: 2200, enhance: 14, weapon: 9500, armor: 6200, helmet: 4500, boots: 4500, lp: 95 },
  Divine: { level: 120, statPts: 3400, enhance: 15, weapon: 14000, armor: 9000, helmet: 6800, boots: 6800, lp: 110 },
};

const BOT_NAMES = {
  Common: ["Pebble", "Cinder", "Mist", "Scout", "Quill", "Riven", "Drift", "Ember", "Stray", "Pulse"],
  Rare: ["Silverfang", "Ironveil", "Stormguard", "Nightbloom", "Redmark", "Dawnpiercer", "Wildthorn", "Riftwalker", "Ashen", "Blueflare"],
  Epic: ["Spellrend", "Frostwing", "Grimward", "Starfall", "Emberkin", "Voidstep", "Thornveil", "Mooncrest", "Arcshot", "Hexbinder"],
  Legendary: ["Sunbreaker", "Warhowl", "Skyhunter", "Bloodnova", "Stormreign", "Dreadlance", "Dawnfire", "Nightcrest", "Ironstorm", "Soulflare"],
  Mythic: ["Titanborn", "Astralfang", "Dragonwake", "Netherguard", "Flamewraith", "Frostwrath", "Oathbreaker", "Celestial", "Doomcaller", "Riftlord"],
  Ancient: ["AncientOne", "Worldsplitter", "Voidmarshal", "Starforged", "Runebane", "Stormoracle", "Deathcrown", "Aetherion", "Dawnrelic", "Nightsovereign"],
  Divine: ["Godslayer", "Eternalknight", "Seraphim", "Ragnarok", "ImmortalEdge", "DivineWard", "Heavensfall", "Soulking", "Omniarch", "LastJudgement"],
};

const BOT_ARCHETYPES = [
  { classKey: "warrior", weaponKey: "firesword", asset: "Warrior_male.png" },
  { classKey: "assassin", weaponKey: "shadowdagger", asset: "Assassin_male.png" },
  { classKey: "archer", weaponKey: "gravitybow", asset: "Archer_male.png" },
  { classKey: "mage", weaponKey: "bluestaff", asset: "Mage_male.png" },
  { classKey: "paladin", weaponKey: "shieldhex", asset: "Paladin_male.png" },
  { classKey: "warrior", weaponKey: "spearhex", asset: "Warrior_female.png" },
  { classKey: "assassin", weaponKey: "bladesorrow", asset: "Assassin_female.png" },
  { classKey: "mage", weaponKey: "demonbook", asset: "Mage_female.png" },
  { classKey: "warrior", weaponKey: "thorshammer", asset: "Warrior_male.png" },
  { classKey: "mage", weaponKey: "odinhammer", asset: "Mage_female.png" },
];

const PET_PROFILES = [
  ["bee", "Ong", "🐝"],
  ["snail", "Ốc Sên", "🐌"],
  ["ladybug", "Bọ Rùa", "🐞"],
  ["duck", "Vịt", "🦆"],
  ["rooster", "Gà Trống", "🐓"],
  ["cow", "Bò", "🐄"],
  ["monkey", "Khỉ", "🐒"],
  ["horse", "Ngựa", "🐎"],
  ["scorpion", "Bọ Cạp", "🦂"],
  ["eagle", "Đại Bàng", "🦅"],
];

const createAdditionalBots = () => Object.entries(RANK_PROFILES).flatMap(([rank, profile]) =>
  Array.from({ length: 10 }, (_, index) => {
    const archetype = BOT_ARCHETYPES[index];
    const weapon = dungeonWeapons.find((item) => item.key === archetype.weaponKey);
    const pet = PET_PROFILES[index];
    const variation = index * 2;
    const gearVariation = index * 30;
    return {
      userId: `bot_pvp_extra_${rank.toLowerCase()}_${index + 1}`,
      name: BOT_NAMES[rank][index],
      classKey: archetype.classKey,
      characterAsset: archetype.asset,
      battleRank: rank,
      battleLp: profile.lp + index * 2,
      lvl: profile.level + Math.floor(index / 3),
      statPts: profile.statPts + variation,
      weapon: {
        name: weapon?.name || archetype.weaponKey,
        enhance: profile.enhance,
        power: profile.weapon + gearVariation,
        subType: archetype.weaponKey,
      },
      armor: { name: `${rank} Armor`, enhance: profile.enhance, power: profile.armor + index * 15 },
      helmet: { name: `${rank} Helm`, enhance: profile.enhance, power: profile.helmet + index * 10 },
      boots: { name: `${rank} Boots`, enhance: profile.enhance, power: profile.boots + index * 10 },
      petKey: pet[0],
      petName: pet[1],
      petEmoji: pet[2],
      petLvl: Math.min(100, profile.level - 2 + index),
    };
  })
);

BOT_NPC_LIST.push(...createAdditionalBots());

const allocateBotStats = (botData) => {
  const pts = botData.statPts;
  if (botData.classKey === "paladin") {
    return {
      vigor: Math.floor(pts * 0.48), pr: Math.floor(pts * 0.22), mr: Math.floor(pts * 0.16),
      str: Math.floor(pts * 0.14), dex: Math.max(15, Math.floor(pts * 0.04)), int: 10, arc: 10,
    };
  }
  if (botData.classKey === "assassin") {
    return {
      dex: Math.floor(pts * 0.42), str: Math.floor(pts * 0.26), arc: Math.floor(pts * 0.14),
      vigor: Math.floor(pts * 0.14), pr: Math.max(10, Math.floor(pts * 0.04)), mr: 10, int: 10,
    };
  }
  if (botData.classKey === "mage") {
    return {
      int: Math.floor(pts * 0.46), arc: Math.floor(pts * 0.24), mr: Math.floor(pts * 0.14),
      vigor: Math.floor(pts * 0.14), pr: 10, str: 10, dex: Math.max(15, Math.floor(pts * 0.04)),
    };
  }
  if (botData.classKey === "archer") {
    return {
      dex: Math.floor(pts * 0.45), str: Math.floor(pts * 0.22), vigor: Math.floor(pts * 0.18),
      pr: Math.floor(pts * 0.10), arc: Math.floor(pts * 0.05), int: 10, mr: 10,
    };
  }
  return {
    str: Math.floor(pts * 0.38), vigor: Math.floor(pts * 0.34), pr: Math.floor(pts * 0.14),
    dex: Math.floor(pts * 0.14), int: 10, mr: 10, arc: 10,
  };
};

const getWeaponCatalog = (subType) => dungeonWeapons.find((item) => item.key === subType);

const buildItem = (botData, slot, itemData) => {
  const isWeapon = slot === "weapon";
  const weaponCatalog = isWeapon ? getWeaponCatalog(itemData.subType) : null;
  const cleanName = String(itemData.name || slot).replace(/\s+\+\d+$/, "");
  return {
    id: `${slot[0]}_${botData.userId}`,
    uid: `bot-${botData.userId}-${slot}`,
    name: cleanName,
    slot,
    type: slot,
    subType: isWeapon ? (weaponCatalog?.name || itemData.subType || "") : undefined,
    rarity: botData.battleRank,
    quality: 100,
    enhance: itemData.enhance,
    upgradeLevel: itemData.enhance,
    power: itemData.power,
    tier: botData.battleRank,
    emoji: weaponCatalog?.emoji || (isWeapon ? "🗡️" : undefined),
    imageKey: isWeapon && weaponCatalog ? `Weapon/${weaponCatalog.key}.png` : undefined,
  };
};

const buildBotState = (botData) => {
  const weaponItem = buildItem(botData, "weapon", botData.weapon);
  const armorItem = buildItem(botData, "armor", botData.armor);
  const helmetItem = buildItem(botData, "helmet", botData.helmet);
  const bootsItem = buildItem(botData, "boots", botData.boots);
  const itemsList = [weaponItem, armorItem, helmetItem, bootsItem];
  const totalGearPower = itemsList.reduce((sum, item) => sum + (item.power || 0), 0);
  const calculatedPower = botData.statPts * 30 + totalGearPower * 3;
  const petObj = {
    id: `pet_${botData.userId}`,
    key: botData.petKey,
    speciesKey: botData.petKey,
    name: botData.petName,
    level: botData.petLvl,
    tier: botData.battleRank,
    emoji: botData.petEmoji,
  };
  return {
    isBattleBot: true,
    coke: 5000000,
    level: botData.lvl,
    "rpg.name": botData.name,
    "rpg.classKey": botData.classKey,
    "rpg.characterAsset": botData.characterAsset,
    "rpg.level": botData.lvl,
    "rpg.stats": allocateBotStats(botData),
    "rpg.power": calculatedPower,
    "rpg.battleRank": botData.battleRank,
    "rpg.battleLp": botData.battleLp,
    "rpg.seasonWins": 35,
    "rpg.seasonLosses": 8,
    "rpg.items": itemsList,
    "rpg.equipped": { weapon: weaponItem.id, armor: armorItem.id, helmet: helmetItem.id, boots: bootsItem.id },
    "rpg.equippedWeapon": weaponItem,
    "rpg.equippedArmor": armorItem,
    "rpg.equippedHelmet": helmetItem,
    "rpg.equippedBoots": bootsItem,
    "rpg.equippedPet": petObj,
    "rpg.pets": [petObj],
  };
};

const isBotReady = (existing, botData, desiredState) => {
  if (!existing?.isBattleBot || existing.rpg?.classKey !== botData.classKey) return false;
  if (existing.rpg?.battleRank !== botData.battleRank || Number(existing.rpg?.power) !== Number(desiredState["rpg.power"])) return false;
  const items = existing.rpg?.items || [];
  return ["weapon", "armor", "helmet", "boots"].every((slot) => {
    const actual = items.find((item) => item.slot === slot);
    const expected = desiredState["rpg.items"].find((item) => item.slot === slot);
    return actual && expected && actual.uid && actual.rarity === expected.rarity &&
      Number(actual.upgradeLevel) === Number(expected.upgradeLevel) &&
      (!expected.subType || actual.subType === expected.subType) &&
      (!expected.emoji || actual.emoji === expected.emoji);
  });
};

async function seedBattleBots() {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (uri) await mongoose.connect(uri);
  }

  const botIds = BOT_NPC_LIST.map((bot) => bot.userId);
  const existingBots = await User.find({ userId: { $in: botIds } }).exec();
  const existingById = new Map(existingBots.map((bot) => [bot.userId, bot]));
  const writes = [];
  let created = 0;
  let repaired = 0;
  let unchanged = 0;

  for (const botData of BOT_NPC_LIST) {
    const desiredState = buildBotState(botData);
    const existing = existingById.get(botData.userId);
    if (isBotReady(existing, botData, desiredState)) {
      unchanged += 1;
      continue;
    }
    writes.push(User.updateOne({ userId: botData.userId }, { $set: desiredState }, { upsert: true }));
    if (existing) repaired += 1;
    else created += 1;
  }

  await Promise.all(writes);
  console.log(`✅ Battle Bot roster ready: ${BOT_NPC_LIST.length} (${created} created, ${repaired} repaired, ${unchanged} unchanged).`);
}

if (require.main === module) {
  seedBattleBots().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = seedBattleBots;
module.exports.BOT_NPC_LIST = BOT_NPC_LIST;
module.exports.buildBotState = buildBotState;
