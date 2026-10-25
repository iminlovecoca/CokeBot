const config = require("../data/config");
const classes = require("../data/rpg/classes");
const { WEAPON_SETS, getDungeonWeaponKey, getWeaponPower } = require("./rpgUtil");

const STAT_KEYS = ["vigor", "pr", "mr", "str", "dex", "int", "arc"];
const RARITIES = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];
const DEFAULT_TIME_LIMITS_MS = {
  normal: 5 * 60 * 1000,
  bossPhase1: 10 * 60 * 1000,
  bossPhase2: 7 * 60 * 1000,
};
const DUNGEON_SHRED_CAP = 0.40;

const BUILD_WEIGHTS = {
  warrior: { vigor: 0.20, pr: 0.12, mr: 0.04, str: 0.38, dex: 0.20, int: 0, arc: 0.06 },
  assassin: { vigor: 0.12, pr: 0.04, mr: 0.03, str: 0.12, dex: 0.42, int: 0, arc: 0.27 },
  mage: { vigor: 0.13, pr: 0.03, mr: 0.10, str: 0, dex: 0.14, int: 0.40, arc: 0.20 },
  archer: { vigor: 0.14, pr: 0.05, mr: 0.03, str: 0.10, dex: 0.43, int: 0.08, arc: 0.17 },
  paladin: { vigor: 0.31, pr: 0.25, mr: 0.12, str: 0.20, dex: 0.05, int: 0.04, arc: 0.03 },
  wretch: { vigor: 0.16, pr: 0.12, mr: 0.10, str: 0.18, dex: 0.16, int: 0.14, arc: 0.14 },
};

const getDungeonTimeLimitMs = (stage) => {
  const configured = config.dungeon?.time_limits_ms?.[stage];
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIME_LIMITS_MS[stage];
};

const formatTimeLimit = (milliseconds) => {
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  if (totalSeconds % 60 === 0) return `${totalSeconds / 60} phút`;
  return `${Math.floor(totalSeconds / 60)} phút ${totalSeconds % 60} giây`;
};

const normalizeRarity = (rarity) => {
  const found = RARITIES.find((value) => value.toLowerCase() === String(rarity || "").toLowerCase());
  return found || "Epic";
};

const allocateStats = (classKey, level) => {
  const selectedClass = classes[classKey] || classes.wretch;
  const stats = { ...selectedClass.stats };
  const weights = BUILD_WEIGHTS[classKey] || BUILD_WEIGHTS.wretch;
  let points = Math.max(0, Math.floor(level) - 1);
  while (points > 0) {
    const available = STAT_KEYS.filter((stat) => stats[stat] < 99 && weights[stat] > 0);
    if (!available.length) break;
    available.sort((a, b) => {
      const aProgress = (stats[a] - selectedClass.stats[a]) / weights[a];
      const bProgress = (stats[b] - selectedClass.stats[b]) / weights[b];
      return aProgress - bProgress;
    });
    stats[available[0]] += 1;
    points -= 1;
  }
  return stats;
};

const buildSimulatedDungeonPlayer = ({
  classKey = "wretch",
  level = 1,
  weaponName = "longsword",
  weaponRank = "Epic",
  enhance = 0,
  index = 0,
}) => {
  const normalizedClass = classes[classKey] ? classKey : "wretch";
  const normalizedLevel = Math.max(1, Math.min(120, Math.floor(level) || 1));
  const normalizedRarity = normalizeRarity(weaponRank);
  const stats = allocateStats(normalizedClass, normalizedLevel);
  const weaponKey = getDungeonWeaponKey(weaponName) || String(weaponName || "longsword").toLowerCase().replace(/\s+/g, "");
  const isDungeonWeapon = getDungeonWeaponKey(weaponName) !== null;
  const rarityIndex = RARITIES.indexOf(normalizedRarity);
  const powerRarity = isDungeonWeapon ? RARITIES[Math.min(RARITIES.length - 1, rarityIndex + 1)] : normalizedRarity;
  const qualityMultiplier = 0.9 + 0.2 * (60 / 90); // Chất lượng đại diện 70%.
  const baseWeaponPower = Math.floor(((config.rpg.gear_rarities[powerRarity]?.power || 180) + 4) * qualityMultiplier);
  const weapon = {
    id: `sim_weapon_${index}`,
    slot: "weapon",
    name: weaponName,
    subType: weaponKey,
    rarity: normalizedRarity,
    power: baseWeaponPower,
    upgradeLevel: Math.max(0, Math.min(10, Math.floor(enhance) || 0)),
  };
  const weaponPower = getWeaponPower(weapon, stats);
  const armorPower = Math.floor((config.rpg.gear_rarities[normalizedRarity]?.power || 180) * qualityMultiplier);
  const power = weaponPower + armorPower * 5;
  const setBonus = normalizedRarity === "Common" ? null : (WEAPON_SETS[weaponKey] || null);
  const hpBuff = Number(config.dungeon?.player_buff?.max_hp_multiplier) || 1;
  const setHpMultiplier = 1 + (setBonus?.bonus?.maxHp || 0);
  const maxHp = Math.floor((280 + stats.vigor * 28 + normalizedLevel * 26 + Math.floor(power * 0.12)) * setHpMultiplier * hpBuff);
  return {
    id: `sim_${normalizedClass}_${index}`,
    name: `Sim ${classes[normalizedClass].name} ${index + 1}`,
    level: normalizedLevel,
    classKey: normalizedClass,
    maxHp,
    hp: maxHp,
    potions: 3,
    stats,
    power,
    weapon,
    rpgClass: classes[normalizedClass],
    setBonus,
    rage: 0,
    mana: normalizedClass === "mage" ? 100 : 0,
  };
};

const getAssassinSkillBleedDamage = (player, enemyMaxHp = 0) => {
  const statScaled = Math.floor(
    (player.stats?.dex || 0) * 0.6
      + (player.stats?.arc || 0) * 0.4
      + (player.power || 0) * 0.02,
  );
  if (!enemyMaxHp) return Math.max(1, statScaled);
  const hpFloor = Math.floor(enemyMaxHp * 0.01);
  const hpCap = Math.floor(enemyMaxHp * 0.02);
  return Math.max(1, Math.min(hpCap, Math.max(hpFloor, statScaled)));
};

const getDungeonBossScalers = (averageLevel, averagePower) => {
  const safeLevel = Math.max(1, Number(averageLevel) || 1);
  const safePower = Math.max(0, Number(averagePower) || 0);
  const powerRoot = Math.sqrt(safePower);
  const pressureStart = Number(config.dungeon?.combat_balance?.overpower_pressure_start) || 35000;
  const pressureRoot = Math.sqrt(Math.max(0, safePower - pressureStart));
  const pressureDurability = Number(config.dungeon?.combat_balance?.overpower_durability_per_sqrt_power) || 0.0022;
  const pressureOffense = Number(config.dungeon?.combat_balance?.overpower_offense_per_sqrt_power) || 0.0008;
  return {
    durability: 1 + safeLevel * 0.004 + powerRoot * 0.0022 + pressureRoot * pressureDurability,
    offense: 1 + safeLevel * 0.003 + powerRoot * 0.0012 + pressureRoot * pressureOffense,
  };
};

const getDungeonBossDamage = (damage, bossMaxHp, isSkill = false, options = {}) => {
  const safeDamage = Math.max(0, Math.floor(Number(damage) || 0));
  const safeMaxHp = Math.max(1, Math.floor(Number(bossMaxHp) || 1));
  if (options.ignoreLimit) return safeDamage;
  const capConfig = config.dungeon?.combat_balance?.boss_damage_soft_cap || {};
  const softPct = Number(isSkill ? capConfig.skill_pct : capConfig.basic_pct) || (isSkill ? 0.10 : 0.06);
  const hardPct = Number(isSkill ? capConfig.skill_hard_cap_pct : capConfig.basic_hard_cap_pct) || (isSkill ? 0.20 : 0.12);
  const overflowEfficiency = Math.max(0, Math.min(1, Number(capConfig.overflow_efficiency) || 0.22));
  const softCap = Math.max(1, Math.floor(safeMaxHp * softPct));
  const hardCap = Math.max(softCap, Math.floor(safeMaxHp * hardPct));
  if (safeDamage <= softCap) return safeDamage;
  return Math.min(hardCap, Math.floor(softCap + (safeDamage - softCap) * overflowEfficiency));
};

const getDungeonRewardFatigue = (dailyClearCount = 0) => {
  const rewards = config.dungeon?.rewards || {};
  const count = Math.max(0, Math.floor(Number(dailyClearCount) || 0));
  const fullLimit = Math.max(0, Math.floor(Number(rewards.full_reward_clears_per_day) || 3));
  const reducedLimit = Math.max(fullLimit, Math.floor(Number(rewards.reduced_reward_clears_per_day) || 6));
  if (count < fullLimit) return { multiplier: 1, stoneDropRate: 1, tier: "full" };
  if (count < reducedLimit) {
    return {
      multiplier: Number(rewards.reduced_reward_multiplier) || 0.5,
      stoneDropRate: Number(rewards.reduced_stone_drop_rate) || 0.35,
      tier: "reduced",
    };
  }
  return {
    multiplier: Number(rewards.exhausted_reward_multiplier) || 0.2,
    stoneDropRate: Number(rewards.exhausted_stone_drop_rate) || 0.1,
    tier: "exhausted",
  };
};

const getDungeonRewardAmounts = ({
  chapter = 1,
  hasClearedBefore = false,
  isDailyFirstClear = false,
  dailyClearCount = 0,
  isChallenge = false,
  elitesKilled = 0,
} = {}) => {
  const rewards = config.dungeon?.rewards || {};
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const challengeMultiplier = isChallenge ? (Number(rewards.challenge_multiplier) || 1.2) : 1;
  const eliteMultiplier = 1 + 0.25 * Math.min(3, Math.max(0, Math.floor(Number(elitesKilled) || 0)));
  const repeatMultiplier = hasClearedBefore ? (Number(rewards.repeat_clear_multiplier) || 0.50) : 1;
  const dailyMultiplier = isDailyFirstClear ? (Number(rewards.daily_first_clear_multiplier) || 1.25) : 1;
  const fatigue = getDungeonRewardFatigue(dailyClearCount);
  const totalMultiplier = challengeMultiplier * eliteMultiplier * repeatMultiplier * dailyMultiplier * fatigue.multiplier;
  const chapterScaleCoke = Math.pow(safeChapter, 1.25);
  const chapterScaleExp = Math.pow(safeChapter, 1.20);
  return {
    coke: Math.floor((Number(rewards.base_coke) || 150000) * chapterScaleCoke * totalMultiplier),
    exp: Math.floor((Number(rewards.base_exp) || 35000) * chapterScaleExp * totalMultiplier),
    challengeMultiplier,
    eliteMultiplier,
    fatigue,
  };
};

const getDungeonDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getSlothShieldBreakProgress = ({ classKey, weaponSubType, isSkill, bossIsBurning }) => {
  const cleanWeapon = String(weaponSubType || "").toLowerCase().replace(/\s+/g, "");
  if (isSkill && (classKey === "warrior" || cleanWeapon === "thorshammer" || cleanWeapon === "odinhammer")) return 3;
  if (isSkill && bossIsBurning) return 2;
  return 1;
};

module.exports = {
  DUNGEON_SHRED_CAP,
  RARITIES,
  allocateStats,
  buildSimulatedDungeonPlayer,
  formatTimeLimit,
  getAssassinSkillBleedDamage,
  getDungeonBossDamage,
  getDungeonBossScalers,
  getDungeonDateKey,
  getDungeonRewardAmounts,
  getDungeonRewardFatigue,
  getDungeonTimeLimitMs,
  getSlothShieldBreakProgress,
};
