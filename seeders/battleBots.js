const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const BOT_NPC_LIST = [
  { userId: "bot_pvp_1", name: "Shadow", classKey: "assassin", battleRank: "Common", battleLp: 20 },
  { userId: "bot_pvp_2", name: "Viper", classKey: "assassin", battleRank: "Common", battleLp: 35 },
  { userId: "bot_pvp_3", name: "Kratos", classKey: "warrior", battleRank: "Rare", battleLp: 15 },
  { userId: "bot_pvp_4", name: "Valkyrie", classKey: "warrior", battleRank: "Rare", battleLp: 40 },
  { userId: "bot_pvp_5", name: "Ignis", classKey: "mage", battleRank: "Epic", battleLp: 10 },
  { userId: "bot_pvp_6", name: "Frost", classKey: "mage", battleRank: "Epic", battleLp: 30 },
  { userId: "bot_pvp_7", name: "Hawkeye", classKey: "archer", battleRank: "Legendary", battleLp: 25 },
  { userId: "bot_pvp_8", name: "Phoenix", classKey: "archer", battleRank: "Legendary", battleLp: 45 },
  { userId: "bot_pvp_9", name: "Titan", classKey: "tanker", battleRank: "Mythic", battleLp: 15 },
  { userId: "bot_pvp_10", name: "Aegis", classKey: "tanker", battleRank: "Ancient", battleLp: 35 },
  { userId: "bot_pvp_11", name: "Phantom", classKey: "assassin", battleRank: "Common", battleLp: 45 },
  { userId: "bot_pvp_12", name: "Berserk", classKey: "warrior", battleRank: "Rare", battleLp: 25 }
];

async function seedBattleBots() {
  if (mongoose.connection.readyState !== 1) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (uri) await mongoose.connect(uri);
  }

  console.log("🚀 Seeding 12 Battle Bot NPCs with English IGNs into MongoDB...");

  for (const botData of BOT_NPC_LIST) {
    const existing = await User.findOne({ userId: botData.userId });
    if (!existing) {
      await User.create({
        userId: botData.userId,
        isBattleBot: true,
        coke: 500000,
        level: 15,
        rpg: {
          name: botData.name,
          classKey: botData.classKey,
          level: 15,
          power: 1200,
          battleRank: botData.battleRank,
          battleLp: botData.battleLp,
          seasonWins: 10,
          seasonLosses: 5,
          equippedWeapon: { id: "shadow_blade", name: "Shadow Blade +4", enhance: 4 },
          equippedPet: { key: "wolf", level: 10, name: "Wolf" }
        }
      });
      console.log(`✅ Created Bot NPC: ${botData.name} (${botData.classKey})`);
    } else {
      existing.isBattleBot = true;
      existing.rpg.name = botData.name;
      existing.markModified("rpg");
      await existing.save();
    }
  }

  console.log("🎉 Battle Bot NPCs seeding complete!");
}

if (require.main === module) {
  seedBattleBots().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = seedBattleBots;
