module.exports = {
  // Max Level Cap
  MAX_LEVEL: 101,

  // XP Required Formula: floor((BASE + Level^EXPONENT) * MULTIPLIER)
  XP_FORMULA: {
    BASE: 1000,
    EXPONENT: 4,
    MULTIPLIER: 0.8,
  },

  // Base Battle XP Rewards (PvP)
  BATTLE_XP: {
    win: 120,
    draw: 50,
    lose: 25,
  },

  // Boss Battle XP Reward
  BOSS_XP: 350,

  // Daily Claim XP Reward
  DAILY_XP: 0,

  // Hunt XP Rewards by Loot/Creature Rank
  HUNT_XP: {
    Common: 15,
    Rare: 30,
    Epic: 60,
    Legendary: 120,
    Mythic: 220,
    Ancient: 450,
    Divine: 900,
    Secret: 1800,
    Bot: 1500,
  },

  // Balanced Win Streak Bonus Milestones for PvP
  STREAK_BONUS: {
    MAX_CAP: 500,
    MILESTONES: [
      { minStreak: 100, base: 150, scale: 5 },
      { minStreak: 50, base: 100, scale: 3 },
      { minStreak: 20, base: 50, scale: 2 },
      { minStreak: 10, base: 25, scale: 1 },
    ],
  },

  // Higher Level Opponent Bonus per level difference (Only applied on WIN, capped at 150 XP)
  OPPONENT_BONUS: {
    MULTIPLIER_PER_LEVEL: 5,
  },
};
