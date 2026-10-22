/**
 * CokeBot Zoo & Animal System (OwO Style)
 * Uses CokeBot's RPG tiers: Common, Rare, Epic, Legendary, Mythic, Ancient, Divine
 * and species defined in data/pets.js.
 */

const { PET_TIERS, PET_SPECIES } = require("./pets");

const SUPERSCRIPT_NUMBERS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

const toSmallNum = (count, digits = 3) => {
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

// Rank metadata with OwO style hunting probabilities and selling prices
const ZOO_RANKS = {
  Divine: {
    id: "Divine",
    name: "Divine",
    letter: "D",
    order: 7,
    rarity: 0.05, // 0.05%
    price: 3000000,
    points: 12000,
    xp: 50000,
    emoji: PET_TIERS.Divine?.emoji || "<a:divine:1530878610515165365>",
    aliases: ["divine", "d", "than"],
  },
  Ancient: {
    id: "Ancient",
    name: "Ancient",
    letter: "A",
    order: 6,
    rarity: 0.15, // 0.15%
    price: 500000,
    points: 5000,
    xp: 15000,
    emoji: PET_TIERS.Ancient?.emoji || "<a:ancient:1530878606656540814>",
    aliases: ["ancient", "a", "codai"],
  },
  Mythic: {
    id: "Mythic",
    name: "Mythic",
    letter: "M",
    order: 5,
    rarity: 0.6, // 0.6%
    price: 80000,
    points: 2000,
    xp: 5000,
    emoji: PET_TIERS.Mythic?.emoji || "<a:mythic:1530878614843686912>",
    aliases: ["mythic", "m", "thantoai"],
  },
  Legendary: {
    id: "Legendary",
    name: "Legendary",
    letter: "L",
    order: 4,
    rarity: 2.2, // 2.2%
    price: 15000,
    points: 500,
    xp: 1500,
    emoji: PET_TIERS.Legendary?.emoji || "<:legendary:1530878570858287205>",
    aliases: ["legendary", "l", "huyenthoai"],
  },
  Epic: {
    id: "Epic",
    name: "Epic",
    letter: "E",
    order: 3,
    rarity: 9.0, // 9%
    price: 1500,
    points: 150,
    xp: 400,
    emoji: PET_TIERS.Epic?.emoji || "<:epic:1530878567955566642>",
    aliases: ["epic", "e", "suthi"],
  },
  Rare: {
    id: "Rare",
    name: "Rare",
    letter: "R",
    order: 2,
    rarity: 28.0, // 28%
    price: 250,
    points: 30,
    xp: 50,
    emoji: PET_TIERS.Rare?.emoji || "<:rare:1530878574104547378>",
    aliases: ["rare", "r", "hiem"],
  },
  Common: {
    id: "Common",
    name: "Common",
    letter: "C",
    order: 1,
    rarity: 60.0, // 60% (Total = 100%)
    price: 50,
    points: 5,
    xp: 10,
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
  };
  ANIMAL_LOOKUP.set(species.key.toLowerCase(), fullAnimal);
  ANIMAL_LOOKUP.set(species.name.toLowerCase(), fullAnimal);
  for (const alias of species.aliases || []) {
    ANIMAL_LOOKUP.set(alias.toLowerCase(), fullAnimal);
  }
}

/**
 * Rolls an animal on every hunt according to CokeBot's tier rates.
 */
function rollAnimal() {
  const roll = Math.random() * 100;
  let cumulative = 0;

  // Order: Divine -> Ancient -> Mythic -> Legendary -> Epic -> Rare -> Common
  const sortedRanks = Object.values(ZOO_RANKS).sort((a, b) => a.rarity - b.rarity);
  let selectedRank = ZOO_RANKS.Common;

  for (const r of sortedRanks) {
    cumulative += r.rarity;
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
  getAnimal,
  getRank,
  calculateZooPoints,
  formatZooScoreText,
  toSmallNum,
};
