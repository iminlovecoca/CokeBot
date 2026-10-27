/**
 * CokeBot Zoo & Animal System
 * Uses CokeBot's Pet & Battle tiers:
 * Common (C) -> Rare (R) -> Epic (E) -> Generation (G) -> Legendary (L) -> Mythic (M) -> Ancient (A) -> Divine (D) -> Secret (S)
 * and species defined in data/pets.js.
 */

const { PET_TIERS, PET_SPECIES, generatePetStats, getPetBattleStats } = require("./pets");

const speciesOrderMap = new Map();
if (Array.isArray(PET_SPECIES)) {
  PET_SPECIES.forEach((s, idx) => {
    if (s.key) speciesOrderMap.set(s.key.toLowerCase(), idx);
  });
}

/**
 * Compare two animal objects for sorting:
 * 1. From lowest rank to highest rank (Common -> Rare -> Epic -> ... -> Secret)
 * 2. Within the same rank, group same species together in canonical PET_SPECIES order
 */
function compareAnimals(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const rankOrderA = ZOO_RANKS[a.rankName || a.tier || a.rank]?.order || 0;
  const rankOrderB = ZOO_RANKS[b.rankName || b.tier || b.rank]?.order || 0;
  if (rankOrderA !== rankOrderB) {
    return rankOrderA - rankOrderB;
  }
  const keyA = (a.key || a.name || "").toLowerCase();
  const keyB = (b.key || b.name || "").toLowerCase();
  const idxA = speciesOrderMap.get(keyA) ?? 999;
  const idxB = speciesOrderMap.get(keyB) ?? 999;
  if (idxA !== idxB) {
    return idxA - idxB;
  }
  return keyA.localeCompare(keyB);
}

const SUPERSCRIPT_NUMBERS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

const toSmallNum = (count, digits = 1) => {
  const cntStr = String(Math.max(0, count));
  const padLength = Math.max(digits, cntStr.length);
  const padded = cntStr.padStart(padLength, "0");
  return padded
    .split("")
    .map((ch) => {
      const n = parseInt(ch, 10);
      return !isNaN(n) ? SUPERSCRIPT_NUMBERS[n] : ch;
    })
    .join("");
};

// Rank metadata calibrated strictly to OwO Bot hunting probabilities and selling prices
// Order: Common (1) -> Rare (2) -> Epic (3) -> Generation (4) -> Legendary (5) -> Mythic (6) -> Ancient (7) -> Divine (8) -> Secret (9) -> Bot (10, Autohunt Radar)
// OwO Bot standard rates:
// Common + Uncommon: ~88.94% | Rare: 10% | Epic: 1% | Legendary: 0.05% | Mythic (Gem): 0.01% | Ancient (Fabled): 0.001% | Divine (Distorted): 0.00025% | Secret (Hidden): 0.0001%
const ZOO_RANKS = {
  Secret: {
    id: "Secret",
    name: "Secret",
    letter: "S",
    order: 9,
    rarity: 0.0001, // 0.0001% (OwO Hidden = 0.0001% / 1 in 1,000,000)
    price: 1000000,
    points: 25000,
    xp: 300000,
    essence: 500000,
    emoji: PET_TIERS.Secret?.emoji || "<a:Secret:1563835098355339285>",
    aliases: ["secret", "s", "bimat"],
  },
  Divine: {
    id: "Divine",
    name: "Divine",
    letter: "D",
    order: 8,
    rarity: 0.00025, // 0.00025% (OwO Distorted = 0.00025% / 1 in 400,000)
    price: 300000,
    points: 10000,
    xp: 100000,
    essence: 200000,
    emoji: PET_TIERS.Divine?.emoji || "<a:divine:1530878610515165365>",
    aliases: ["divine", "d", "than"],
  },
  Ancient: {
    id: "Ancient",
    name: "Ancient",
    letter: "A",
    order: 7,
    rarity: 0.001, // 0.001% (OwO Fabled = 0.001% / 1 in 100,000)
    price: 250000,
    points: 2500,
    xp: 100000,
    essence: 100000,
    emoji: PET_TIERS.Ancient?.emoji || "<a:ancient:1530878606656540814>",
    aliases: ["ancient", "a", "codai"],
  },
  Mythic: {
    id: "Mythic",
    name: "Mythic",
    letter: "M",
    order: 6,
    rarity: 0.01, // 0.01% (OwO Gem = 0.01% / 1 in 10,000)
    price: 30000,
    points: 500,
    xp: 5000,
    essence: 20000,
    emoji: PET_TIERS.Mythic?.emoji || "<a:mythic:1530878614843686912>",
    aliases: ["mythic", "m", "thanthoai"],
  },
  Legendary: {
    id: "Legendary",
    name: "Legendary",
    letter: "L",
    order: 5,
    rarity: 0.05, // 0.05% (OwO Legendary = 0.05% / 1 in 2,000)
    price: 15000,
    points: 100,
    xp: 2000,
    essence: 10000,
    emoji: PET_TIERS.Legendary?.emoji || "<:legendary:1530878570858287205>",
    aliases: ["legendary", "l", "huyenthoai"],
  },
  Generation: {
    id: "Generation",
    name: "Generation",
    letter: "G",
    order: 4,
    rarity: 0.05,
    price: 6000, // Chuẩn OwO Special: giá bán 6.000 Coke
    points: 500, // Chuẩn OwO Special: 500 điểm Zoo
    xp: 250,     // Chuẩn OwO Special: 250 XP
    essence: 5000, // Chuẩn OwO Special: 5.000 Essence khi sacrifice
    emoji: PET_TIERS.Generation?.emoji || "<a:Generation:1563835095541092352>",
    aliases: ["generation", "gen", "g", "thehe", "special"],
  },
  Epic: {
    id: "Epic",
    name: "Epic",
    letter: "E",
    order: 3,
    rarity: 1.0, // 1.0% (OwO Epic = 1.0% / 1 in 100)
    price: 250,
    points: 25,
    xp: 400,
    essence: 250,
    emoji: PET_TIERS.Epic?.emoji || "<:epic:1530878567955566642>",
    aliases: ["epic", "e", "suthi"],
  },
  Rare: {
    id: "Rare",
    name: "Rare",
    letter: "R",
    order: 2,
    rarity: 10.0, // 10.0% (OwO Rare = 10.0% / 1 in 10)
    price: 10,
    points: 5,
    xp: 20,
    essence: 20,
    emoji: PET_TIERS.Rare?.emoji || "<:rare:1530878574104547378>",
    aliases: ["rare", "r", "hiem"],
  },
  Common: {
    id: "Common",
    name: "Common",
    letter: "C",
    order: 1,
    rarity: 88.93865, // OwO Common (58.85%) + Uncommon (30%)
    price: 1,
    points: 1,
    xp: 1,
    essence: 1,
    emoji: PET_TIERS.Common?.emoji || "<:common:1530878565489311826>",
    aliases: ["common", "c", "thuong"],
  },
};

// Fast lookup maps
const ANIMAL_LOOKUP = new Map();
for (const species of PET_SPECIES) {
  const rank = ZOO_RANKS[species.tier] || ZOO_RANKS.Common;
  const fullAnimal = {
    ...species,
    rank: species.tier,
    rankName: rank.name,
    rankLetter: rank.letter,
    rankEmoji: rank.emoji,
    price: rank.price,
    points: rank.points,
    xp: rank.xp,
    essence: rank.essence,
  };
  const rawKey = species.key.toLowerCase();
  const cleanKey = rawKey.replace(/[^a-z0-9]/g, "");
  ANIMAL_LOOKUP.set(rawKey, fullAnimal);
  ANIMAL_LOOKUP.set(cleanKey, fullAnimal);

  const rawName = species.name.toLowerCase();
  const cleanName = rawName.replace(/[^a-z0-9]/g, "");
  ANIMAL_LOOKUP.set(rawName, fullAnimal);
  ANIMAL_LOOKUP.set(cleanName, fullAnimal);

  for (const alias of species.aliases || []) {
    const rawAlias = alias.toLowerCase();
    const cleanAlias = rawAlias.replace(/[^a-z0-9]/g, "");
    ANIMAL_LOOKUP.set(rawAlias, fullAnimal);
    ANIMAL_LOOKUP.set(cleanAlias, fullAnimal);
  }
}

/**
 * Order threshold for high-tier pets (Legendary, Mythic, Ancient, Divine, Secret).
 */
const HIGH_TIER_MIN_ORDER = ZOO_RANKS.Legendary.order;

/**
 * Rolls an animal on every hunt according to OwO-calibrated tier rates and gem luck multipliers.
 * Enforces OwO hunt balance rules:
 * - Base tier rates calibrated exactly to OwO:
 *   Common: ~88.94% (Common + Uncommon) | Rare: 10% | Epic: 1% | Legendary: 0.05% | Mythic: 0.01% | Ancient: 0.001% | Divine: 0.00025% | Secret: 0.0001%
 * - In 1 hunt (even with gems), only 1 high-tier pet (Legendary+) is normally expected.
 * - If 1 high-tier pet has already dropped in this hunt session (highTierCount === 1),
 *   subsequent high-tier drop chance is drastically penalized (highTierPenalty = 0.01, 100x lower).
 * - Maximum 2 high-tier pets (Legendary+) can ever drop in a single hunt (highTierCount >= maxHighTier [2] -> weight = 0).
 * - For autohunt (isAutohunt = true), drop rates are strictly set to base OwO rates without gem luck inflation.
 *
 * @param {number|object} [luckMultiplier=1] - Gem luck multiplier or options object
 * @param {number} [specialMultiplier=1] - Special gem multiplier (boosts Divine / Secret)
 * @param {object} [options={}] - Additional options { highTierCount, maxHighTier, highTierPenalty, isAutohunt }
 */
function rollAnimal(luckMultiplier = 1, specialMultiplier = 1, options = {}) {
  let opts = options;
  let luckMult = luckMultiplier;
  let specMult = specialMultiplier;

  if (typeof luckMultiplier === "object" && luckMultiplier !== null) {
    opts = luckMultiplier;
    luckMult = opts.luckMultiplier ?? 1;
    specMult = opts.specialMultiplier ?? 1;
  }

  const {
    highTierCount = 0,
    maxHighTier = 2,
    highTierPenalty = 0.01, // 99% penalty for 2nd high-tier pet in the same hunt
    isAutohunt = false,
    radarStat = 0, // Radar detection rate (OwO huntbot)
  } = opts;

  let safeMult = Math.max(1, Number(luckMult) || 1);
  let safeSpec = Math.max(1, Number(specMult) || 1);

  // In OwO Bot, huntbot / autohunt strictly runs at base rates without gem luck boosts
  if (isAutohunt) {
    safeMult = 1.0;
    safeSpec = 1.0;
  }

  const activeRanks = Object.values(ZOO_RANKS)
    .filter((r) => PET_SPECIES.some((s) => s.tier === r.name));

  let totalWeight = 0;
  const weightedRanks = activeRanks.map((r) => {
    let weight = r.rarity;
    const isHighTier = r.order >= HIGH_TIER_MIN_ORDER;

    if (isAutohunt && radarStat > 0) {
      if (r.name === "Generation") {
        weight += (radarStat * 2.0);
      } else if (isHighTier) {
        weight += (radarStat * 0.5);
      } else if (r.name === "Common") {
        weight = Math.max(0, weight - (radarStat * 2.5));
      }
    }

    if (isHighTier) {
      if (highTierCount >= maxHighTier) {
        // Enforce hard cap: maximum 2 high-tier pets per hunt
        weight = 0;
      } else if (highTierCount === 1) {
        // 1 high-tier already rolled: subsequent high-tier chance is extremely low
        weight = weight * safeMult * highTierPenalty;
        if ((r.name === "Divine" || r.name === "Secret") && safeSpec > 1) {
          weight *= safeSpec;
        }
      } else {
        // Normal high-tier roll
        weight = weight * safeMult;
        if ((r.name === "Divine" || r.name === "Secret") && safeSpec > 1) {
          weight *= safeSpec;
        }
      }
    } else if (r.name === "Common") {
      // Subtract bot detection rate from common if autohunt radar is active, exactly like OwO
      const botReduction = (isAutohunt && radarStat > 0) ? radarStat : 0;
      weight = Math.max(0, weight - botReduction);
    } else {
      // Non-high-tier (Rare, Epic, Generation) boosted by luck multiplier
      weight *= safeMult;
    }

    totalWeight += weight;
    return { rank: r, weight };
  });

  if (totalWeight <= 0) {
    return ANIMAL_LOOKUP.get("bee");
  }

  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  let selectedRank = ZOO_RANKS.Common;

  weightedRanks.sort((a, b) => a.weight - b.weight);
  for (const item of weightedRanks) {
    cumulative += item.weight;
    if (roll < cumulative) {
      selectedRank = item.rank;
      break;
    }
  }

  const pool = PET_SPECIES.filter((s) => s.tier === selectedRank.name);
  if (!pool || pool.length === 0) {
    return ANIMAL_LOOKUP.get("bee");
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return ANIMAL_LOOKUP.get(picked.key.toLowerCase());
}

/**
 * Unified helper to add a caught animal to user.zoo AND sync with user.rpg.pets.
 * Returns { isNewSpecies, petObj }
 */
function addAnimalToUserZoo(user, caughtAnimal, count = 1) {
  if (!user || !caughtAnimal) return { isNewSpecies: false, petObj: null };
  const qty = Math.max(1, Math.floor(Number(count) || 1));

  if (!user.zoo || typeof user.zoo !== "object") {
    user.zoo = {};
  }
  const existing = user.zoo[caughtAnimal.key];
  if (!existing) {
    user.zoo[caughtAnimal.key] = { count: qty, totalCount: qty };
  } else if (typeof existing === "number") {
    user.zoo[caughtAnimal.key] = {
      count: existing + qty,
      totalCount: existing + qty,
    };
  } else {
    existing.count = (existing.count || 0) + qty;
    existing.totalCount = (existing.totalCount || 0) + qty;
  }

  user.zooPoints = (user.zooPoints || 0) + (caughtAnimal.points || 1) * qty;
  if (typeof user.markModified === "function") {
    user.markModified("zoo");
  }

  let isNewSpecies = false;
  let petObj = null;
  if (user.rpg) {
    if (!Array.isArray(user.rpg.pets)) {
      user.rpg.pets = [];
    }
    petObj = user.rpg.pets.find((p) => p && p.key === caughtAnimal.key);
    if (!petObj) {
      isNewSpecies = true;
      petObj = {
        id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        key: caughtAnimal.key,
        name: caughtAnimal.name,
        nickname: caughtAnimal.name,
        tier: caughtAnimal.rankName || caughtAnimal.tier || "Common",
        emoji: caughtAnimal.emoji,
        level: 1,
        exp: 0,
        stats: generatePetStats(caughtAnimal),
        createdAt: new Date(),
      };
      user.rpg.pets.push(petObj);
      if (!user.rpg.equippedPet) {
        user.rpg.equippedPet = petObj;
      }
      if (typeof user.markModified === "function") {
        user.markModified("rpg");
      }
    }
  }

  return { isNewSpecies, petObj };
}

/**
 * Find animal by query
 */
function getAnimal(query) {
  if (!query) return null;
  const raw = String(query).toLowerCase().trim();
  const clean = raw.replace(/[^a-z0-9]/g, "");
  return ANIMAL_LOOKUP.get(raw) || ANIMAL_LOOKUP.get(clean) || null;
}

/**
 * Find rank by name or alias
 */
function getRank(query) {
  if (!query) return null;
  const clean = String(query).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const rank of Object.values(ZOO_RANKS)) {
    if (
      rank.id.toLowerCase() === clean ||
      rank.name.toLowerCase() === clean ||
      rank.aliases.includes(clean)
    ) {
      return rank;
    }
  }
  return null;
}

/**
 * Calculates total all-time zoo points
 */
function calculateZooPoints(zoo = {}) {
  let total = 0;
  for (const [key, val] of Object.entries(zoo)) {
    const animal = ANIMAL_LOOKUP.get(key.toLowerCase());
    if (animal) {
      const count = typeof val === "object" ? (val.totalCount ?? val.count ?? 0) : Number(val) || 0;
      total += count * animal.points;
    }
  }
  return total;
}

/**
 * Formats footer rank breakdown text:
 * S-X, D-X, A-X, M-X, L-X, G-X, E-X, R-X, C-X
 */
function formatZooScoreText(zoo = {}) {
  const counts = {
    S: 0,
    D: 0,
    A: 0,
    M: 0,
    L: 0,
    B: 0,
    G: 0,
    E: 0,
    R: 0,
    C: 0,
  };

  for (const [key, val] of Object.entries(zoo)) {
    const animal = ANIMAL_LOOKUP.get(key.toLowerCase());
    if (animal) {
      const count = typeof val === "object" ? (val.totalCount ?? val.count ?? 0) : Number(val) || 0;
      const letter = animal.rankLetter;
      if (counts[letter] !== undefined) {
        counts[letter] += count;
      }
    }
  }

  let text = `S-${counts.S}, D-${counts.D}, A-${counts.A}, M-${counts.M}, L-${counts.L}`;
  if (counts.B > 0) text += `, B-${counts.B}`;
  text += `, G-${counts.G}, E-${counts.E}, R-${counts.R}, C-${counts.C}`;
  return text;
}

module.exports = {
  ZOO_RANKS,
  PET_SPECIES,
  getPetBattleStats,
  rollAnimal,
  addAnimalToUserZoo,
  getAnimal,
  getRank,
  calculateZooPoints,
  formatZooScoreText,
  toSmallNum,
  compareAnimals,
};
