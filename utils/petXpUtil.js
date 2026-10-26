const petConfig = require("../data/petConfig");

// Deprecated per OwO standard (duplicate pets no longer grant bonus XP)
const DUPLICATE_PET_XP = {
  Common: 0,
  Rare: 0,
  Epic: 0,
  Legendary: 0,
  Mythic: 0,
  Ancient: 0,
  Divine: 0,
  Secret: 0,
  Bot: 0,
};

/**
 * Get flat XP awarded when catching a duplicate pet species.
 * Deprecated: strictly aligned with OwO Bot where duplicate pet bonus does not exist.
 *
 * @param {string} [tier="Common"] - Pet rarity tier
 * @returns {number} 0 (no duplicate bonus)
 */
function getDuplicatePetXp(tier = "Common") {
  return 0;
}

/**
 * Calculate XP required to reach the next level from current level.
 * Formula: floor((1000 + Level^4) * 0.8)
 *
 * @param {number} level - Current pet level
 * @returns {number} Amount of XP required to reach next level
 */
function getXpRequired(level) {
  if (level >= petConfig.MAX_LEVEL) {
    return Infinity; // Cap at Max Level 101
  }
  const { BASE, EXPONENT, MULTIPLIER } = petConfig.XP_FORMULA;
  return Math.floor((BASE + Math.pow(level, EXPONENT)) * MULTIPLIER);
}

/**
 * Calculate total Battle XP awarded to a pet in PvP.
 * Calibrated 1:1 with OwO Bot battleXP:
 * - Loss: 50 XP
 * - Draw: 100 XP
 * - Win: 200 XP + Level Difference Bonus + Win Streak Bonus
 *
 * @param {string} result - 'win', 'draw', or 'lose'
 * @param {number} [streak=0] - Current consecutive win streak
 * @param {number} [levelDifference=0] - (Enemy Avg Level - Player Avg Level)
 * @returns {number} Total Battle XP earned
 */
function getBattleXp(result = "win", streak = 0, levelDifference = 0) {
  const baseType = String(result || "win").toLowerCase();

  // 1. Defeat: OwO standard = 50 XP (no streak, no level difference bonuses)
  if (baseType === "lose") {
    return petConfig.BATTLE_XP?.lose || 50;
  }

  // 2. Tie/Draw: OwO standard = 100 XP
  if (baseType === "draw" || baseType === "tie") {
    return petConfig.BATTLE_XP?.draw || 100;
  }

  // 3. Victory: OwO standard = 200 XP + Bonuses
  const baseWin = petConfig.BATTLE_XP?.win || 200;

  // Higher Level Opponent Bonus (OwO formula: Math.round(600 * lvlDiff), capped)
  let opponentBonus = 0;
  if (levelDifference > 0) {
    opponentBonus = Math.min(
      petConfig.OPPONENT_BONUS?.MAX_CAP || 600,
      Math.round(levelDifference * (petConfig.OPPONENT_BONUS?.MULTIPLIER_PER_LEVEL || 50))
    );
  }

  // Win Streak Bonus (OwO milestone formula)
  let streakBonus = 0;
  if (streak > 0) {
    if (streak % 1000 === 0) streakBonus = 25 * (Math.sqrt(streak / 100) * 100 + 500);
    else if (streak % 500 === 0) streakBonus = 10 * (Math.sqrt(streak / 100) * 100 + 500);
    else if (streak % 100 === 0) streakBonus = 5 * (Math.sqrt(streak / 100) * 100 + 500);
    else if (streak % 50 === 0) streakBonus = 3 * (Math.sqrt(streak / 100) * 100 + 500);
    else if (streak % 10 === 0) streakBonus = Math.sqrt(streak / 100) * 100 + 500;
    streakBonus = Math.min(petConfig.STREAK_BONUS?.MAX_CAP || 25000, Math.round(streakBonus));
  }

  return baseWin + opponentBonus + streakBonus;
}

/**
 * Get Hunt XP awarded based on hunted creature/loot rarity.
 *
 * @param {string} rarity - Rarity rank ('Common', 'Rare', 'Epic', etc.)
 * @returns {number} Hunt XP earned
 */
function getHuntXp(rarity = "Common") {
  return petConfig.HUNT_XP[rarity] || petConfig.HUNT_XP.Common;
}

/**
 * Get Boss XP awarded to equipped pet.
 *
 * @returns {number} Boss XP earned (500 XP)
 */
function getBossXp() {
  return petConfig.BOSS_XP || 500;
}

/**
 * Get Daily XP awarded to equipped pet.
 *
 * @returns {number} Daily XP earned (300 XP)
 */
function getDailyXp() {
  return petConfig.DAILY_XP || 300;
}

/**
 * Calculate remaining XP required for pet to reach next level.
 *
 * @param {Object} pet - Pet object { level, exp }
 * @returns {number} Remaining XP needed
 */
function calculateRemainingXp(pet) {
  if (!pet || pet.level >= petConfig.MAX_LEVEL) return 0;
  const needed = getXpRequired(pet.level || 1);
  return Math.max(0, needed - (pet.exp || 0));
}

/**
 * Calculate total cumulative XP earned by pet from level 1.
 *
 * @param {Object} pet - Pet object { level, exp }
 * @returns {number} Cumulative total XP
 */
function calculateTotalXp(pet) {
  if (!pet) return 0;
  let total = 0;
  const currentLvl = Math.min(petConfig.MAX_LEVEL, pet.level || 1);
  for (let lvl = 1; lvl < currentLvl; lvl++) {
    total += getXpRequired(lvl);
  }
  return total + (pet.exp || 0);
}

/**
 * Manually level up a pet by 1 level if below max level.
 *
 * @param {Object} pet - Pet object
 * @returns {boolean} True if leveled up, false if already at max level
 */
function levelUpPet(pet) {
  if (!pet || (pet.level || 1) >= petConfig.MAX_LEVEL) {
    return false;
  }
  const needed = getXpRequired(pet.level || 1);
  pet.level = (pet.level || 1) + 1;
  pet.exp = Math.max(0, (pet.exp || 0) - needed);
  return true;
}

/**
 * Add XP to a pet with support for multiple level-ups and carry-over XP.
 * Prevents leveling beyond Level 101 and stores excess XP at max level.
 * Synchronizes level & exp across equippedPet and user.rpg.pets array.
 *
 * @param {Object} pet - Pet object { level, exp }
 * @param {number} amount - XP amount to add
 * @param {Object} [user=null] - Mongoose User document to synchronize equippedPet & pets array
 * @returns {Object} Result { leveledUp, levelsGained, startLevel, endLevel, pet }
 */
function addPetXp(pet, amount, user = null) {
  if (!pet || amount <= 0) {
    return {
      leveledUp: false,
      levelsGained: 0,
      startLevel: pet?.level || 1,
      endLevel: pet?.level || 1,
      pet,
    };
  }

  const startLevel = pet.level || 1;
  let currentLevel = startLevel;
  let currentExp = (pet.exp || 0) + amount;
  let levelsGained = 0;

  // Level up loop with carry-over XP up to MAX_LEVEL 101
  while (currentLevel < petConfig.MAX_LEVEL) {
    const required = getXpRequired(currentLevel);
    if (currentExp >= required) {
      currentExp -= required;
      currentLevel += 1;
      levelsGained += 1;
    } else {
      break;
    }
  }

  pet.level = currentLevel;
  pet.exp = currentExp;

  // Synchronize equippedPet and pets array if user object is passed
  if (user && user.rpg) {
    const petId = pet.id || pet.key;
    if (user.rpg.equippedPet && (user.rpg.equippedPet.id === petId || user.rpg.equippedPet.key === petId)) {
      user.rpg.equippedPet.level = currentLevel;
      user.rpg.equippedPet.exp = currentExp;
    }
    if (Array.isArray(user.rpg.pets)) {
      const owned = user.rpg.pets.find((p) => (p.id && p.id === petId) || p.key === petId);
      if (owned) {
        owned.level = currentLevel;
        owned.exp = currentExp;
      }
    }
    if (typeof user.markModified === "function") {
      user.markModified("rpg");
    }
  }

  return {
    leveledUp: levelsGained > 0,
    levelsGained,
    startLevel,
    endLevel: currentLevel,
    pet,
  };
}

module.exports = {
  petConfig,
  DUPLICATE_PET_XP,
  getDuplicatePetXp,
  getXpRequired,
  getBattleXp,
  getHuntXp,
  getBossXp,
  getDailyXp,
  calculateRemainingXp,
  calculateTotalXp,
  levelUpPet,
  addPetXp,
};
