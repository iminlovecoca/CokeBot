const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const BOT_NPC_LIST = [
  // Common Bots
  { userId: "bot_pvp_1", name: "Shadow", classKey: "assassin", battleRank: "Common", battleLp: 20, weapon: "Dao Săn Đêm +4", enhance: 4, pet: "Sói Tuyết", petLvl: 15, power: 2200 },
  { userId: "bot_pvp_2", name: "Viper", classKey: "assassin", battleRank: "Common", battleLp: 35, weapon: "Song Đao Thép +5", enhance: 5, pet: "Rắn Độc", petLvl: 18, power: 2500 },
  { userId: "bot_pvp_3", name: "Ghost", classKey: "assassin", battleRank: "Common", battleLp: 15, weapon: "Dao Găm Thép +4", enhance: 4, pet: "Sói Xám", petLvl: 15, power: 2100 },

  // Rare Bots
  { userId: "bot_pvp_4", name: "Kratos", classKey: "warrior", battleRank: "Rare", battleLp: 15, weapon: "Thương Bạc +6", enhance: 6, pet: "Hổ Trắng", petLvl: 25, power: 4500 },
  { userId: "bot_pvp_5", name: "Valkyrie", classKey: "warrior", battleRank: "Rare", battleLp: 40, weapon: "Trọng Kiếm Thép +7", enhance: 7, pet: "Hổ Răng Kiếm", petLvl: 28, power: 5200 },
  { userId: "bot_pvp_6", name: "Lancer", classKey: "warrior", battleRank: "Rare", battleLp: 25, weapon: "Rìu Chiến +6", enhance: 6, pet: "Hổ Báo", petLvl: 26, power: 4800 },

  // Epic Bots
  { userId: "bot_pvp_7", name: "Ignis", classKey: "mage", battleRank: "Epic", battleLp: 10, weapon: "Gậy Phép Tinh Thạch +8", enhance: 8, pet: "Voi Ma Mút", petLvl: 38, power: 9500 },
  { userId: "bot_pvp_8", name: "Frost", classKey: "mage", battleRank: "Epic", battleLp: 30, weapon: "Gậy Băng Sương +9", enhance: 9, pet: "Voi Đá", petLvl: 40, power: 11000 },
  { userId: "bot_pvp_9", name: "Arcane", classKey: "mage", battleRank: "Epic", battleLp: 45, weapon: "Quyền Trượng Ma Thuật +8", enhance: 8, pet: "Voi Tinh Thạch", petLvl: 39, power: 10200 },

  // Legendary Bots
  { userId: "bot_pvp_10", name: "Hawkeye", classKey: "archer", battleRank: "Legendary", battleLp: 25, weapon: "Cung Trọng Lực GravityBow +10", enhance: 10, pet: "Rồng Lửa", petLvl: 55, power: 22000 },
  { userId: "bot_pvp_11", name: "Phoenix", classKey: "archer", battleRank: "Legendary", battleLp: 45, weapon: "Cung Phượng Hoàng +11", enhance: 11, pet: "Rồng Xanh", petLvl: 58, power: 26000 },
  { userId: "bot_pvp_12", name: "Ranger", classKey: "archer", battleRank: "Legendary", battleLp: 10, weapon: "Cung Thần Gió +10", enhance: 10, pet: "Rồng Đỏ", petLvl: 52, power: 21000 },

  // Mythic Bots
  { userId: "bot_pvp_13", name: "Titan", classKey: "tanker", battleRank: "Mythic", battleLp: 15, weapon: "Khiên Thần Titan +12", enhance: 12, pet: "Kỳ Lân Phượng Hoàng", petLvl: 70, power: 48000 },
  { userId: "bot_pvp_14", name: "Colossus", classKey: "tanker", battleRank: "Mythic", battleLp: 35, weapon: "Búa Thần Khổng Lồ +13", enhance: 13, pet: "Phượng Hoàng Lửa", petLvl: 72, power: 55000 },
  { userId: "bot_pvp_15", name: "Reaper", classKey: "assassin", battleRank: "Mythic", battleLp: 50, weapon: "River of Blood +12", enhance: 12, pet: "Mãng Xà Hoàng Gia", petLvl: 68, power: 45000 },

  // Ancient Bots
  { userId: "bot_pvp_16", name: "Aegis", classKey: "tanker", battleRank: "Ancient", battleLp: 35, weapon: "Thánh Khiên Cổ Đại +14", enhance: 14, pet: "Rồng Thần Cổ Đại", petLvl: 85, power: 95000 },
  { userId: "bot_pvp_17", name: "Warlord", classKey: "warrior", battleRank: "Ancient", battleLp: 20, weapon: "Thánh Kiếm Cổ Đại +14", enhance: 14, pet: "Bạch Long Cổ Đại", petLvl: 88, power: 105000 },

  // Divine Bots
  { userId: "bot_pvp_18", name: "Phantom", classKey: "assassin", battleRank: "Divine", battleLp: 45, weapon: "Tử Thần Liềm Thần Thánh +15", enhance: 15, pet: "Rồng Thần Tối Cao Divine", petLvl: 99, power: 180000 },
  { userId: "bot_pvp_19", name: "Berserk", classKey: "warrior", battleRank: "Divine", battleLp: 80, weapon: "Thánh Đao Vô Song Divine +15", enhance: 15, pet: "Rồng Thần Hoàng Gia Divine", petLvl: 99, power: 210000 }
];

async function seedBattleBots() {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (uri) await mongoose.connect(uri);
  }

  console.log("🚀 Seeding 19 High-Tier Equipped Battle Bot NPCs into MongoDB...");

  for (const botData of BOT_NPC_LIST) {
    const existing = await User.findOne({ userId: botData.userId });
    const botLevel = Math.max(15, botData.petLvl);

    const rpgObj = {
      name: botData.name,
      classKey: botData.classKey,
      level: botLevel,
      power: botData.power,
      battleRank: botData.battleRank,
      battleLp: botData.battleLp,
      seasonWins: 25,
      seasonLosses: 10,
      equippedWeapon: { id: `weapon_${botData.userId}`, name: botData.weapon, enhance: botData.enhance },
      equippedPet: { key: "dragon", level: botData.petLvl, name: botData.pet, emoji: "🐲" }
    };

    if (!existing) {
      await User.create({
        userId: botData.userId,
        isBattleBot: true,
        coke: 5000000,
        level: botLevel,
        rpg: rpgObj
      });
      console.log(`✅ Created High-Tier Bot: ${botData.name} (${botData.battleRank} | Pwr: ${botData.power} | Wpn: ${botData.weapon})`);
    } else {
      existing.isBattleBot = true;
      existing.level = botLevel;
      existing.rpg = { ...existing.rpg, ...rpgObj };
      existing.markModified("rpg");
      await existing.save();
      console.log(`🔄 Updated High-Tier Bot: ${botData.name} (${botData.battleRank} | Pwr: ${botData.power} | Wpn: ${botData.weapon})`);
    }
  }

  console.log("🎉 High-Tier Battle Bot NPCs seeding complete!");
}

if (require.main === module) {
  seedBattleBots().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = seedBattleBots;
