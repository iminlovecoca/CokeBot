module.exports = {
  // Max Level Cap
  MAX_LEVEL: 101,

  // XP Required Formula: floor((BASE + Level^EXPONENT) * MULTIPLIER)
  XP_FORMULA: {
    BASE: 1000,
    EXPONENT: 4,
    MULTIPLIER: 0.8,
  },

  // Base Battle XP Rewards (PvP) - Reduced by ~30% from original (200 -> 140)
  BATTLE_XP: {
    win: 140,
    draw: 70,
    lose: 35,
  },

  // Boss Battle XP Reward
  BOSS_XP: 350,

  // Daily Claim XP Reward
  DAILY_XP: 0,

  // Hunt XP Rewards by Loot/Creature Rank (~30% reduced)
  HUNT_XP: {
    Common: 15,
    Rare: 30,
    Epic: 60,
    Legendary: 120,
    Mythic: 220,
    Ancient: 450,
    Divine: 900,
  },

  // Balanced Win Streak Bonus Milestones for PvP (~30% reduced)
  STREAK_BONUS: {
    MAX_CAP: 2000,
    MILESTONES: [
      { minStreak: 1000, base: 1000, scale: 20 },
      { minStreak: 500, base: 500, scale: 10 },
      { minStreak: 100, base: 250, scale: 5 },
      { minStreak: 50, base: 150, scale: 3 },
      { minStreak: 10, base: 50, scale: 2 },
    ],
  },

  // Reduced Higher Level Opponent Bonus per level difference
  OPPONENT_BONUS: {
    MULTIPLIER_PER_LEVEL: 100,
  },
};
