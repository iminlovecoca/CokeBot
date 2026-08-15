const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const BOT_NPC_LIST = [
  // --- Common Bots (Lv. 20 - 24, Beginner Tier, Power ~2,000 - 3,500) ---
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

  // --- Rare Bots (Lv. 30 - 38, Skilled Tier, Power ~5,000 - 9,000) ---
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

  // --- Epic Bots (Lv. 48 - 55, Veteran Tier, Power ~12,000 - 20,000) ---
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

  // --- Legendary Bots (Lv. 65 - 75, Elite Master Tier, Power ~25,000 - 45,000) ---
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

  // --- Mythic Bots (Lv. 82 - 90, Champion Tier, Power ~55,000 - 95,000) ---
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

  // --- Ancient Bots (Lv. 95 - 105, Overlord Tier, Power ~110,000 - 180,000) ---
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

  // --- Divine Bots (Lv. 120 - 130, Supreme God Tier, Power ~220,000 - 350,000) ---
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

async function seedBattleBots() {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (uri) await mongoose.connect(uri);
  }

  console.log("🚀 Seeding & Buffing 19 Extreme High-Tier Competitive Battle Bot NPCs in MongoDB...");

  for (const botData of BOT_NPC_LIST) {
    const pts = botData.statPts;
    let statsObj;

    // Allocate stats dynamically based on Class Archetype
    if (botData.classKey === "paladin") {
      // Tank: Heavy Vigor & Solid Defenses
      statsObj = {
        vigor: Math.floor(pts * 0.48),
        pr: Math.floor(pts * 0.22),
        mr: Math.floor(pts * 0.16),
        str: Math.floor(pts * 0.14),
        dex: Math.max(15, Math.floor(pts * 0.04)),
        int: 10,
        arc: 10
      };
    } else if (botData.classKey === "assassin") {
      // Assassin: High Speed DEX, Lethal Damage STR & Crit ARC
      statsObj = {
        dex: Math.floor(pts * 0.42),
        str: Math.floor(pts * 0.26),
        arc: Math.floor(pts * 0.14),
        vigor: Math.floor(pts * 0.14),
        pr: Math.max(10, Math.floor(pts * 0.04)),
        mr: 10,
        int: 10
      };
    } else if (botData.classKey === "mage") {
      // Mage: Devastating INT Spell Power & Mana ARC
      statsObj = {
        int: Math.floor(pts * 0.46),
        arc: Math.floor(pts * 0.24),
        mr: Math.floor(pts * 0.14),
        vigor: Math.floor(pts * 0.14),
        pr: 10,
        str: 10,
        dex: Math.max(15, Math.floor(pts * 0.04))
      };
    } else if (botData.classKey === "archer") {
      // Archer: High Range DEX & Speed
      statsObj = {
        dex: Math.floor(pts * 0.45),
        str: Math.floor(pts * 0.22),
        vigor: Math.floor(pts * 0.18),
        pr: Math.floor(pts * 0.10),
        arc: Math.floor(pts * 0.05),
        int: 10,
        mr: 10
      };
    } else {
      // Warrior: Balanced DPS & Resilient Bruiser
      statsObj = {
        str: Math.floor(pts * 0.38),
        vigor: Math.floor(pts * 0.34),
        pr: Math.floor(pts * 0.14),
        dex: Math.floor(pts * 0.14),
        int: 10,
        mr: 10,
        arc: 10
      };
    }

    const weaponItem = {
      id: `w_${botData.userId}`,
      name: botData.weapon.name,
      slot: "weapon",
      type: "weapon",
      subType: botData.weapon.subType || "",
      enhance: botData.weapon.enhance,
      power: botData.weapon.power,
      tier: botData.battleRank
    };

    const armorItem = {
      id: `a_${botData.userId}`,
      name: botData.armor.name,
      slot: "armor",
      type: "armor",
      enhance: botData.armor.enhance,
      power: botData.armor.power,
      tier: botData.battleRank
    };

    const helmetItem = {
      id: `h_${botData.userId}`,
      name: botData.helmet.name,
      slot: "helmet",
      type: "helmet",
      enhance: botData.helmet.enhance,
      power: botData.helmet.power,
      tier: botData.battleRank
    };

    const bootsItem = {
      id: `b_${botData.userId}`,
      name: botData.boots.name,
      slot: "boots",
      type: "boots",
      enhance: botData.boots.enhance,
      power: botData.boots.power,
      tier: botData.battleRank
    };

    const itemsList = [weaponItem, armorItem, helmetItem, bootsItem];
    const totalGearPower = weaponItem.power + armorItem.power + helmetItem.power + bootsItem.power;
    const calculatedPower = pts * 30 + totalGearPower * 3;

    const petObj = {
      id: `pet_${botData.userId}`,
      key: botData.petKey,
      speciesKey: botData.petKey,
      name: botData.petName,
      level: botData.petLvl,
      tier: botData.battleRank,
      emoji: botData.petEmoji
    };

    await User.updateOne(
      { userId: botData.userId },
      {
        $set: {
          isBattleBot: true,
          coke: 5000000,
          level: botData.lvl,
          "rpg.name": botData.name,
          "rpg.classKey": botData.classKey,
          "rpg.characterAsset": botData.characterAsset,
          "rpg.level": botData.lvl,
          "rpg.stats": statsObj,
          "rpg.power": calculatedPower,
          "rpg.battleRank": botData.battleRank,
          "rpg.battleLp": botData.battleLp,
          "rpg.seasonWins": 35,
          "rpg.seasonLosses": 8,
          "rpg.items": itemsList,
          "rpg.equipped": {
            weapon: weaponItem.id,
            armor: armorItem.id,
            helmet: helmetItem.id,
            boots: bootsItem.id
          },
          "rpg.equippedWeapon": weaponItem,
          "rpg.equippedArmor": armorItem,
          "rpg.equippedHelmet": helmetItem,
          "rpg.equippedBoots": bootsItem,
          "rpg.equippedPet": petObj,
          "rpg.pets": [petObj]
        }
      },
      { upsert: true }
    );

    console.log(`✅ Buffed Bot: ${botData.name} (${botData.battleRank} | ${botData.classKey} | Power: ${calculatedPower.toLocaleString()} | Weapon: ${weaponItem.name} [Power ${weaponItem.power}])`);
  }

  console.log("🎉 All 19 Battle Bot NPCs successfully upgraded with Full High-End Gear and Competitive Stats!");
}

if (require.main === module) {
  seedBattleBots().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = seedBattleBots;
