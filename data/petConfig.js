module.exports = {
  // Max Level Cap
  MAX_LEVEL: 101,

  // XP Required Formula: floor((BASE + Level^EXPONENT) * MULTIPLIER)
  XP_FORMULA: {
    BASE: 1000,
    EXPONENT: 4,
    MULTIPLIER: 0.8,
  },

  // Base Battle XP Rewards (PvP - OwO Bot Standard: win 200, draw 100, lose 50)
  BATTLE_XP: {
    win: 200,
    draw: 100,
    lose: 50,
  },

  // Boss Battle XP Reward
  BOSS_XP: 500,

  // Daily Claim XP Reward
  DAILY_XP: 0,

  // Hunt XP Rewards by Loot/Creature Rank (Calibrated 1:1 with OwO & ZOO_RANKS)
  HUNT_XP: {
    Common: 15,
    Rare: 45,
    Epic: 150,
    Generation: 300,
    Legendary: 500,
    Mythic: 1800,
    Ancient: 6000,
    Divine: 25000,
    Secret: 60000,
    Bot: 100000,
  },

  // Win Streak Bonus for PvP (OwO Milestones)
  STREAK_BONUS: {
    MAX_CAP: 25000,
    MILESTONES: [
      { minStreak: 1000, multiplier: 25 },
      { minStreak: 500, multiplier: 10 },
      { minStreak: 100, multiplier: 5 },
      { minStreak: 50, multiplier: 3 },
      { minStreak: 10, multiplier: 1 },
    ],
  },

  // Higher Level Opponent Bonus per level difference (Applied on WIN, capped at 600 XP)
  OPPONENT_BONUS: {
    MULTIPLIER_PER_LEVEL: 50,
    MAX_CAP: 600,
  },
};
