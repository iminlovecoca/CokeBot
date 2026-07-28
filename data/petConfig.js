/**
 * Configuration for RPG Pet Leveling & Experience System
 * Inspired by OwO Bot (~20% faster progression)
 */
module.exports = {
  // Max Level Cap
  MAX_LEVEL: 101,

  // XP Required Formula: floor((BASE + Level^EXPONENT) * MULTIPLIER)
  XP_FORMULA: {
    BASE: 1000,
    EXPONENT: 4,
    MULTIPLIER: 0.8,
  },

  // Base Battle XP Rewards
  BATTLE_XP: {
    win: 200,
    draw: 100,
    lose: 50,
  },

  // Hunt XP Rewards by Loot/Creature Rank
  HUNT_XP: {
    Common: 20,
    Rare: 40,
    Epic: 80,
    Legendary: 160,
    Mythic: 320,
    Ancient: 640,
    Divine: 1280,
  },

  // Win Streak Bonus Milestones for PvP
  STREAK_BONUS: {
    MAX_CAP: 100000,
    MILESTONES: [
      { minStreak: 1000, base: 12500, scale: 250 },
      { minStreak: 500, base: 5000, scale: 100 },
      { minStreak: 100, base: 2500, scale: 50 },
      { minStreak: 50, base: 1500, scale: 30 },
      { minStreak: 10, base: 500, scale: 10 },
    ],
  },

  // Higher Level Opponent Bonus
  OPPONENT_BONUS: {
    MULTIPLIER_PER_LEVEL: 600,
  },

  // Catch-up XP Multiplier for lower-level pets in PvP
  CATCHUP_XP: {
    BASE_MULTIPLIER: 2.0,
    PER_LEVEL_DIFFERENCE: 0.1,
    MAX_MULTIPLIER: 10.0,
  },
};
