/**
 * CokeBot Fixed 3-Digit Items Registry
 * Reference: OwO Bot Inventory System
 *
 * All items in CokeBot have a permanent fixed 3-digit numerical ID.
 * - 001 - 049: Tools, Key items, Lures, Consumables
 * - 050: Lootbox (lb)
 * - 051 - 098: Gems (Hunting, Empowering, Lucky, Special)
 * - 099: Weapon Crate (wc)
 */

const { GEMS_DATA } = require("./gems");

const FIXED_ITEMS = [
  // --- Tools & Consumables ---
  {
    id: "001",
    key: "dungeonkey",
    aliases: ["key", "dungeon_key"],
    name: "Chìa khóa Phó bản",
    emoji: "<:key:1516398711712911461>",
    type: "tool",
    order: 1,
  },
  {
    id: "002",
    key: "abyssalhorn",
    aliases: ["horn", "abyssal_horn"],
    name: "Tù và Vực thẳm",
    emoji: "<:AbyssalHorn:1517221292124930190>",
    type: "tool",
    order: 2,
  },
  {
    id: "003",
    key: "souls",
    aliases: ["soul"],
    name: "Linh Hồn",
    emoji: "<:souls:1518749776538243082>",
    type: "key_item",
    order: 3,
  },
  {
    id: "004",
    key: "hexpiece",
    aliases: ["piece", "hex_piece"],
    name: "Mảnh Vũ Khí Hex",
    emoji: "<:piece:1518749774403338433>",
    type: "key_item",
    order: 4,
  },
  {
    id: "011",
    key: "catch-net",
    aliases: ["net", "catchnet"],
    name: "Lưới bắt thú",
    emoji: "🕸️",
    type: "tool",
    order: 11,
  },
  {
    id: "012",
    key: "rare-candy",
    aliases: ["candy", "rarecandy"],
    name: "Kẹo hiếm",
    emoji: "🍬",
    type: "consumable",
    order: 12,
  },
  {
    id: "021",
    key: "lure-wood",
    aliases: ["wood-lure"],
    name: "Mồi Mộc",
    emoji: "🪵",
    type: "tool",
    order: 21,
  },
  {
    id: "022",
    key: "lure-earth",
    aliases: ["earth-lure"],
    name: "Mồi Thổ",
    emoji: "🪨",
    type: "tool",
    order: 22,
  },
  {
    id: "023",
    key: "lure-water",
    aliases: ["water-lure"],
    name: "Mồi Thủy",
    emoji: "💧",
    type: "tool",
    order: 23,
  },
  {
    id: "024",
    key: "lure-fire",
    aliases: ["fire-lure"],
    name: "Mồi Hỏa",
    emoji: "🔥",
    type: "tool",
    order: 24,
  },
  {
    id: "025",
    key: "lure-metal",
    aliases: ["metal-lure"],
    name: "Mồi Kim",
    emoji: "🪙",
    type: "tool",
    order: 25,
  },

  // --- Containers ---
  {
    id: "050",
    key: "lootbox",
    aliases: ["lb", "box", "hopqua"],
    name: "Hộp Quà (Lootbox)",
    emoji: "<:lootbox:1563961108727992470>",
    type: "container",
    order: 50,
  },
  {
    id: "099",
    key: "wc",
    aliases: ["crate", "weaponcrate", "weapon_box", "box_weapon"],
    name: "Hộp Vũ Khí (Weapon Crate)",
    emoji: "<:crate:1512793698025603282>",
    type: "container",
    order: 99,
  },
];

// Add Gems with 3-digit IDs
for (const gem of GEMS_DATA) {
  const paddedId = String(gem.id).padStart(3, "0");
  const rawId = String(gem.id);
  FIXED_ITEMS.push({
    id: paddedId,
    key: paddedId,
    aliases: [rawId, `gem-${rawId}`, `gem-${paddedId}`, gem.name.toLowerCase(), gem.nameVi.toLowerCase()],
    name: gem.nameVi,
    nameEn: gem.name,
    emoji: gem.emoji,
    type: "gem",
    gemData: gem,
    order: parseInt(paddedId, 10),
  });
}

// Map for quick ID / alias resolution
const ITEM_BY_ID = new Map();
const ITEM_BY_ALIAS = new Map();

for (const item of FIXED_ITEMS) {
  ITEM_BY_ID.set(item.id, item);
  ITEM_BY_ALIAS.set(item.id, item);
  if (item.key) {
    ITEM_BY_ALIAS.set(item.key.toLowerCase(), item);
  }
  if (item.aliases) {
    for (const a of item.aliases) {
      ITEM_BY_ALIAS.set(String(a).toLowerCase(), item);
    }
  }
}

function getItem(idOrAlias) {
  if (!idOrAlias) return null;
  const str = String(idOrAlias).trim().toLowerCase();
  return ITEM_BY_ALIAS.get(str) || null;
}

function normalizeToFixedId(idOrAlias) {
  const item = getItem(idOrAlias);
  return item ? item.id : null;
}

function toSmallNum3Digits(num) {
  const digits = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  const padded = String(num).padStart(3, "0");
  return padded
    .split("")
    .map((d) => digits[d] || d)
    .join("");
}

module.exports = {
  FIXED_ITEMS,
  getItem,
  normalizeToFixedId,
  toSmallNum3Digits,
};
