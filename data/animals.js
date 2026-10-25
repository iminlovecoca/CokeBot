/**
 * CokeBot Zoo & Animal System (OwO Style)
 * Uses CokeBot's RPG tiers: Common, Rare, Epic, Legendary, Mythic, Ancient, Divine
 * and species defined in data/pets.js.
 */

const { PET_TIERS, PET_SPECIES, generatePetStats } = require("./pets");

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

// Rank metadata calibrated to OwO style hunting probabilities and selling prices
const ZOO_RANKS = {
  Divine: {
    id: "Divine",
    name: "Divine",
    letter: "D",
    order: 7,
    rarity: 0.05, // 0.05%
    price: 1000000,
    points: 10000,
    xp: 25000,
    essence: 35000,
    emoji: PET_TIERS.Divine?.emoji || "<a:divine:1530878610515165365>",
    aliases: ["divine", "d", "than"],
  },
  Ancient: {
    id: "Ancient",
    name: "Ancient",
    letter: "A",
    order: 6,
    rarity: 0.15, // 0.15%
    price: 180000,
    points: 2500,
    xp: 6000,
    essence: 7500,
    emoji: PET_TIERS.Ancient?.emoji || "<a:ancient:1530878606656540814>",
    aliases: ["ancient", "a", "codai"],
  },
  Mythic: {
    id: "Mythic",
    name: "Mythic",
    letter: "M",
    order: 5,
    rarity: 0.6, // 0.6%
    price: 35000,
    points: 500,
    xp: 1800,
    essence: 1500,
    emoji: PET_TIERS.Mythic?.emoji || "<a:mythic:1530878614843686912>",
    aliases: ["mythic", "m", "thanthoai"],
  },
  Legendary: {
    id: "Legendary",
    name: "Legendary",
    letter: "L",
    order: 4,
    rarity: 2.2, // 2.2%
    price: 6000,
    points: 100,
    xp: 500,
    essence: 350,
    emoji: PET_TIERS.Legendary?.emoji || "<:legendary:1530878570858287205>",
    aliases: ["legendary", "l", "huyenthoai"],
  },
  Epic: {
    id: "Epic",
    name: "Epic",
    letter: "E",
    order: 3,
    rarity: 8.0, // 8.0%
    price: 1200,
    points: 25,
    xp: 150,
    essence: 80,
    emoji: PET_TIERS.Epic?.emoji || "<:epic:1530878567955566642>",
    aliases: ["epic", "e", "suthi"],
  },
  Rare: {
    id: "Rare",
    name: "Rare",
    letter: "R",
    order: 2,
    rarity: 25.0, // 25.0%
    price: 300,
    points: 5,
    xp: 45,
    essence: 20,
    emoji: PET_TIERS.Rare?.emoji || "<:rare:1530878574104547378>",
    aliases: ["rare", "r", "hiem"],
  },
  Common: {
    id: "Common",
    name: "Common",
    letter: "C",
    order: 1,
    rarity: 64.0, // 64.0% (Total = 100%)
    price: 80,
    points: 1,
    xp: 15,
    essence: 5,
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
  ANIMAL_LOOKUP.set(species.key.toLowerCase(), fullAnimal);
  ANIMAL_LOOKUP.set(species.name.toLowerCase(), fullAnimal);
  for (const alias of species.aliases || []) {
    ANIMAL_LOOKUP.set(alias.toLowerCase(), fullAnimal);
  }
}

/**
 * Rolls an animal on every hunt according to CokeBot's tier rates.
 * Supports optional luckMultiplier (e.g. from ARC or HuntBot radar) to boost non-Common tiers.
 */
function rollAnimal(luckMultiplier = 1) {
  const safeMult = Math.max(1, Math.min(2.5, Number(luckMultiplier) || 1));
  const roll = Math.random() * 100;
  let cumulative = 0;

  // Order: Divine -> Ancient -> Mythic -> Legendary -> Epic -> Rare -> Common
  const sortedRanks = Object.values(ZOO_RANKS).sort((a, b) => a.rarity - b.rarity);
  let selectedRank = ZOO_RANKS.Common;

  for (const r of sortedRanks) {
    const effectiveRarity = r.name === "Common" ? r.rarity : r.rarity * safeMult;
    cumulative += effectiveRarity;
    if (roll < cumulative) {
      selectedRank = r;
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

  // Sync with RPG pets so any caught animal is immediately usable in RPG
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
  const clean = String(query).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ANIMAL_LOOKUP.get(clean) || null;
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
 * D-X, A-X, M-X, L-X, E-X, R-X, C-X
 */
function formatZooScoreText(zoo = {}) {
  const counts = {
    D: 0,
    A: 0,
    M: 0,
    L: 0,
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

  return `D-${counts.D}, A-${counts.A}, M-${counts.M}, L-${counts.L}, E-${counts.E}, R-${counts.R}, C-${counts.C}`;
}

module.exports = {
  ZOO_RANKS,
  PET_SPECIES,
  rollAnimal,
  addAnimalToUserZoo,
  getAnimal,
  getRank,
  calculateZooPoints,
  formatZooScoreText,
  toSmallNum,
};
