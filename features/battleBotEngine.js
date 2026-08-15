const User = require('../models/User');
const BattleRankService = require('../services/battleRankService');

const TARGET_TIER_DISTRIBUTION = [
  { rank: 'Common', count: 3 },
  { rank: 'Rare', count: 3 },
  { rank: 'Epic', count: 3 },
  { rank: 'Legendary', count: 3 },
  { rank: 'Mythic', count: 3 },
  { rank: 'Ancient', count: 2 },
  { rank: 'Divine', count: 2 }
];

const TIER_POWER_MAP = {
  Common: { minPower: 2000, maxPower: 2500, minLvl: 15, maxLvl: 20 },
  Rare: { minPower: 4500, maxPower: 5500, minLvl: 25, maxLvl: 30 },
  Epic: { minPower: 9000, maxPower: 11000, minLvl: 38, maxLvl: 45 },
  Legendary: { minPower: 21000, maxPower: 26000, minLvl: 52, maxLvl: 60 },
  Mythic: { minPower: 45000, maxPower: 55000, minLvl: 68, maxLvl: 75 },
  Ancient: { minPower: 90000, maxPower: 105000, minLvl: 85, maxLvl: 90 },
  Divine: { minPower: 180000, maxPower: 210000, minLvl: 95, maxLvl: 99 }
};

class BattleBotEngine {
  constructor() {
    this.intervalTimer = null;
    this.rankService = new BattleRankService();
  }

  async initialize() {
    console.log('🤖 Battle Bot Engine initializing with High-Tier Gear & Power Scaling...');
    await this.syncBotStatsWithHumanAverage();
    await this.balanceBotRankDistribution();

    // Run periodic bot simulation and tier re-balancing every 30 minutes
    this.intervalTimer = setInterval(async () => {
      try {
        await this.syncBotStatsWithHumanAverage();
        await this.simulateBotBattleClimb();
        await this.balanceBotRankDistribution();
      } catch (err) {
        console.error('[BATTLE_BOT_ENGINE] Simulation error:', err);
      }
    }, 30 * 60 * 1000);
  }

  async syncBotStatsWithHumanAverage() {
    const bots = await User.find({ isBattleBot: true });
    for (const bot of bots) {
      const rank = bot.rpg?.battleRank || 'Common';
      const tierConfig = TIER_POWER_MAP[rank] || TIER_POWER_MAP.Common;

      const randomPwr = Math.floor(tierConfig.minPower + Math.random() * (tierConfig.maxPower - tierConfig.minPower));
      const randomLvl = Math.floor(tierConfig.minLvl + Math.random() * (tierConfig.maxLvl - tierConfig.minLvl + 1));

      bot.level = randomLvl;
      if (!bot.rpg) bot.rpg = {};
      bot.rpg.level = randomLvl;
      bot.rpg.power = randomPwr;

      bot.markModified('rpg');
      await bot.save().catch(() => {});
    }
  }

  async balanceBotRankDistribution() {
    const bots = await User.find({ isBattleBot: true }).sort({ 'rpg.battleLp': -1 });
    if (bots.length < 19) return;

    let botIdx = 0;
    for (const tierConfig of TARGET_TIER_DISTRIBUTION) {
      for (let i = 0; i < tierConfig.count; i++) {
        if (botIdx < bots.length) {
          const bot = bots[botIdx];
          bot.rpg.battleRank = tierConfig.rank;
          bot.markModified('rpg');
          await bot.save().catch(() => {});
          botIdx++;
        }
      }
    }
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

    const b1Roll = (bot1.rpg?.power || 1000) * (0.8 + Math.random() * 0.4);
    const b2Roll = (bot2.rpg?.power || 1000) * (0.8 + Math.random() * 0.4);

    const winner = b1Roll >= b2Roll ? bot1 : bot2;
    const loser = b1Roll >= b2Roll ? bot2 : bot1;

    await this.rankService.processBattleLp(winner, loser);
  }
}

module.exports = new BattleBotEngine();
