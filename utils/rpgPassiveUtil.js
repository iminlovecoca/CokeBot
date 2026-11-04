const config = require("../data/config");
const {
  WEAPON_PASSIVE_TRIGGER_RATE,
  PASSIVE_TYPES,
  WEAPON_PASSIVES,
  LOCKED_WEAPONS,
  getWeaponPassive,
  isLockedWeapon,
  getPassiveForMode,
} = require("../data/rpg/weaponPassives");

const EMOJIS = {
  healreduction: "<:healreduction:1523340558855045190>",
  poisonous: "<:poisonous:1522374367542247424>",
  taunt: "<:taunt:1521938510485917796>",
  frostbite: "<:frostbite:1521938506425958431>",
  freeze: "<:freeze:1521938500478566639>",
  bleed: "<:bleed:1521938497642958889>",
  burn: "<:burn:1521938494094835774>",
  stun: "<:stun:1521938490605178910>",
  heal: "<:heal:1521938487907975198>",
  dispe: "<:dispe:1521938483730710578>",
  break: "<:break:1521938480337391736>",
  atkup: "<:atkup:1521938477359300648>",
  atkdown: "<:atkdown:1521938474587000913>",
  lifesteal: "<:LifeSteal:1563844557026893924>",
  armor_pierce: "<:ArmorPierce:1563844554728276018>",
};

const PASSIVE_EMOJIS = {
  [PASSIVE_TYPES.POISON]: EMOJIS.poisonous,
  [PASSIVE_TYPES.BLEED]: EMOJIS.bleed,
  [PASSIVE_TYPES.BURN]: EMOJIS.burn,
  [PASSIVE_TYPES.FREEZE]: EMOJIS.freeze,
  [PASSIVE_TYPES.STUN]: EMOJIS.stun,
  [PASSIVE_TYPES.HEAL_BAN]: EMOJIS.healreduction,
  [PASSIVE_TYPES.LIFESTEAL]: EMOJIS.lifesteal,
  [PASSIVE_TYPES.DAMAGE_MULT]: EMOJIS.atkup,
  [PASSIVE_TYPES.ARMOR_PIERCE]: EMOJIS.armor_pierce,
  [PASSIVE_TYPES.MR_PIERCE]: EMOJIS.dispe,
  [PASSIVE_TYPES.ARMOR_SHRED]: EMOJIS.break,
  [PASSIVE_TYPES.MR_SHRED]: EMOJIS.break,
  [PASSIVE_TYPES.DOUBLE_HIT]: EMOJIS.atkup,
  [PASSIVE_TYPES.HEAL_ON_SKILL]: EMOJIS.heal,
  [PASSIVE_TYPES.NEXT_ATTACK_MULT]: EMOJIS.atkup,
  [PASSIVE_TYPES.REFLECT]: EMOJIS.taunt,
  [PASSIVE_TYPES.DEFLECT]: EMOJIS.taunt,
  [PASSIVE_TYPES.RANDOM_EFFECT]: EMOJIS.dispe,
};

const getPassiveEmoji = (passiveType) => PASSIVE_EMOJIS[passiveType] || EMOJIS.atkup;

const formatPassiveLog = (message, passiveType) => {
  if (!message) return "";
  if (message.startsWith("<:") || message.startsWith("<a:")) return message;
  const emoji = getPassiveEmoji(passiveType);
  return message.startsWith(emoji) ? message : `${emoji} ${message}`;
};

const getWeaponPassiveEmoji = (subType, mode = "dungeon") => {
  const passive = getPassiveForMode(subType, mode);
  return passive ? getPassiveEmoji(passive.type) : "";
};

const getActiveStatusString = (target) => {
  if (!target) return "";
  const parts = [];
  if (target.poisonRounds && target.poisonRounds > 0) parts.push(`${EMOJIS.poisonous}(${target.poisonRounds}L)`);
  if (target.bleedRounds && target.bleedRounds > 0) parts.push(`${EMOJIS.bleed}(${target.bleedRounds}L)`);
  if (target.burnRounds && target.burnRounds > 0) parts.push(`${EMOJIS.burn}(${target.burnRounds}L)`);
  if (target.freezeRounds && target.freezeRounds > 0) parts.push(`${EMOJIS.freeze}(${target.freezeRounds}L)`);
  if (target.frostbiteRounds && target.frostbiteRounds > 0) parts.push(`${EMOJIS.frostbite}(${target.frostbiteRounds}L)`);
  if (target.stunRounds && target.stunRounds > 0) parts.push(`${EMOJIS.stun}(${target.stunRounds}L)`);
  if (target.breakRounds && target.breakRounds > 0) parts.push(`${EMOJIS.break}(${target.breakRounds}L)`);
  if (target.healBanRounds && target.healBanRounds > 0) parts.push(`${EMOJIS.healreduction}(${target.healBanRounds}L)`);
  if (target.tauntRounds && target.tauntRounds > 0) parts.push(`${EMOJIS.taunt}(${target.tauntRounds}L)`);
  if (target.atkUp) parts.push(EMOJIS.atkup);
  if (target.atkDown || (target.weakenRounds && target.weakenRounds > 0)) parts.push(EMOJIS.atkdown);
  return parts.length > 0 ? parts.join(" ") : "";
};

const DEBUFF_TYPES = new Set([
  "poison",
  "bleed",
  "burn",
  "freeze",
  "frostbite",
  "stun",
  "break",
  "heal_ban",
  "atkdown",
]);

const applyStatusEffect = (target, effectType, rounds, options = {}) => {
  if (!target) return false;
  const maxHp = Number(target.maxHp) || 0;
  const isBoss = Boolean(target.isBoss);

  // Pet MR / WP Status Effect Resistance check
  if (DEBUFF_TYPES.has(effectType) && Number(target.statusResistPct) > 0 && !options.ignoreResist) {
    const resistChance = Math.min(0.30, Number(target.statusResistPct) || 0);
    if (Math.random() < resistChance) {
      target._lastResistedEffect = effectType;
      return false;
    }
  }

  const clampDotDmg = (dmg) => {
    const raw = Math.max(1, Math.floor(Number(dmg) || 0));
    if (maxHp > 0) {
      const capPct = isBoss ? 0.025 : 0.075;
      return Math.min(raw, Math.max(25, Math.floor(maxHp * capPct)));
    }
    return raw;
  };

  switch (effectType) {
    case "poison":
      target.poisonRounds = Math.min(4, (target.poisonRounds || 0) + rounds);
      if (options.damage) target.poisonDamage = clampDotDmg(options.damage);
      break;
    case "bleed":
      target.bleedRounds = Math.min(4, (target.bleedRounds || 0) + rounds);
      if (options.damage) target.bleedDamage = clampDotDmg(options.damage);
      break;
    case "burn":
      target.burnRounds = Math.min(4, (target.burnRounds || 0) + rounds);
      if (options.damage) target.burnDamage = clampDotDmg(options.damage);
      break;
    case "freeze":
      if ((target.ccImmunityRounds || 0) > 0) break;
      target.freezeRounds = Math.min(1, (target.freezeRounds || 0) + rounds);
      target.ccImmunityRounds = Math.max(target.ccImmunityRounds || 0, 2);
      break;
    case "frostbite":
      target.frostbiteRounds = Math.min(4, (target.frostbiteRounds || 0) + rounds);
      if (options.damage) target.frostbiteDamage = clampDotDmg(options.damage);
      break;
    case "stun":
      if ((target.ccImmunityRounds || 0) > 0) break;
      target.stunRounds = Math.min(1, (target.stunRounds || 0) + rounds);
      target.ccImmunityRounds = Math.max(target.ccImmunityRounds || 0, 2);
      break;
    case "break":
      target.breakRounds = Math.min(4, (target.breakRounds || 0) + rounds);
      break;
    case "heal_ban":
      target.healBanRounds = Math.min(3, (target.healBanRounds || 0) + rounds);
      break;
    case "taunt":
      target.tauntRounds = Math.min(3, (target.tauntRounds || 0) + rounds);
      break;
    case "atkup":
      target.atkUp = true;
      break;
    case "atkdown":
      target.atkDown = true;
      if (options.weakenPct) {
        target.weakenPct = Math.min(0.25, Math.max(target.weakenPct || 0, options.weakenPct));
        target.weakenRounds = Math.min(3, (target.weakenRounds || 0) + (rounds || 2));
      }
      break;
  }
  return true;
};

const tickStatusEffects = (target, activeDungeon) => {
  if (!target) return { skipTurn: false, logs: [] };
  const logs = [];

  if (target.ccImmunityRounds && target.ccImmunityRounds > 0) {
    target.ccImmunityRounds -= 1;
  }
  if (target.weakenRounds && target.weakenRounds > 0) {
    target.weakenRounds -= 1;
    if (target.weakenRounds <= 0) {
      target.weakenPct = 0;
      target.atkDown = false;
    }
  }

  const isStunned = target.stunRounds && target.stunRounds > 0;
  const isFrozen = target.freezeRounds && target.freezeRounds > 0;
  if (isStunned || isFrozen) {
    const skipReason = isFrozen ? `ĐÓNG BĂNG ${EMOJIS.freeze}` : `CHOÁNG ${EMOJIS.stun}`;
    logs.push(`⚠️ **${target.name}** đang bị ${skipReason} — mất lượt hành động!`);
    if (isFrozen) {
      target.freezeRounds -= 1;
      if (target.freezeRounds === 0) logs.push(`${EMOJIS.freeze} **${target.name}** giải đóng băng.`);
    }
    if (isStunned) {
      target.stunRounds -= 1;
      if (target.stunRounds === 0) logs.push(`${EMOJIS.stun} **${target.name}** hết choáng.`);
    }
    if (target.breakRounds && target.breakRounds > 0) target.breakRounds -= 1;
    return { skipTurn: true, logs };
  }

  if (target.breakRounds && target.breakRounds > 0) target.breakRounds -= 1;

  const maxHp = Number(target.maxHp) || 0;
  const isBoss = Boolean(target.isBoss);
  const singleTickCap = maxHp > 0
    ? Math.max(25, Math.floor(maxHp * (isBoss ? 0.025 : 0.075)))
    : Infinity;
  const totalTickCap = maxHp > 0
    ? Math.max(40, Math.floor(maxHp * (isBoss ? 0.040 : 0.120)))
    : Infinity;

  const dotReduceFactor = 1 - Math.min(0.25, Math.max(0, Number(target.dotReducePct) || 0));
  let totalDotDmg = 0;
  if (target.poisonRounds && target.poisonRounds > 0) {
    const rawDmg = (target.poisonDamage || Math.floor(maxHp * 0.04)) * dotReduceFactor;
    const dmg = Math.min(singleTickCap, Math.max(1, Math.floor(rawDmg)));
    target.poisonRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.poisonous} **${target.name}** mất **${dmg.toLocaleString()}** HP do Độc (Còn ${target.poisonRounds} lượt).`);
  }
  if (target.bleedRounds && target.bleedRounds > 0) {
    const rawDmg = (target.bleedDamage || Math.floor(maxHp * 0.045)) * dotReduceFactor;
    const dmg = Math.min(singleTickCap, Math.max(1, Math.floor(rawDmg)));
    target.bleedRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.bleed} **${target.name}** mất **${dmg.toLocaleString()}** HP do Chảy Máu (Còn ${target.bleedRounds} lượt).`);
  }
  if (target.burnRounds && target.burnRounds > 0) {
    let rawDmg = (target.burnDamage || Math.floor(maxHp * 0.04)) * dotReduceFactor;
    if (target.freezeRounds && target.freezeRounds > 0) rawDmg = Math.floor(rawDmg * 1.35);
    const dmg = Math.min(singleTickCap, Math.max(1, Math.floor(rawDmg)));
    target.burnRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.burn} **${target.name}** mất **${dmg.toLocaleString()}** HP do Thiêu Đốt (Còn ${target.burnRounds} lượt).`);
  }
  if (target.frostbiteRounds && target.frostbiteRounds > 0) {
    const rawDmg = (target.frostbiteDamage || Math.floor(maxHp * 0.04)) * dotReduceFactor;
    const dmg = Math.min(singleTickCap, Math.max(1, Math.floor(rawDmg)));
    target.frostbiteRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.frostbite} **${target.name}** mất **${dmg.toLocaleString()}** HP do Frostbite (Còn ${target.frostbiteRounds} lượt).`);
  }
  if (totalDotDmg > 0) {
    totalDotDmg = Math.min(totalTickCap, totalDotDmg);
    const actualDmg = Math.min(target.hp, totalDotDmg);
    target.hp = Math.max(0, target.hp - totalDotDmg);
    if (activeDungeon) {
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;
    }
    if (target.hp <= 0) logs.push(`💀 **${target.name}** đã tử nạn do sát thương DoT duy trì!`);
  }

  return { skipTurn: false, logs };
};

// ============================================================================
// UNIFIED RANDOM PASSIVE POOL (OwO-style: Identical mechanics, stats scaled
// strictly by Rarity + Wear + Quality%)
// ============================================================================
const RANDOM_PASSIVE_POOL = [
  {
    type: "lifesteal",
    name: "Hút Máu",
    emoji: EMOJIS.lifesteal,
    baseMin: 0.04,
    baseMax: 0.12,
    procRate: 0.50,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.lifesteal} **Hút Máu** *(${wearBadge})* — Hồi phục **+${pctText}** sát thương thực gây ra`,
  },
  {
    type: "armor_pierce",
    name: "Xuyên Giáp",
    emoji: EMOJIS.armor_pierce,
    baseMin: 0.06,
    baseMax: 0.18,
    procRate: 0.50,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.armor_pierce} **Xuyên Giáp** *(${wearBadge})* — Bỏ qua **+${pctText}** Giáp vật lý (PR)`,
  },
  {
    type: "mr_pierce",
    name: "Xuyên Kháng Phép",
    emoji: EMOJIS.dispe,
    baseMin: 0.06,
    baseMax: 0.18,
    procRate: 0.50,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.dispe} **Xuyên Kháng Phép** *(${wearBadge})* — Bỏ qua **+${pctText}** Kháng phép (MR)`,
  },
  {
    type: "bleed",
    name: "Chảy Máu",
    emoji: EMOJIS.bleed,
    baseMin: 0.06,
    baseMax: 0.15,
    procRate: 0.40,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.bleed} **Chảy Máu** *(${wearBadge})* — Gây xuất huyết **+${pctText}** sát thương thực/lượt (2 lượt)`,
  },
  {
    type: "burn",
    name: "Thiêu Đốt",
    emoji: EMOJIS.burn,
    baseMin: 0.06,
    baseMax: 0.15,
    procRate: 0.40,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.burn} **Thiêu Đốt** *(${wearBadge})* — Thiêu đốt mục tiêu **+${pctText}** sát thương thực/lượt (2 lượt)`,
  },
  {
    type: "poison",
    name: "Kịch Độc",
    emoji: EMOJIS.poisonous,
    baseMin: 0.05,
    baseMax: 0.12,
    procRate: 0.40,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.poisonous} **Kịch Độc** *(${wearBadge})* — Trúng độc **+${pctText}** sát thương thực/lượt (3 lượt)`,
  },
  {
    type: "crit",
    name: "Bạo Kích",
    emoji: EMOJIS.atkup,
    baseMin: 0.08,
    baseMax: 0.22,
    procRate: 0.45,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.atkup} **Bạo Kích** *(${wearBadge})* — Cường hóa **+${pctText}** sát thương đòn đánh`,
  },
  {
    type: "double_hit",
    name: "Đòn Kép",
    emoji: EMOJIS.atkup,
    baseMin: 0.10,
    baseMax: 0.24,
    procRate: 0.35,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.atkup} **Đòn Kép** *(${wearBadge})* — Tấn công bồi thêm gây **+${pctText}** sát thương`,
  },
  {
    type: "stun",
    name: "Làm Choáng",
    emoji: EMOJIS.stun,
    baseMin: 0.05,
    baseMax: 0.14,
    procRate: 1.0, // Uses value directly as stun chance
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.stun} **Làm Choáng** *(${wearBadge})* — **+${pctText}** cơ hội làm Choáng mục tiêu 1 lượt`,
  },
  {
    type: "freeze",
    name: "Đóng Băng",
    emoji: EMOJIS.freeze,
    baseMin: 0.05,
    baseMax: 0.14,
    procRate: 1.0, // Uses value directly as freeze chance
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.freeze} **Đóng Băng** *(${wearBadge})* — **+${pctText}** cơ hội Đóng Băng mục tiêu 1 lượt`,
  },
  {
    type: "weaken",
    name: "Suy Yếu",
    emoji: EMOJIS.atkdown,
    baseMin: 0.06,
    baseMax: 0.16,
    procRate: 0.40,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.atkdown} **Suy Yếu** *(${wearBadge})* — Giảm **-${pctText}** sát thương mục tiêu gây ra (2 lượt)`,
  },
  {
    type: "heal_cut",
    name: "Vết Thương Sâu",
    emoji: EMOJIS.healreduction,
    baseMin: 0.15,
    baseMax: 0.35,
    procRate: 0.40,
    formatDesc: (pctText, wearBadge) =>
      `${EMOJIS.healreduction} **Vết Thương Sâu** *(${wearBadge})* — Giảm **-${pctText}** hiệu quả hồi máu của mục tiêu (2 lượt)`,
  },
];

const RANDOM_PASSIVE_BY_TYPE = Object.fromEntries(
  RANDOM_PASSIVE_POOL.map((p) => [p.type, p])
);

const WEAR_SCORES = {
  worn: { name: "Worn", bonus: 0, score: 0.25 },
  decent: { name: "Decent", bonus: 1, score: 0.50 },
  fine: { name: "Fine", bonus: 3, score: 0.75 },
  pristine: { name: "Pristine", bonus: 5, score: 1.00 },
};

const RARITY_SCORES = {
  Common: 0.15,
  Rare: 0.30,
  Epic: 0.45,
  Generation: 0.55,
  Legendary: 0.65,
  Mythic: 0.80,
  Ancient: 0.90,
  Divine: 1.00,
  Secret: 1.00,
};

function getWeaponQualityFactor(rarity = "Common", quality = 50, wear = null) {
  const wearInfo = resolveWearInfo(wear, quality);
  const qVal = Math.max(10, Math.min(105, Number(quality) || 50));
  const qualityScore = qVal / 100;
  const rarityScore = RARITY_SCORES[rarity] ?? 0.30;
  const wearScore = wearInfo.score;

  // Composite factor: 45% Quality + 30% Wear + 25% Rarity
  const compositeFactor = Math.max(0.1, Math.min(1.0, qualityScore * 0.45 + wearScore * 0.30 + rarityScore * 0.25));
  // Multiplier directly proportional to Rarity, Wear, Quality (from ~0.75 to ~1.40)
  const powerStatMultiplier = Math.round((0.75 + 0.55 * compositeFactor) * 1000) / 1000;

  return {
    wearInfo,
    qVal,
    clampedQuality: qVal,
    qualityScore,
    rarityScore,
    wearScore,
    compositeFactor,
    powerStatMultiplier,
  };
}

function resolveWearInfo(wear, quality = 50) {
  if (wear && typeof wear === "object" && wear.name) {
    const key = String(wear.id || wear.name).toLowerCase();
    if (WEAR_SCORES[key]) {
      return { id: key, name: WEAR_SCORES[key].name, bonus: WEAR_SCORES[key].bonus, score: WEAR_SCORES[key].score };
    }
  }
  if (typeof wear === "string" && wear.trim()) {
    const key = wear.trim().toLowerCase();
    if (WEAR_SCORES[key]) {
      return { id: key, name: WEAR_SCORES[key].name, bonus: WEAR_SCORES[key].bonus, score: WEAR_SCORES[key].score };
    }
  }
  const q = Number(quality) || 50;
  if (q >= 95) return { id: "pristine", name: "Pristine", bonus: 5, score: 1.00 };
  if (q >= 80) return { id: "fine", name: "Fine", bonus: 3, score: 0.75 };
  if (q >= 60) return { id: "decent", name: "Decent", bonus: 1, score: 0.50 };
  return { id: "worn", name: "Worn", bonus: 0, score: 0.25 };
}

function computeRandomPassiveSpec(passiveType, rarity = "Common", quality = 50, wear = null) {
  const def = RANDOM_PASSIVE_BY_TYPE[passiveType] || RANDOM_PASSIVE_POOL[0];
  const { wearInfo, clampedQuality, compositeFactor } = getWeaponQualityFactor(rarity, quality, wear);

  const finalValue = Math.round((def.baseMin + (def.baseMax - def.baseMin) * compositeFactor) * 1000) / 1000;
  const pctNum = Math.round(finalValue * 1000) / 10;
  const percentText = Number.isInteger(pctNum) ? `${pctNum}%` : `${pctNum.toFixed(1)}%`;
  const qDisplay = Number.isInteger(clampedQuality) ? `${clampedQuality}%` : `${clampedQuality.toFixed(1)}%`;
  const wearBadge = `${wearInfo.name} ${qDisplay} [${rarity}]`;

  return {
    type: def.type,
    name: def.name,
    emoji: def.emoji,
    value: finalValue,
    wearName: wearInfo.name,
    quality: clampedQuality,
    rarity,
    description: def.formatDesc(percentText, wearBadge),
  };
}

function computeFixedWeaponPassive(subType, rarity = "Common", quality = 50, wear = null) {
  if (!subType) return null;
  const clean = String(subType).toLowerCase().replace(/\s+/g, "");
  const { getWeaponPassive, getWeaponPassiveEmojis } = require("../data/rpg/weaponPassives");
  const baseP = getWeaponPassive(clean);
  if (!baseP) return null;

  const { wearInfo, clampedQuality, compositeFactor } = getWeaponQualityFactor(rarity, quality, wear);

  // Scale multiplier directly proportional to Rarity, Wear, Quality (from 0.80 to 1.35)
  const scale = Math.round((0.80 + 0.55 * compositeFactor) * 1000) / 1000;
  const scalePct = Math.round(scale * 100);

  const qDisplay = Number.isInteger(clampedQuality) ? `${clampedQuality}%` : `${clampedQuality.toFixed(1)}%`;
  const wearBadge = `${wearInfo.name} ${qDisplay} [${rarity}]`;

  let desc = baseP.description || "";
  desc += ` *(Hiệu lực: ${scalePct}% • ${wearBadge})*`;

  return {
    name: baseP.name,
    type: baseP.type,
    emoji: getWeaponPassiveEmojis(clean),
    scale,
    wearName: wearInfo.name,
    quality: clampedQuality,
    rarity,
    description: desc,
  };
}

function rollRandomWeaponPassive(rarity = "Common", quality = 50, wear = null, seedId = null) {
  let index;
  if (seedId !== null && seedId !== undefined && Number.isFinite(Number(seedId))) {
    const hash = Math.abs(Math.imul(Number(seedId) ^ 0x9e3779b9, 2654435761));
    index = hash % RANDOM_PASSIVE_POOL.length;
  } else {
    index = Math.floor(Math.random() * RANDOM_PASSIVE_POOL.length);
  }
  const picked = RANDOM_PASSIVE_POOL[index];
  return computeRandomPassiveSpec(picked.type, rarity, quality, wear);
}

function normalizeRandomWeaponPassive(existingRandomPassive, rarity = "Common", quality = 50, wear = null, seedId = null) {
  if (existingRandomPassive && typeof existingRandomPassive === "object" && existingRandomPassive.type) {
    const cleanType = existingRandomPassive.type === "crit_dmg" ? "crit" : existingRandomPassive.type;
    if (RANDOM_PASSIVE_BY_TYPE[cleanType]) {
      return computeRandomPassiveSpec(cleanType, rarity, quality, wear);
    }
  }
  return rollRandomWeaponPassive(rarity, quality, wear, seedId);
}

const resolveWeaponPassive = (player, enemy, context = {}) => {
  const { mode = "dungeon", rawDamage = 0, isMagical = false, isSecondHit = false, isSkill = false } = context;

  const pWeaponSubType = player.weapon?.subType
    ? player.weapon.subType.toLowerCase().replace(/\s+/g, "")
    : "";

  const result = {
    damage: rawDamage,
    mrOrArmor: isMagical ? (enemy.magicResist || 0) : (enemy.armor || 0),
    doubleHitTriggered: false,
    logs: [],
    bleedDamage: 0,
    healAmount: 0,
    nextAttackMult: 1.0,
    hitCounterInc: false,
    hitCountReached: false,
    absorbedDamage: 0,
    shouldReflect: false,
    reflectDamage: 0,
    selfDamageReduce: 0,
    pierceFlags: { blueStaff: false, crimsonDagger: false, sunbow: false, spearhex: false },
  };

  const stats = player.stats || {};
  const power = player.power || 0;
  const calcScaling = (scalingFn) => {
    if (typeof scalingFn === "function") return Math.floor(scalingFn(stats, power));
    return 0;
  };

  // Pending post-mitigation percentage effects (computed after all damageMult & defense shred/pierce)
  const pendingDamageHeals = []; // { pct, logFn, passiveType }
  const pendingMissingHpHeals = []; // { pct, minMaxHpPct, logFn, passiveType }
  const pendingMaxHpHeals = []; // { pct, logFn, passiveType }
  const pendingHitDots = []; // { effectType, rounds, pct, logText }

  const passiveDef = getWeaponPassive(pWeaponSubType);
  const passive = passiveDef ? passiveDef.mode[mode] : null;
  const fixedPassiveScale = Number(player.weapon?.fixedPassive?.scale) || 1.0;

  if (passiveDef && passive) {
    const addPassiveLog = (message, passiveType = passive.type) => {
      const formatted = formatPassiveLog(message, passiveType);
      if (formatted) result.logs.push(formatted);
    };

    const hasTriggered = Math.random() < WEAPON_PASSIVE_TRIGGER_RATE;

    switch (passive.type) {
      case PASSIVE_TYPES.POISON: {
        if (!hasTriggered) break;
        const poisonDmg = calcScaling(passive.scaling);
        applyStatusEffect(enemy, "poison", passive.rounds, { damage: poisonDmg });
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        for (const extraEffect of passive.extraEffects || []) {
          if (extraEffect.type !== PASSIVE_TYPES.ARMOR_SHRED) continue;
          const amount = extraEffect.amount || 0.10;
          const cap = extraEffect.cap || 0.40;
          const currentReduced = enemy._armorReduced || 0;
          const applied = Math.min(amount, Math.max(0, cap - currentReduced));
          if (applied <= 0) continue;
          enemy._armorReduced = currentReduced + applied;
          enemy.armor = Math.max(0, Math.floor((enemy.armor || 0) * (1 - applied)));
          if (!isMagical) {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
          }
          if (extraEffect.alsoShredMR) {
            enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
            if (isMagical) {
              result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
            }
          }
        }
        break;
      }

      case PASSIVE_TYPES.BLEED: {
        if (!hasTriggered) break;
        const bleedDmg = calcScaling(passive.scaling);
        applyStatusEffect(enemy, "bleed", passive.rounds, { damage: bleedDmg });
        result.bleedDamage = bleedDmg;
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        addPassiveLog(
          passive.log
            ? passive.log(enemy.name)
            : passiveDef.name
              ? `${EMOJIS.bleed} **[${passiveDef.name}]** Gây chảy máu ${passive.rounds} lượt!`
              : "",
          passive.type
        );
        for (const extraEffect of passive.extraEffects || []) {
          if (extraEffect.type !== PASSIVE_TYPES.ARMOR_SHRED) continue;
          const amount = extraEffect.amount || 0.10;
          const cap = extraEffect.cap || 0.40;
          const currentReduced = enemy._armorReduced || 0;
          const applied = Math.min(amount, Math.max(0, cap - currentReduced));
          if (applied <= 0) continue;
          enemy._armorReduced = currentReduced + applied;
          enemy.armor = Math.max(0, Math.floor((enemy.armor || 0) * (1 - applied)));
          if (!isMagical) {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
          }
          if (extraEffect.alsoShredMR) {
            enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
            if (isMagical) {
              result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
            }
          }
        }
        break;
      }

      case PASSIVE_TYPES.BURN: {
        if (!hasTriggered) break;
        const burnDmg = calcScaling(passive.scaling);
        applyStatusEffect(enemy, "burn", passive.rounds || 2, { damage: burnDmg });
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (passive.alsoApplies) {
          if (passive.alsoApplies.type === PASSIVE_TYPES.HEAL_BAN) {
            applyStatusEffect(enemy, "heal_ban", passive.alsoApplies.rounds);
          }
        }
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        break;
      }

      case PASSIVE_TYPES.FREEZE: {
        if (!hasTriggered) break;
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (passive.pierceAmount) {
          result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - passive.pierceAmount)));
        }
        const chance = passive.chance || 0.30;
        if ((enemy.ccImmunityRounds || 0) <= 0 && Math.random() < chance) {
          applyStatusEffect(enemy, "freeze", passive.rounds || 1);
          addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        } else if (passive.damageMult || passive.pierceAmount) {
          addPassiveLog(`${EMOJIS.freeze} **[${passiveDef.name}]** Hàn khí bùng phát gia tăng sát thương!`, PASSIVE_TYPES.FREEZE);
        }
        break;
      }

      case PASSIVE_TYPES.STUN: {
        if (!hasTriggered) break;
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        const chance = passive.chance || 0.55;
        if ((enemy.ccImmunityRounds || 0) <= 0 && Math.random() < chance) {
          applyStatusEffect(enemy, "stun", passive.rounds || 1);
          addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        } else if (passive.damageMult) {
          addPassiveLog(`${EMOJIS.atkup} **[${passiveDef.name}]** Cường hóa đòn đánh (+${Math.round((passive.damageMult - 1) * 100)}% sát thương)!`, PASSIVE_TYPES.STUN);
        }
        break;
      }

      case PASSIVE_TYPES.HEAL_BAN: {
        if (!hasTriggered) break;
        applyStatusEffect(enemy, "heal_ban", passive.rounds || 2);
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (passive.executeThreshold && enemy.maxHp && (enemy.hp / enemy.maxHp) <= passive.executeThreshold) {
          result.damage = Math.floor(result.damage * (1 + (passive.executeBonus || 0.28)));
        }
        if (passive.lifestealPct) {
          pendingDamageHeals.push({
            pct: passive.lifestealPct,
            logFn: null,
            passiveType: passive.type,
          });
        }
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        break;
      }

      case PASSIVE_TYPES.LIFESTEAL: {
        if (!hasTriggered) break;
        if (passive.executeThreshold && enemy.maxHp && (enemy.hp / enemy.maxHp) <= passive.executeThreshold) {
          result.damage = Math.floor(result.damage * (1 + (passive.executeBonus || 0.22)));
        }
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (passive.healType === "damage") {
          pendingDamageHeals.push({
            pct: passive.pct || 0.08,
            logFn: passive.log ? (healAmt) => passive.log(player.name, healAmt) : null,
            passiveType: passive.type,
          });
        } else if (passive.healType === "missing_hp") {
          pendingMissingHpHeals.push({
            pct: passive.pct || 0.10,
            minMaxHpPct: passive.minMaxHpPct || 0.03,
            logFn: passive.log ? (healAmt) => passive.log(player.name, healAmt) : null,
            passiveType: passive.type,
          });
        }
        break;
      }

      case PASSIVE_TYPES.DAMAGE_MULT: {
        const hitCounterKey = `_${pWeaponSubType}Hits`;
        player[hitCounterKey] = (player[hitCounterKey] || 0) + 1;
        if (player[hitCounterKey] >= (passive.hitCount || 3)) {
          player[hitCounterKey] = 0;
          result.damage = Math.floor(result.damage * passive.mult);
          if (passive.mrPierce) {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - passive.mrPierce)));
          }
          if (passive.armorPierce) {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - passive.armorPierce)));
          }
          addPassiveLog(passive.log ? passive.log() : "");
        }
        break;
      }

      case PASSIVE_TYPES.ARMOR_PIERCE: {
        if (!hasTriggered) break;
        const amount = passive.amount || 0.20;
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (pWeaponSubType === "crimsondagger") result.pierceFlags.crimsonDagger = true;
        if (pWeaponSubType === "spearhex") result.pierceFlags.spearhex = true;
        if (passive.alsoPierceMR && pWeaponSubType === "sunbow") {
          result.pierceFlags.sunbow = true;
        }
        result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - amount)));
        addPassiveLog(passive.log ? passive.log() : "");
        break;
      }

      case PASSIVE_TYPES.MR_PIERCE: {
        if (!hasTriggered) break;
        const amount = passive.amount || 0.28;
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (pWeaponSubType === "bluestaff") result.pierceFlags.blueStaff = true;
        result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - amount)));
        if (passive.alsoRoll) {
          if ((enemy.ccImmunityRounds || 0) <= 0 && Math.random() < (passive.alsoRoll.chance || 0.25)) {
            applyStatusEffect(enemy, "freeze", passive.alsoRoll.rounds || 1);
            addPassiveLog(`${EMOJIS.freeze} **[Blue Staff]** Làm đóng băng **${enemy.name}**!`, PASSIVE_TYPES.FREEZE);
          }
        }
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        break;
      }

      case PASSIVE_TYPES.ARMOR_SHRED: {
        if (!hasTriggered) break;
        const amount = passive.amount || 0.15;
        let applied = amount;
        if (passive.cap) {
          const currentReduced = enemy._armorReduced || 0;
          applied = Math.min(amount, Math.max(0, passive.cap - currentReduced));
          enemy._armorReduced = currentReduced + applied;
        }
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (applied > 0) {
          enemy.armor = Math.max(0, Math.floor((enemy.armor || 0) * (1 - applied)));
          if (!isMagical) {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
          }
          if (passive.alsoShredMR) {
            enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
            if (isMagical) {
              result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
            }
          }
        }
        if (passive.healPctMaxHp) {
          pendingMaxHpHeals.push({
            pct: passive.healPctMaxHp,
            logFn: null,
            passiveType: passive.type,
          });
        }
        addPassiveLog(
          passive.log
            ? passive.log(enemy.name, {
                armor: enemy.armor || 0,
                mr: enemy.magicResist || 0,
                totalReduced: enemy._armorReduced || amount,
              })
            : ""
        );
        break;
      }

      case PASSIVE_TYPES.MR_SHRED: {
        if (!hasTriggered) break;
        const amount = passive.amount || 0.22;
        let applied = amount;
        if (passive.cap) {
          const currentReduced = enemy._mrReduced || 0;
          applied = Math.min(amount, Math.max(0, passive.cap - currentReduced));
          enemy._mrReduced = currentReduced + applied;
        }
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (applied > 0) {
          enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
          if (isMagical) {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
          }
        }
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        break;
      }

      case PASSIVE_TYPES.DOUBLE_HIT: {
        if (isSecondHit) break;
        if ((enemy.hp === undefined || enemy.hp > 0) && Math.random() < (passive.chance || 0.30)) {
          result.doubleHitTriggered = true;
          if (mode === "pvp" || mode === "boss") {
            const bonusMult = passive.bonusMult || 0.35;
            result.damage = Math.floor(result.damage * (1 + bonusMult));
          }
          addPassiveLog(passive.log ? passive.log() : "");
        }
        break;
      }

      case PASSIVE_TYPES.REFLECT: {
        if (hasTriggered && passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
          addPassiveLog(passive.log ? passive.log() : "");
        }
        break;
      }

      case PASSIVE_TYPES.HEAL_ON_SKILL: {
        if (isSkill || hasTriggered) {
          if (passive.damageMult) {
            result.damage = Math.floor(result.damage * passive.damageMult);
          }
          pendingMissingHpHeals.push({
            pct: 0.12,
            minMaxHpPct: 0.04,
            logFn: passive.log ? (healAmt) => passive.log(player.name, healAmt) : null,
            passiveType: passive.type,
          });
        }
        break;
      }

      case PASSIVE_TYPES.NEXT_ATTACK_MULT: {
        if (hasTriggered) {
          result.nextAttackMult = passive.mult || 1.4;
          addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        }
        break;
      }

      case PASSIVE_TYPES.RANDOM_EFFECT: {
        if (!hasTriggered) break;
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        const effects = passive.effects || [];
        if (effects.length === 0) break;
        const chosen = effects[Math.floor(Math.random() * effects.length)];
        switch (chosen.type) {
          case PASSIVE_TYPES.BLEED: {
            const bleedDmg = calcScaling(chosen.scaling);
            applyStatusEffect(enemy, "bleed", chosen.rounds || 2, { damage: bleedDmg });
            addPassiveLog(`${EMOJIS.bleed} **[${passiveDef.name}]** Lời nguyền gây chảy máu!`, chosen.type);
            break;
          }
          case PASSIVE_TYPES.BURN: {
            const burnDmg = calcScaling(chosen.scaling);
            applyStatusEffect(enemy, "burn", chosen.rounds || 2, { damage: burnDmg });
            addPassiveLog(`${EMOJIS.burn} **[${passiveDef.name}]** Lời nguyền thiêu đốt!`, chosen.type);
            break;
          }
          case PASSIVE_TYPES.ARMOR_SHRED: {
            const amount = chosen.amount || 0.18;
            const cap = chosen.cap || 0.40;
            const currentReduced = enemy._armorReduced || 0;
            const applied = Math.min(amount, Math.max(0, cap - currentReduced));
            if (applied > 0) {
              enemy._armorReduced = currentReduced + applied;
              enemy.armor = Math.max(0, Math.floor((enemy.armor || 0) * (1 - applied)));
              if (!isMagical) {
                result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
              }
              if (chosen.alsoShredMR) {
                enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
                if (isMagical) {
                  result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
                }
              }
            }
            addPassiveLog(`${EMOJIS.break} **[${passiveDef.name}]** Lời nguyền phá giáp!`, chosen.type);
            break;
          }
          case PASSIVE_TYPES.ARMOR_PIERCE: {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - (chosen.amount || 0.30))));
            addPassiveLog(`${EMOJIS.armor_pierce} **[${passiveDef.name}]** Lời nguyền xuyên phòng thủ!`, chosen.type);
            break;
          }
          case PASSIVE_TYPES.MR_PIERCE: {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - (chosen.amount || 0.30))));
            addPassiveLog(`${EMOJIS.dispe} **[${passiveDef.name}]** Lời nguyền xuyên kháng phép!`, chosen.type);
            break;
          }
          case PASSIVE_TYPES.STUN: {
            if ((enemy.ccImmunityRounds || 0) <= 0) {
              applyStatusEffect(enemy, "stun", chosen.rounds || 1);
              addPassiveLog(`${EMOJIS.stun} **[${passiveDef.name}]** Lời nguyền làm choáng!`, chosen.type);
            }
            break;
          }
        }
        break;
      }

      case PASSIVE_TYPES.DEFLECT:
        break;

      case PASSIVE_TYPES.NONE:
        if (hasTriggered) {
          if (passive.damageMult) {
            result.damage = Math.floor(result.damage * passive.damageMult);
          }
          if (passive.targetAtkDown) {
            applyStatusEffect(enemy, "atkdown", 2, { weakenPct: 0.16 });
          }
          addPassiveLog(passive.log ? passive.log(enemy.name) : "");
        }
        break;

      default:
        break;
    }

    if (passive.selfDamageReduce) {
      result.selfDamageReduce = passive.selfDamageReduce;
    }
  }

  // ==========================================================================
  // 2. RESOLVE RANDOM PASSIVE (Applies to BOTH Special Weapons & Normal Weapons)
  // ==========================================================================
  const rawRandPassive = player.weapon?.randomPassive;
  if (rawRandPassive && typeof rawRandPassive === "object") {
    // Normalize & clamp value on-the-fly so legacy inflated passives (e.g. 33.7% burn) can NEVER trigger un-clamped!
    const normRand = normalizeRandomWeaponPassive(
      rawRandPassive,
      player.weapon?.rarity || "Common",
      player.weapon?.quality ?? 50,
      player.weapon?.wear || null,
      player.weapon?.id
    );
    const poolDef = RANDOM_PASSIVE_BY_TYPE[normRand.type];
    const randVal = normRand.value;
    const randEmoji = normRand.emoji;
    const randName = normRand.name;

    if (normRand.type === "stun") {
      if ((enemy.ccImmunityRounds || 0) <= 0 && Math.random() < randVal) {
        applyStatusEffect(enemy, "stun", 1);
        result.logs.push(`${randEmoji} **[${randName}]** Làm choáng **${enemy.name}** 1 lượt!`);
      }
    } else if (normRand.type === "freeze") {
      if ((enemy.ccImmunityRounds || 0) <= 0 && Math.random() < randVal) {
        applyStatusEffect(enemy, "freeze", 1);
        result.logs.push(`${randEmoji} **[${randName}]** Đóng băng **${enemy.name}** 1 lượt!`);
      }
    } else {
      const procChance = poolDef?.procRate || 0.45;
      if (Math.random() < procChance) {
        switch (normRand.type) {
          case "armor_pierce":
          case "mr_pierce": {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - randVal)));
            result.logs.push(`${randEmoji} **[${randName}]** Bỏ qua **${Math.round(randVal * 100)}%** phòng ngự!`);
            break;
          }
          case "crit": {
            result.damage = Math.floor(result.damage * (1 + randVal));
            result.logs.push(`${randEmoji} **[${randName}]** Đòn đánh bạo kích gia tăng **+${Math.round(randVal * 100)}%** sát thương!`);
            break;
          }
          case "double_hit": {
            result.doubleHitTriggered = true;
            result.damage = Math.floor(result.damage * (1 + randVal));
            result.logs.push(`${randEmoji} **[${randName}]** Tấn công kép gây thêm **+${Math.round(randVal * 100)}%** sát thương!`);
            break;
          }
          case "lifesteal": {
            pendingDamageHeals.push({
              pct: randVal,
              logFn: (healAmt) => `${randEmoji} **[${randName}]** Hút máu hồi **+${healAmt.toLocaleString()}** HP!`,
              passiveType: PASSIVE_TYPES.LIFESTEAL,
            });
            break;
          }
          case "bleed": {
            pendingHitDots.push({
              effectType: "bleed",
              rounds: 2,
              pct: randVal,
              logText: `${randEmoji} **[${randName}]** Gây chảy máu lên **${enemy.name}**!`,
            });
            break;
          }
          case "burn": {
            pendingHitDots.push({
              effectType: "burn",
              rounds: 2,
              pct: randVal,
              logText: `${randEmoji} **[${randName}]** Thiêu đốt **${enemy.name}**!`,
            });
            break;
          }
          case "poison": {
            pendingHitDots.push({
              effectType: "poison",
              rounds: 3,
              pct: randVal,
              logText: `${randEmoji} **[${randName}]** Tiêm kịch độc lên **${enemy.name}**!`,
            });
            break;
          }
          case "weaken": {
            applyStatusEffect(enemy, "atkdown", 2, { weakenPct: randVal });
            result.logs.push(`${randEmoji} **[${randName}]** Làm suy yếu **-${Math.round(randVal * 100)}%** công kích của **${enemy.name}**!`);
            break;
          }
          case "heal_cut": {
            applyStatusEffect(enemy, "heal_ban", 2);
            result.logs.push(`${randEmoji} **[${randName}]** Vết thương sâu áp chế hồi máu của **${enemy.name}**!`);
            break;
          }
          default:
            break;
        }
      }
    }
  }

  // ==========================================================================
  // 3. FINALIZE POST-MITIGATION DAMAGE FOR LIFESTEAL & PERCENTAGE DoT
  //    (Prevents unmitigated rawDamage from causing 74,437 burn or 11,044 heal!)
  // ==========================================================================
  const levelForMitigation = Math.max(1, Number(player.level) || 60);
  const effectiveDefense = Math.max(0, Number(result.mrOrArmor) || 0);
  const effectiveMitigation = effectiveDefense / (effectiveDefense + 150 + levelForMitigation * 2);
  const mitigatedHitDamage = Math.max(10, Math.floor(result.damage * (1 - effectiveMitigation)));

  const playerMaxHp = Number(player.maxHp) || 0;
  const maxTurnHeal = playerMaxHp > 0
    ? Math.max(50, Math.floor(playerMaxHp * (mode === "pvp" ? 0.12 : 0.18)))
    : Infinity;

  for (const h of pendingDamageHeals) {
    const rawHeal = Math.max(1, Math.floor(mitigatedHitDamage * h.pct));
    const clampedHeal = Math.min(maxTurnHeal, rawHeal);
    result.healAmount += clampedHeal;
    if (h.logFn) {
      const formatted = formatPassiveLog(h.logFn(clampedHeal), h.passiveType);
      if (formatted) result.logs.push(formatted);
    }
  }

  for (const h of pendingMissingHpHeals) {
    const missing = Math.max(0, (player.maxHp || 0) - (player.hp || 0));
    const minFloor = h.minMaxHpPct && playerMaxHp > 0 ? Math.floor(playerMaxHp * h.minMaxHpPct) : 1;
    const rawHeal = Math.max(minFloor, Math.floor(missing * h.pct));
    const clampedHeal = Math.min(maxTurnHeal, rawHeal);
    result.healAmount += clampedHeal;
    if (h.logFn) {
      const formatted = formatPassiveLog(h.logFn(clampedHeal), h.passiveType);
      if (formatted) result.logs.push(formatted);
    }
  }

  for (const h of pendingMaxHpHeals) {
    const rawHeal = Math.max(1, Math.floor((playerMaxHp || 500) * h.pct));
    const clampedHeal = Math.min(maxTurnHeal, rawHeal);
    result.healAmount += clampedHeal;
  }

  if (result.healAmount > maxTurnHeal) {
    result.healAmount = maxTurnHeal;
  }

  for (const d of pendingHitDots) {
    const dotDmg = Math.max(15, Math.floor(mitigatedHitDamage * d.pct));
    applyStatusEffect(enemy, d.effectType, d.rounds, { damage: dotDmg });
    if (d.effectType === "bleed") {
      result.bleedDamage = Math.max(result.bleedDamage || 0, enemy.bleedDamage || dotDmg);
    }
    if (d.logText) {
      result.logs.push(d.logText);
    }
  }

  return result;
};

const resolveShieldhexDefense = (target, damage, activeDungeon) => {
  const playerSubType = target.weapon?.subType
    ? target.weapon.subType.toLowerCase().replace(/\s+/g, "")
    : "";
  if (!playerSubType.includes("shieldhex")) return { damage, absorbed: 0, shouldReflect: false };

  if (!target.effects) target.effects = {};
  const absorbPct = Number(config.rpg?.balance?.pvp?.shieldhex_absorb_pct) || 0.15;
  const absorbed = Math.floor(damage * absorbPct);
  const reducedDamage = damage - absorbed;

  target.effects.shieldhexAbsorbed = (target.effects.shieldhexAbsorbed || 0) + absorbed;
  target.effects.shieldhexRounds = (target.effects.shieldhexRounds || 0) + 1;

  return { damage: reducedDamage, absorbed, shouldReflect: false, reflectDamage: 0 };
};

const triggerWeaponPassiveOnAttack = (player, enemy, activeDungeon, rawDamage, isMagical, isSecondHit, multiplier, isSkill) => {
  const result = resolveWeaponPassive(player, enemy, {
    mode: "dungeon",
    rawDamage,
    isMagical,
    isSecondHit,
    isSkill,
  });

  if (result.healAmount > 0 && player.hp !== undefined && player.maxHp !== undefined) {
    player.hp = Math.min(player.maxHp, player.hp + result.healAmount);
  }

  return {
    damage: result.damage,
    mrOrArmor: result.mrOrArmor,
    doubleHitTriggered: result.doubleHitTriggered,
    logs: result.logs,
  };
};

const triggerWorldBossPassive = (cleanSubType, participant, activeBoss, passiveTriggers, damage) => {
  const passiveProbeDamage = Math.max(100, damage || 0);
  const player = {
    name: participant?.name || "Người chơi",
    level: participant?.level || 60,
    weapon: participant?.weapon || { subType: cleanSubType, rarity: participant?.weapon?.rarity },
    stats: participant.effectiveStats || {},
    power: participant.gearPower || 0,
    hp: participant.hp || 0,
    maxHp: participant.maxHp || 0,
  };
  for (const key of Object.keys(participant || {})) {
    if (key.endsWith("Hits")) player[key] = participant[key];
  }
  const enemy = {
    isBoss: true,
    hp: activeBoss.hp || activeBoss.boss?.hp || 100000,
    maxHp: activeBoss.maxHp || activeBoss.boss?.hp || 100000,
    armor: activeBoss.boss?.armor || 0,
    magicResist: activeBoss.boss?.magicResist || 0,
    name: activeBoss.boss?.name || "Boss",
  };

  const result = resolveWeaponPassive(player, enemy, {
    mode: "boss",
    rawDamage: passiveProbeDamage,
    isMagical: false,
  });

  passiveTriggers.push(...result.logs);

  for (const key of Object.keys(player)) {
    if (key.endsWith("Hits")) participant[key] = player[key];
  }

  return {
    blueStaffPierce: result.pierceFlags.blueStaff,
    crimsonDaggerPierce: result.pierceFlags.crimsonDagger,
    sunbowPierce: result.pierceFlags.sunbow,
    holySwordDouble: result.damage > passiveProbeDamage,
    damageMultiplier: result.damage / passiveProbeDamage,
    riverofbloodTriggered: result.healAmount > 0,
    controlTriggered: Boolean(enemy.freezeRounds > 0 || enemy.stunRounds > 0),
  };
};

module.exports = {
  EMOJIS,
  RANDOM_PASSIVE_POOL,
  getPassiveEmoji,
  getWeaponPassiveEmoji,
  PASSIVE_TYPES,
  WEAPON_PASSIVE_TRIGGER_RATE,
  getActiveStatusString,
  applyStatusEffect,
  tickStatusEffects,
  resolveWeaponPassive,
  resolveShieldhexDefense,
  triggerWeaponPassiveOnAttack,
  triggerWorldBossPassive,
  getWeaponPassive,
  isLockedWeapon,
  getPassiveForMode,
  resolveWearInfo,
  computeRandomPassiveSpec,
  getWeaponQualityFactor,
  computeFixedWeaponPassive,
  rollRandomWeaponPassive,
  normalizeRandomWeaponPassive,
};
