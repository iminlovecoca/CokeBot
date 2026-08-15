const User = require('../models/User');
const BattleRankService = require('../services/battleRankService');

class BattleBotEngine {
  constructor() {
    this.intervalTimer = null;
    this.rankService = new BattleRankService();
  }

  async initialize() {
    console.log('🤖 Battle Bot Engine initializing...');
    await this.syncBotStatsWithHumanAverage();

    // Run periodic bot simulation every 30 minutes
    this.intervalTimer = setInterval(async () => {
      try {
        await this.syncBotStatsWithHumanAverage();
        await this.simulateBotBattleClimb();
      } catch (err) {
        console.error('[BATTLE_BOT_ENGINE] Simulation error:', err);
      }
    }, 30 * 60 * 1000);
  }

  async syncBotStatsWithHumanAverage() {
    // Calculate average level and power of real human players
    const humanStats = await User.aggregate([
      { $match: { isBattleBot: { $ne: true }, 'rpg.classKey': { $ne: null } } },
      {
        $group: {
          _id: null,
          avgLevel: { $avg: '$rpg.level' },
          avgPower: { $avg: '$rpg.power' }
        }
      }
    ]).catch(() => []);

    const avgLvl = Math.max(10, Math.round(humanStats[0]?.avgLevel || 15));
    const avgPwr = Math.max(500, Math.round(humanStats[0]?.avgPower || 1000));

    const bots = await User.find({ isBattleBot: true });
    for (const bot of bots) {
      // Dynamic variation between 85% and 115% of human average
      const pwrMultiplier = 0.85 + Math.random() * 0.3;
      const lvlVariation = Math.floor(Math.random() * 5) - 2;

      bot.level = Math.max(5, avgLvl + lvlVariation);
      if (!bot.rpg) bot.rpg = {};
      bot.rpg.level = bot.level;
      bot.rpg.power = Math.round(avgPwr * pwrMultiplier);

      bot.markModified('rpg');
      await bot.save().catch(() => {});
    }
  }

  async simulateBotBattleClimb() {
    const bots = await User.find({ isBattleBot: true });
    if (bots.length < 2) return;

    // Pick 2 random bots to simulate a match
    const b1Idx = Math.floor(Math.random() * bots.length);
    let b2Idx = Math.floor(Math.random() * bots.length);
    while (b2Idx === b1Idx) {
      b2Idx = Math.floor(Math.random() * bots.length);
    }

    const bot1 = bots[b1Idx];
    const bot2 = bots[b2Idx];

    // Determine winner based on power + random factor
    const b1Roll = (bot1.rpg?.power || 1000) * (0.8 + Math.random() * 0.4);
    const b2Roll = (bot2.rpg?.power || 1000) * (0.8 + Math.random() * 0.4);

    const winner = b1Roll >= b2Roll ? bot1 : bot2;
    const loser = b1Roll >= b2Roll ? bot2 : bot1;

    await this.rankService.processBattleLp(winner, loser);
  }
}

module.exports = new BattleBotEngine();
