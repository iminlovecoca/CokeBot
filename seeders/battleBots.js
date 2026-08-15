const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const BOT_NPC_LIST = [
  // Common Bots
  { userId: "bot_pvp_1", name: "Shadow", classKey: "assassin", battleRank: "Common", battleLp: 20, weapon: "Dao Săn Đêm +4", enhance: 4, petKey: "bee", petName: "Ong", petEmoji: "🐝", petLvl: 15, lvl: 20, statPts: 50 },
  { userId: "bot_pvp_2", name: "Viper", classKey: "assassin", battleRank: "Common", battleLp: 35, weapon: "Song Đao Thép +5", enhance: 5, petKey: "snail", petName: "Ốc Sên", petEmoji: "🐌", petLvl: 18, lvl: 22, statPts: 55 },
  { userId: "bot_pvp_3", name: "Ghost", classKey: "assassin", battleRank: "Common", battleLp: 15, weapon: "Dao Găm Thép +4", enhance: 4, petKey: "ladybug", petName: "Bọ Rùa", petEmoji: "🐞", petLvl: 15, lvl: 18, statPts: 45 },

  // Rare Bots
  { userId: "bot_pvp_4", name: "Kratos", classKey: "warrior", battleRank: "Rare", battleLp: 15, weapon: "Thương Bạc +6", enhance: 6, petKey: "duck", petName: "Vịt", petEmoji: "🦆", petLvl: 25, lvl: 30, statPts: 80 },
  { userId: "bot_pvp_5", name: "Valkyrie", classKey: "warrior", battleRank: "Rare", battleLp: 40, weapon: "Trọng Kiếm Thép +7", enhance: 7, petKey: "rooster", petName: "Gà Trống", petEmoji: "🐓", petLvl: 28, lvl: 35, statPts: 95 },
  { userId: "bot_pvp_6", name: "Lancer", classKey: "warrior", battleRank: "Rare", battleLp: 25, weapon: "Rìu Chiến +6", enhance: 6, petKey: "cow", petName: "Bò", petEmoji: "🐄", petLvl: 26, lvl: 32, statPts: 88 },

  // Epic Bots
  { userId: "bot_pvp_7", name: "Ignis", classKey: "mage", battleRank: "Epic", battleLp: 10, weapon: "Gậy Phép Tinh Thạch +8", enhance: 8, petKey: "monkey", petName: "Khỉ", petEmoji: "🐒", petLvl: 38, lvl: 45, statPts: 130 },
  { userId: "bot_pvp_8", name: "Frost", classKey: "mage", battleRank: "Epic", battleLp: 30, weapon: "Gậy Băng Sương +9", enhance: 9, petKey: "horse", petName: "Ngựa", petEmoji: "🐎", petLvl: 40, lvl: 50, statPts: 150 },
  { userId: "bot_pvp_9", name: "Arcane", classKey: "mage", battleRank: "Epic", battleLp: 45, weapon: "Quyền Trượng Ma Thuật +8", enhance: 8, petKey: "scorpion", petName: "Bọ Cạp", petEmoji: "🦂", petLvl: 39, lvl: 48, statPts: 140 },

  // Legendary Bots
  { userId: "bot_pvp_10", name: "Hawkeye", classKey: "archer", battleRank: "Legendary", battleLp: 25, weapon: "Cung Trọng Lực GravityBow +10", enhance: 10, petKey: "eagle", petName: "Đại Bàng", petEmoji: "<a:eagle:1531537266042736731>", petLvl: 55, lvl: 65, statPts: 220 },
  { userId: "bot_pvp_11", name: "Phoenix", classKey: "archer", battleRank: "Legendary", battleLp: 45, weapon: "Cung Phượng Hoàng +11", enhance: 11, petKey: "sabertiger", petName: "Hổ Răng Kiếm", petEmoji: "<a:sabertiger:1531537287836340255>", petLvl: 58, lvl: 70, statPts: 250 },
  { userId: "bot_pvp_12", name: "Ranger", classKey: "archer", battleRank: "Legendary", battleLp: 10, weapon: "Cung Thần Gió +10", enhance: 10, petKey: "mammoth", petName: "Voi Ma Mút", petEmoji: "<a:mammoth:1531537276675559434>", petLvl: 52, lvl: 62, statPts: 210 },

  // Mythic Bots
  { userId: "bot_pvp_13", name: "Titan", classKey: "tanker", battleRank: "Mythic", battleLp: 15, weapon: "Khiên Thần Titan +12", enhance: 12, petKey: "rockcat", petName: "Thạch Nham Miêu", petEmoji: "<:rockcat:1531002667680137417>", petLvl: 70, lvl: 80, statPts: 320 },
  { userId: "bot_pvp_14", name: "Colossus", classKey: "tanker", battleRank: "Mythic", battleLp: 35, weapon: "Búa Thần Khổng Lồ +13", enhance: 13, petKey: "icebear", petName: "Băng Hùng", petEmoji: "<:icebear:1531002670121222354>", petLvl: 72, lvl: 85, statPts: 350 },
  { userId: "bot_pvp_15", name: "Reaper", classKey: "assassin", battleRank: "Mythic", battleLp: 50, weapon: "River of Blood +12", enhance: 12, petKey: "moonwolf", petName: "Nguyệt Lang", petEmoji: "<:moonwolf:1531002665536983091>", petLvl: 68, lvl: 78, statPts: 310 },

  // Ancient Bots
  { userId: "bot_pvp_16", name: "Aegis", classKey: "tanker", battleRank: "Ancient", battleLp: 35, weapon: "Thánh Khiên Cổ Đại +14", enhance: 14, petKey: "argentinosaurus", petName: "Thảo Thạch Long", petEmoji: "<:argentinosaurus:1531002657781702758>", petLvl: 85, lvl: 95, statPts: 450 },
  { userId: "bot_pvp_17", name: "Warlord", classKey: "warrior", battleRank: "Ancient", battleLp: 20, weapon: "Thánh Kiếm Cổ Đại +14", enhance: 14, petKey: "spinosaurus", petName: "Gai Vương Long", petEmoji: "<:spinosaurus:1531002659618820127>", petLvl: 88, lvl: 98, statPts: 480 },

  // Divine Bots
  { userId: "bot_pvp_18", name: "Phantom", classKey: "assassin", battleRank: "Divine", battleLp: 45, weapon: "Tử Thần Liềm Thần Thánh +15", enhance: 15, petKey: "phoenix", petName: "Phượng Hoàng Bất Tử", petEmoji: "<a:phoenix:1530999516629569658>", petLvl: 99, lvl: 120, statPts: 650 },
  { userId: "bot_pvp_19", name: "Berserk", classKey: "warrior", battleRank: "Divine", battleLp: 80, weapon: "Thánh Đao Vô Song Divine +15", enhance: 15, petKey: "dragon", petName: "Thần Rồng Vương", petEmoji: "<a:dragon:1530999513374920806>", petLvl: 99, lvl: 125, statPts: 700 }
];

async function seedBattleBots() {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (uri) await mongoose.connect(uri);
  }

  console.log("🚀 Seeding & Force Updating 19 High-Tier Equipped Battle Bot NPCs in MongoDB...");

  for (const botData of BOT_NPC_LIST) {
    const pts = botData.statPts;
    const statsObj = {
      vigor: Math.floor(pts * 0.25),
      pr: Math.floor(pts * 0.15),
      mr: Math.floor(pts * 0.10),
      str: Math.floor(pts * 0.25),
      dex: Math.floor(pts * 0.15),
      int: Math.floor(pts * 0.05),
      arc: Math.floor(pts * 0.05)
    };

    const calculatedPower = pts * 120;
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
          "rpg.level": botData.lvl,
          "rpg.stats": statsObj,
          "rpg.power": calculatedPower,
          "rpg.battleRank": botData.battleRank,
          "rpg.battleLp": botData.battleLp,
          "rpg.seasonWins": 25,
          "rpg.seasonLosses": 10,
          "rpg.equippedWeapon": { id: `weapon_${botData.userId}`, name: botData.weapon, enhance: botData.enhance, slot: "weapon" },
          "rpg.equippedPet": petObj,
          "rpg.pets": [petObj]
        }
      },
      { upsert: true }
    );

    console.log(`✅ Updated Bot: ${botData.name} (${botData.battleRank} | Lvl.${botData.lvl} | Pet: ${botData.petName})`);
  }

  console.log("🎉 All 19 Battle Bot NPCs successfully updated with official Pet keys and emojis!");
}

if (require.main === module) {
  seedBattleBots().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = seedBattleBots;
