const User = require('../models/User');
const BattleRankService = require('../services/battleRankService');

const TIER_POWER_MAP = {
  Common: { minPower: 6000, maxPower: 13000, minLvl: 18, maxLvl: 29 },
  Rare: { minPower: 13000, maxPower: 21000, minLvl: 30, maxLvl: 44 },
  Epic: { minPower: 25000, maxPower: 35000, minLvl: 45, maxLvl: 61 },
  Legendary: { minPower: 45000, maxPower: 62000, minLvl: 62, maxLvl: 79 },
  Mythic: { minPower: 76000, maxPower: 110000, minLvl: 78, maxLvl: 95 },
  Ancient: { minPower: 125000, maxPower: 185000, minLvl: 95, maxLvl: 119 },
  Divine: { minPower: 190000, maxPower: 310000, minLvl: 120, maxLvl: 140 }
};

class BattleBotEngine {
  constructor() {
    this.intervalTimer = null;
    this.rankService = new BattleRankService();
  }

  async initialize() {
    console.log('🤖 Battle Bot Engine initializing with Tier-Locked Power & Equipment...');
    await this.syncBotStatsWithTierMap();

    if (this.intervalTimer) clearInterval(this.intervalTimer);

    // Validate the static roster every 30 minutes. Bot rank/gear stays stable;
    // player-vs-bot matchmaking remains competitive without background rerolls.
    const runSimulation = async () => {
      try {
        await this.syncBotStatsWithTierMap();
      } catch (err) {
        console.error('[BATTLE_BOT_ENGINE] Simulation error:', err);
      }
    };
    this.intervalTimer = setInterval(() => {
      runSimulation().catch(err => console.error('[BATTLE_BOT_ENGINE] Unhandled interval error:', err));
    }, 30 * 60 * 1000);
  }

  async syncBotStatsWithTierMap() {
    const bots = await User.find({ isBattleBot: true }, 'userId level rpg.level rpg.power rpg.battleRank').exec();
    const repairs = [];
    for (const bot of bots) {
      const rank = bot.rpg?.battleRank || 'Common';
      const tierConfig = TIER_POWER_MAP[rank] || TIER_POWER_MAP.Common;

      const currentLevel = Number(bot.rpg?.level || bot.level || 0);
      const currentPower = Number(bot.rpg?.power || 0);
      const nextLevel = currentLevel > 0 ? currentLevel : tierConfig.minLvl;
      const nextPower = currentPower > 0 ? currentPower : tierConfig.minPower;
      if (nextLevel !== currentLevel || nextPower !== currentPower) {
        repairs.push(User.updateOne(
          { userId: bot.userId },
          { $set: { level: nextLevel, 'rpg.level': nextLevel, 'rpg.power': nextPower } }
        ));
      }
      if (currentPower < tierConfig.minPower || currentPower > tierConfig.maxPower || currentLevel < tierConfig.minLvl || currentLevel > tierConfig.maxLvl) {
        console.warn(`[BATTLE_BOT_ENGINE] ${bot.userId} nằm ngoài dải ${rank}: level=${currentLevel}, power=${currentPower}. Giữ nguyên gear để không reroll.`);
      }
    }
    if (repairs.length) await Promise.all(repairs);
    if (repairs.length) console.log(`🔧 Battle Bot Engine repaired ${repairs.length} missing level/power fields.`);
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
