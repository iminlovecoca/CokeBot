/**
 * CokeBot Gems (Ngọc Săn Thú) System
 * Reference: OwO Bot Gems
 *
 * Gem Types:
 * - hunting (💎): Increases the number of animals caught per hunt (+1 to +9).
 * - empowering (🔮): Doubles (2x) the animals caught per hunt.
 * - lucky (💖): Increases the probability of catching rare/high-tier animals (+1.0x to +9.0x).
 * - special (🔺): Multiplies the chance of finding Divine and Secret animals (+1.5x to +9.0x).
 *
 * Active Tiers:
 * - Common (Static <:>)
 * - Rare (Static <:>)
 * - Epic (Static <:>)
 * - Legendary (Animated <a:>)
 * - Mythic (Animated <a:>)
 * - Ancient (Animated <a:>)
 * - Divine (Animated <a:>)
 */

const GEM_TYPES = {
  hunting: {
    id: "hunting",
    name: "Hunting Gem",
    nameVi: "Ngọc Đi Săn",
    shape: "Diamond",
    emoji: "<:hunting_common:1563960189668036669>",
    slot: "hunting",
    durabilityType: "hunts",
    desc: "Tăng số lượng thú bắt được trong mỗi lần hunt.",
  },
  empowering: {
    id: "empowering",
    name: "Empowering Gem",
    nameVi: "Ngọc Cường Hóa",
    shape: "Octagon",
    emoji: "<:empowering_common:1563960215081197578>",
    slot: "empowering",
    durabilityType: "animals",
    desc: "Nhân đôi (2x) toàn bộ số lượng thú bắt được trong mỗi lần hunt.",
  },
  lucky: {
    id: "lucky",
    name: "Lucky Gem",
    nameVi: "Ngọc May Mắn",
    shape: "Heart",
    emoji: "<:lucky_common:1563960233116827718>",
    slot: "lucky",
    durabilityType: "animals",
    desc: "Tăng mạnh tỉ lệ xuất hiện của các loài thú quý hiếm.",
  },
  special: {
    id: "special",
    name: "Special Gem",
    nameVi: "Ngọc Đặc Biệt",
    shape: "Triangle",
    emoji: "<:special_common:1563960250242039839>",
    slot: "special",
    durabilityType: "animals",
    desc: "Tăng mạnh tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation / Special Pets) khi đi săn trong thời gian diễn ra sự kiện.",
  },
};

const GEMS_DATA = [
  // ==========================================
  // 1. HUNTING GEMS (💎)
  // ==========================================
  {
    id: "51",
    name: "Common Hunting Gem",
    nameVi: "Ngọc Săn Thường",
    type: "hunting",
    tier: "Common",
    rankLetter: "C",
    emoji: "<:hunting_common:1563960189668036669>",
    bonusAnimals: 1,
    durability: 25,
    description: "Tăng +1 thú bắt được mỗi lần hunt. Độ bền: 25 lượt.",
  },
  {
    id: "53",
    name: "Rare Hunting Gem",
    nameVi: "Ngọc Săn Hiếm",
    type: "hunting",
    tier: "Rare",
    rankLetter: "R",
    emoji: "<:hunting_rare:1563960192100601986>",
    bonusAnimals: 3,
    durability: 25,
    description: "Tăng +3 thú bắt được mỗi lần hunt. Độ bền: 25 lượt.",
  },
  {
    id: "54",
    name: "Epic Hunting Gem",
    nameVi: "Ngọc Săn Sử Thi",
    type: "hunting",
    tier: "Epic",
    rankLetter: "E",
    emoji: "<:hunting_epic:1563960194185306224>",
    bonusAnimals: 4,
    durability: 50,
    description: "Tăng +4 thú bắt được mỗi lần hunt. Độ bền: 50 lượt.",
  },
  {
    id: "56",
    name: "Legendary Hunting Gem",
    nameVi: "Ngọc Săn Huyền Thoại",
    type: "hunting",
    tier: "Legendary",
    rankLetter: "L",
    emoji: "<a:hunting_legendary:1563960200803786924>",
    bonusAnimals: 5,
    durability: 75,
    description: "Tăng +5 thú bắt được mỗi lần hunt. Độ bền: 75 lượt.",
  },
  {
    id: "55",
    name: "Mythic Hunting Gem",
    nameVi: "Ngọc Săn Thần Thoại",
    type: "hunting",
    tier: "Mythic",
    rankLetter: "M",
    emoji: "<a:hunting_mythic:1563960197376901151>",
    bonusAnimals: 6,
    durability: 75,
    description: "Tăng +6 thú bắt được mỗi lần hunt. Độ bền: 75 lượt.",
  },
  {
    id: "57",
    name: "Ancient Hunting Gem",
    nameVi: "Ngọc Săn Cổ Đại",
    type: "hunting",
    tier: "Ancient",
    rankLetter: "A",
    emoji: "<a:hunting_ancient:1563960203429548142>",
    bonusAnimals: 7,
    durability: 100,
    description: "Tăng +7 thú bắt được mỗi lần hunt. Độ bền: 100 lượt.",
  },
  {
    id: "59",
    name: "Divine Hunting Gem",
    nameVi: "Ngọc Săn Thần Thánh",
    type: "hunting",
    tier: "Divine",
    rankLetter: "D",
    emoji: "<a:hunting_divine:1563960209746165832>",
    bonusAnimals: 9,
    durability: 100,
    description: "Tăng +9 thú bắt được mỗi lần hunt. Độ bền: 100 lượt.",
  },

  // ==========================================
  // 2. EMPOWERING GEMS (🔮)
  // ==========================================
  {
    id: "65",
    name: "Common Empowering Gem",
    nameVi: "Ngọc Cường Hóa Thường",
    type: "empowering",
    tier: "Common",
    rankLetter: "C",
    emoji: "<:empowering_common:1563960215081197578>",
    multiplier: 2,
    durability: 50,
    description: "Nhân đôi (2x) số lượng thú bắt được. Độ bền: 50 thú nhân đôi.",
  },
  {
    id: "67",
    name: "Rare Empowering Gem",
    nameVi: "Ngọc Cường Hóa Hiếm",
    type: "empowering",
    tier: "Rare",
    rankLetter: "R",
    emoji: "<:empowering_rare:1563960218134515792>",
    multiplier: 2,
    durability: 100,
    description: "Nhân đôi (2x) số lượng thú bắt được. Độ bền: 100 thú nhân đôi.",
  },
  {
    id: "68",
    name: "Epic Empowering Gem",
    nameVi: "Ngọc Cường Hóa Sử Thi",
    type: "empowering",
    tier: "Epic",
    rankLetter: "E",
    emoji: "<:empowering_epic:1563960220378603670>",
    multiplier: 2,
    durability: 250,
    description: "Nhân đôi (2x) số lượng thú bắt được. Độ bền: 250 thú nhân đôi.",
  },
  {
    id: "70",
    name: "Legendary Empowering Gem",
    nameVi: "Ngọc Cường Hóa Huyền Thoại",
    type: "empowering",
    tier: "Legendary",
    rankLetter: "L",
    emoji: "<a:empowering_legendary:1563960227387150558>",
    multiplier: 2,
    durability: 450,
    description: "Nhân đôi (2x) số lượng thú bắt được. Độ bền: 450 thú nhân đôi.",
  },
  {
    id: "69",
    name: "Mythic Empowering Gem",
    nameVi: "Ngọc Cường Hóa Thần Thoại",
    type: "empowering",
    tier: "Mythic",
    rankLetter: "M",
    emoji: "<a:empowering_mythic:1563960223775989770>",
    multiplier: 2,
    durability: 525,
    description: "Nhân đôi (2x) số lượng thú bắt được. Độ bền: 525 thú nhân đôi.",
  },
  {
    id: "71",
    name: "Ancient Empowering Gem",
    nameVi: "Ngọc Cường Hóa Cổ Đại",
    type: "empowering",
    tier: "Ancient",
    rankLetter: "A",
    emoji: "<a:empowering_ancient:1563960230478348398>",
    multiplier: 2,
    durability: 800,
    description: "Nhân đôi (2x) số lượng thú bắt được. Độ bền: 800 thú nhân đôi.",
  },
  {
    id: "87",
    name: "Divine Empowering Gem",
    nameVi: "Ngọc Cường Hóa Thần Thánh",
    type: "empowering",
    tier: "Divine",
    rankLetter: "D",
    emoji: "<a:empowering_divine:1563960274967335042>",
    multiplier: 2,
    durability: 1000,
    description: "Nhân đôi (2x) số lượng thú bắt được. Độ bền: 1000 thú nhân đôi.",
  },

  // ==========================================
  // 3. LUCKY GEMS (💖)
  // ==========================================
  {
    id: "72",
    name: "Common Lucky Gem",
    nameVi: "Ngọc May Mắn Thường",
    type: "lucky",
    tier: "Common",
    rankLetter: "C",
    emoji: "<:lucky_common:1563960233116827718>",
    luckMultiplier: 1.0,
    durability: 50,
    description: "Tăng +1.0x tỉ lệ gặp thú hiếm. Độ bền: 50 thú.",
  },
  {
    id: "74",
    name: "Rare Lucky Gem",
    nameVi: "Ngọc May Mắn Hiếm",
    type: "lucky",
    tier: "Rare",
    rankLetter: "R",
    emoji: "<:lucky_rare:1563960235188559883>",
    luckMultiplier: 2.0,
    durability: 100,
    description: "Tăng +2.0x tỉ lệ gặp thú hiếm. Độ bền: 100 thú.",
  },
  {
    id: "75",
    name: "Epic Lucky Gem",
    nameVi: "Ngọc May Mắn Sử Thi",
    type: "lucky",
    tier: "Epic",
    rankLetter: "E",
    emoji: "<:lucky_epic:1563960237243760782>",
    luckMultiplier: 3.0,
    durability: 250,
    description: "Tăng +3.0x tỉ lệ gặp thú hiếm. Độ bền: 250 thú.",
  },
  {
    id: "77",
    name: "Legendary Lucky Gem",
    nameVi: "Ngọc May Mắn Huyền Thoại",
    type: "lucky",
    tier: "Legendary",
    rankLetter: "L",
    emoji: "<a:lucky_legendary:1563960244604772524>",
    luckMultiplier: 4.0,
    durability: 450,
    description: "Tăng +4.0x tỉ lệ gặp thú hiếm. Độ bền: 450 thú.",
  },
  {
    id: "76",
    name: "Mythic Lucky Gem",
    nameVi: "Ngọc May Mắn Thần Thoại",
    type: "lucky",
    tier: "Mythic",
    rankLetter: "M",
    emoji: "<a:lucky_mythic:1563960240138100867>",
    luckMultiplier: 5.0,
    durability: 525,
    description: "Tăng +5.0x tỉ lệ gặp thú hiếm. Độ bền: 525 thú.",
  },
  {
    id: "78",
    name: "Ancient Lucky Gem",
    nameVi: "Ngọc May Mắn Cổ Đại",
    type: "lucky",
    tier: "Ancient",
    rankLetter: "A",
    emoji: "<a:lucky_ancient:1563960247666610257>",
    luckMultiplier: 7.0,
    durability: 800,
    description: "Tăng +7.0x tỉ lệ gặp thú hiếm. Độ bền: 800 thú.",
  },
  {
    id: "88",
    name: "Divine Lucky Gem",
    nameVi: "Ngọc May Mắn Thần Thánh",
    type: "lucky",
    tier: "Divine",
    rankLetter: "D",
    emoji: "<a:lucky_divine:1563960277697826908>",
    luckMultiplier: 9.0,
    durability: 1000,
    description: "Tăng +9.0x tỉ lệ gặp thú hiếm. Độ bền: 1000 thú.",
  },

  // ==========================================
  // 4. SPECIAL GEMS (🔺 - Event Only)
  // ==========================================
  {
    id: "79",
    name: "Common Special Gem",
    nameVi: "Ngọc Đặc Biệt Thường",
    type: "special",
    tier: "Common",
    rankLetter: "C",
    emoji: "<:special_common:1563960250242039839>",
    specialMultiplier: 1.5,
    durability: 50,
    description: "Tăng x1.5 tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation). Độ bền: 50 thú.",
  },
  {
    id: "81",
    name: "Rare Special Gem",
    nameVi: "Ngọc Đặc Biệt Hiếm",
    type: "special",
    tier: "Rare",
    rankLetter: "R",
    emoji: "<:special_rare:1563960252494254080>",
    specialMultiplier: 2.0,
    durability: 100,
    description: "Tăng x2.0 tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation). Độ bền: 100 thú.",
  },
  {
    id: "82",
    name: "Epic Special Gem",
    nameVi: "Ngọc Đặc Biệt Sử Thi",
    type: "special",
    tier: "Epic",
    rankLetter: "E",
    emoji: "<:special_epic:1563960257280090193>",
    specialMultiplier: 3.0,
    durability: 250,
    description: "Tăng x3.0 tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation). Độ bền: 250 thú.",
  },
  {
    id: "84",
    name: "Legendary Special Gem",
    nameVi: "Ngọc Đặc Biệt Huyền Thoại",
    type: "special",
    tier: "Legendary",
    rankLetter: "L",
    emoji: "<a:special_legendary:1563960264389558393>",
    specialMultiplier: 4.0,
    durability: 450,
    description: "Tăng x4.0 tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation). Độ bền: 450 thú.",
  },
  {
    id: "83",
    name: "Mythic Special Gem",
    nameVi: "Ngọc Đặc Biệt Thần Thoại",
    type: "special",
    tier: "Mythic",
    rankLetter: "M",
    emoji: "<a:special_mythic:1563960261067542528>",
    specialMultiplier: 5.0,
    durability: 525,
    description: "Tăng x5.0 tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation). Độ bền: 525 thú.",
  },
  {
    id: "92",
    name: "Ancient Special Gem",
    nameVi: "Ngọc Đặc Biệt Cổ Đại",
    type: "special",
    tier: "Ancient",
    rankLetter: "A",
    emoji: "<a:special_ancient:1563960291631300628>",
    specialMultiplier: 7.0,
    durability: 800,
    description: "Tăng x7.0 tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation). Độ bền: 800 thú.",
  },
  {
    id: "93",
    name: "Divine Special Gem",
    nameVi: "Ngọc Đặc Biệt Thần Thánh",
    type: "special",
    tier: "Divine",
    rankLetter: "D",
    emoji: "<a:special_divine:1563960294391283762>",
    specialMultiplier: 9.0,
    durability: 1000,
    description: "Tăng x9.0 tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation). Độ bền: 1000 thú.",
  },
];

// Lookup maps
const GEM_LOOKUP_BY_ID = new Map();
for (const gem of GEMS_DATA) {
  const padded = String(gem.id).padStart(3, "0");
  const raw = String(gem.id).replace(/^0+/, "") || "0";
  GEM_LOOKUP_BY_ID.set(padded.toLowerCase(), gem);
  GEM_LOOKUP_BY_ID.set(raw.toLowerCase(), gem);
  GEM_LOOKUP_BY_ID.set(`gem-${padded}`.toLowerCase(), gem);
  GEM_LOOKUP_BY_ID.set(`gem-${raw}`.toLowerCase(), gem);
  GEM_LOOKUP_BY_ID.set(gem.name.toLowerCase(), gem);
  GEM_LOOKUP_BY_ID.set(gem.nameVi.toLowerCase(), gem);
}

function getGemById(idOrName) {
  if (!idOrName) return null;
  const key = String(idOrName).trim().toLowerCase();
  return GEM_LOOKUP_BY_ID.get(key) || null;
}

function isGemId(idOrName) {
  return Boolean(getGemById(idOrName));
}

function getGemsByType(type) {
  if (!type) return [];
  const t = String(type).trim().toLowerCase();
  return GEMS_DATA.filter((g) => g.type === t);
}

function getGemsByTier(tier) {
  if (!tier) return [];
  const tr = String(tier).trim().toLowerCase();
  return GEMS_DATA.filter((g) => g.tier.toLowerCase() === tr);
}

function getAllGems() {
  return [...GEMS_DATA];
}

module.exports = {
  GEM_TYPES,
  GEMS_DATA,
  getGemById,
  isGemId,
  getGemsByType,
  getGemsByTier,
  getAllGems,
};
