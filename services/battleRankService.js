const BaseService = require('./BaseService');
const User = require('../models/User');

const RANK_ORDER = [
  'Unranked',
  'Common',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
  'Ancient',
  'Divine'
];

const SEASON_REWARDS = {
  Unranked: { coke: 50000, wc: 0, lb: 0, skin: false },
  Common: { coke: 100000, wc: 0, lb: 0, skin: false },
  Rare: { coke: 300000, wc: 1, lb: 0, skin: false },
  Epic: { coke: 700000, wc: 2, lb: 1, skin: false },
  Legendary: { coke: 1500000, wc: 3, lb: 2, skin: true },
  Mythic: { coke: 3500000, wc: 5, lb: 3, skin: true },
  Ancient: { coke: 7000000, wc: 8, lb: 5, skin: true },
  Divine: { coke: 15000000, wc: 15, lb: 10, skin: true }
};

class BattleRankService extends BaseService {
  getRankTierIndex(rankName) {
    if (!rankName) return 0;
    const name = String(rankName).trim();
    const idx = RANK_ORDER.findIndex((r) => r.toLowerCase() === name.toLowerCase());
    return idx >= 0 ? idx : 0;
  }

  getRankNameByIndex(index) {
    const clamped = Math.max(0, Math.min(RANK_ORDER.length - 1, index));
    return RANK_ORDER[clamped];
  }

  calculateLpGain(winnerRank, loserRank) {
    const winnerIdx = this.getRankTierIndex(winnerRank);
    const loserIdx = this.getRankTierIndex(loserRank);
    const diff = loserIdx - winnerIdx;

    if (diff >= 2) {
      return 4; // Winner 2+ tiers lower than opponent
    } else if (diff === 1) {
      return 3; // Winner 1 tier lower than opponent
    } else if (diff === 0) {
      return 2; // Same tier
    } else {
      return 1; // Winner higher tier than opponent
    }
  }

  async processBattleLp(winnerUser, loserUser) {
    const wRank = winnerUser.rpg?.battleRank || 'Unranked';
    const lRank = loserUser.rpg?.battleRank || 'Unranked';

    const lpGain = this.calculateLpGain(wRank, lRank);
    const currentLp = winnerUser.rpg?.battleLp || 0;
    const currentIdx = this.getRankTierIndex(wRank);

    let newLp = currentLp + lpGain;
    let newRank = wRank;
    let promoted = false;

    // Handle initial promotion from Unranked -> Common or subsequent promotions
    if (newLp >= 100 && currentIdx < RANK_ORDER.length - 1) {
      const overflow = newLp - 100;
      const nextIdx = currentIdx + 1;
      newRank = this.getRankNameByIndex(nextIdx);
      newLp = overflow;
      promoted = true;
    }

    winnerUser.rpg.battleLp = newLp;
    winnerUser.rpg.battleRank = newRank;
    winnerUser.rpg.seasonWins = (winnerUser.rpg.seasonWins || 0) + 1;

    loserUser.rpg.seasonLosses = (loserUser.rpg.seasonLosses || 0) + 1;

    await Promise.all([
      winnerUser.save().catch(() => {}),
      loserUser.save().catch(() => {})
    ]);

    return {
      lpGain,
      newLp,
      newRank,
      promoted
    };
  }

  getSeasonRewards(rankName) {
    const name = String(rankName || 'Unranked').trim();
    const formattedKey = RANK_ORDER.find((r) => r.toLowerCase() === name.toLowerCase()) || 'Unranked';
    return SEASON_REWARDS[formattedKey] || SEASON_REWARDS.Unranked;
  }
}

module.exports = BattleRankService;
