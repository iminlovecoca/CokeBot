const User = require('../models/User');
const BattleRankService = require('../services/battleRankService');

const TIER_POWER_MAP = {
  Common: { minPower: 5000, maxPower: 7000, minLvl: 18, maxLvl: 22 },
  Rare: { minPower: 9500, maxPower: 12000, minLvl: 30, maxLvl: 35 },
  Epic: { minPower: 15000, maxPower: 19000, minLvl: 45, maxLvl: 50 },
  Legendary: { minPower: 25000, maxPower: 32000, minLvl: 62, maxLvl: 70 },
  Mythic: { minPower: 40000, maxPower: 55000, minLvl: 78, maxLvl: 85 },
  Ancient: { minPower: 54000, maxPower: 60000, minLvl: 95, maxLvl: 98 },
  Divine: { minPower: 78000, maxPower: 90000, minLvl: 120, maxLvl: 125 }
};

class BattleBotEngine {
  constructor() {
    this.intervalTimer = null;
    this.rankService = new BattleRankService();
  }

  async initialize() {
    console.log('🤖 Battle Bot Engine initializing with Tier-Locked Power & Equipment...');
    await this.syncBotStatsWithTierMap();

    // Run periodic bot simulation every 30 minutes
    const runSimulation = async () => {
      try {
        await this.syncBotStatsWithTierMap();
        await this.simulateBotBattleClimb();
      } catch (err) {
        console.error('[BATTLE_BOT_ENGINE] Simulation error:', err);
      }
    };
    this.intervalTimer = setInterval(() => {
      runSimulation().catch(err => console.error('[BATTLE_BOT_ENGINE] Unhandled interval error:', err));
    }, 30 * 60 * 1000);
  }

  async syncBotStatsWithTierMap() {
    const bots = await User.find({ isBattleBot: true });
    for (const bot of bots) {
      const rank = bot.rpg?.battleRank || 'Common';
      const tierConfig = TIER_POWER_MAP[rank] || TIER_POWER_MAP.Common;

      const targetLvl = Math.floor(tierConfig.minLvl + Math.random() * (tierConfig.maxLvl - tierConfig.minLvl + 1));
      const targetPower = Math.floor(tierConfig.minPower + Math.random() * (tierConfig.maxPower - tierConfig.minPower));

      bot.level = Math.max(bot.level || 1, targetLvl);
      if (!bot.rpg) bot.rpg = {};
      bot.rpg.level = bot.level;
      bot.rpg.power = targetPower;

      bot.markModified('rpg');
    }
    await Promise.all(bots.map(bot => bot.save().catch(() => {})));
  }

  async simulateBotBattleClimb() {
    const bots = await User.find({ isBattleBot: true });
    if (bots.length < 2) return;

    const b1Idx = Math.floor(Math.random() * bots.length);
    let b2Idx = Math.floor(Math.random() * bots.length);
    while (b2Idx === b1Idx) {
      b2Idx = Math.floor(Math.random() * bots.length);
    }

    const bot1 = bots[b1Idx];
    const bot2 = bots[b2Idx];

    const b1Roll = (bot1.rpg?.power || 1000) * (0.85 + Math.random() * 0.3);
    const b2Roll = (bot2.rpg?.power || 1000) * (0.85 + Math.random() * 0.3);

    const winner = b1Roll >= b2Roll ? bot1 : bot2;
    const loser = b1Roll >= b2Roll ? bot2 : bot1;

    await this.rankService.processBattleLp(winner, loser);
    await this.syncBotStatsWithTierMap();
  }
}

module.exports = new BattleBotEngine();
