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

const PROMOTION_LP_NEED = 100; // 100 LP per tier for promotion (except Divine which is unlimited)

const SEASON_REWARDS = {
  Unranked: { coke: 0, wc: 0, skin: false },
  Common: { coke: 100000, wc: 0, skin: false },
  Rare: { coke: 300000, wc: 1, skin: false },
  Epic: { coke: 700000, wc: 2, skin: false },
  Legendary: { coke: 1500000, wc: 3, skin: true },
  Mythic: { coke: 3500000, wc: 5, skin: true },
  Ancient: { coke: 6000000, wc: 8, skin: true },
  Divine: { coke: 10000000, wc: 12, skin: true }
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
      return 4; // Winner 2+ tiers lower than opponent (+4 LP)
    } else if (diff === 1) {
      return 3; // Winner 1 tier lower than opponent (+3 LP)
    } else if (diff === 0) {
      return 2; // Same tier (+2 LP)
    } else {
      return 1; // Winner higher tier than opponent (+1 LP)
    }
  }

  calculateLpLoss(loserRank, winnerRank, loseStreak = 0) {
    if (loseStreak >= 3) {
      return 6; // Losing streak >= 3 deducts 6 LP
    }
    const loserIdx = this.getRankTierIndex(loserRank);
    const winnerIdx = this.getRankTierIndex(winnerRank);

    if (loserIdx > winnerIdx) {
      return 4; // Losing to lower rank opponent deducts 4 LP
    }
    return 2; // Normal loss vs same or higher rank deducts 2 LP
  }

  async processBattleLp(winnerUser, loserUser) {
    const wRank = winnerUser.rpg?.battleRank || 'Unranked';
    const lRank = loserUser.rpg?.battleRank || 'Unranked';

    // 1. Calculate Winner LP gain
    const lpGain = this.calculateLpGain(wRank, lRank);
    const currentLp = winnerUser.rpg?.battleLp || 0;
    const currentIdx = this.getRankTierIndex(wRank);

    let newLp = currentLp + lpGain;
    let newRank = wRank;
    let promoted = false;

    // Promotion check for all ranks below Divine (Must exceed 100 LP, i.e. >= 101 LP to promote)
    if (currentIdx < RANK_ORDER.length - 1) {
      if (newLp > PROMOTION_LP_NEED) {
        const overflow = newLp - PROMOTION_LP_NEED;
        const nextIdx = currentIdx + 1;
        newRank = this.getRankNameByIndex(nextIdx);
        newLp = overflow;
        promoted = true;
      }
    }

    winnerUser.rpg.battleLp = newLp;
    winnerUser.rpg.battleRank = newRank;
    winnerUser.rpg.seasonWins = (winnerUser.rpg.seasonWins || 0) + 1;
    winnerUser.rpg.loseStreak = 0; // Reset lose streak on win

    // 2. Calculate Loser LP loss
    const currentLoseStreak = (loserUser.rpg?.loseStreak || 0) + 1;
    loserUser.rpg.loseStreak = currentLoseStreak;
    loserUser.rpg.seasonLosses = (loserUser.rpg.seasonLosses || 0) + 1;

    const lpLoss = this.calculateLpLoss(lRank, wRank, currentLoseStreak);
    const loserCurrentLp = loserUser.rpg?.battleLp || 0;
    loserUser.rpg.battleLp = Math.max(0, loserCurrentLp - lpLoss);

    await Promise.all([
      winnerUser.save().catch(() => {}),
      loserUser.save().catch(() => {})
    ]);

    return {
      lpGain,
      newLp,
      newRank,
      promoted,
      isDivine: newRank.toLowerCase() === 'divine',
      lpLoss,
      loserLp: loserUser.rpg.battleLp,
      loseStreak: currentLoseStreak
    };
  }

  getSeasonRewards(rankName) {
    const name = String(rankName || 'Unranked').trim();
    const formattedKey = RANK_ORDER.find((r) => r.toLowerCase() === name.toLowerCase()) || 'Unranked';
    return SEASON_REWARDS[formattedKey] || SEASON_REWARDS.Unranked;
  }
}

module.exports = BattleRankService;
