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
    id: "005",
    key: "danisa",
    aliases: ["cookie", "banh", "banhdanisa", "danisacookie"],
    name: "Bánh Danisa",
    emoji: "<:danisa:1404057793920635043>",
    type: "consumable",
    order: 5,
  },
  {
    id: "011",
    key: "catch-net",
    aliases: ["net", "catchnet", "11"],
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
    id: "013",
    key: "thunder-stone",
    aliases: ["thunder_stone", "thunderstone", "13"],
    name: "Lôi Thạch",
    emoji: "<:thunder_stone:1419643353099927553>",
    type: "stone",
    order: 13,
  },
  {
    id: "014",
    key: "moon-stone",
    aliases: ["moon_stone", "moonstone", "14"],
    name: "Nguyệt Thạch",
    emoji: "<:moon_stone:1419643279070335088>",
    type: "stone",
    order: 14,
  },
  {
    id: "015",
    key: "fire-stone",
    aliases: ["fire_stone", "firestone", "15"],
    name: "Hỏa Thạch",
    emoji: "<:fire_stone:1419643296384553082>",
    type: "stone",
    order: 15,
  },
  {
    id: "016",
    key: "leaf-stone",
    aliases: ["leaf_stone", "leafstone", "16"],
    name: "Diệp Thạch",
    emoji: "<:leaf_stone:1419643372070633525>",
    type: "stone",
    order: 16,
  },
  {
    id: "017",
    key: "water-stone",
    aliases: ["water_stone", "waterstone", "17"],
    name: "Thuỷ Thạch",
    emoji: "<:water_stone:1419643326461775962>",
    type: "stone",
    order: 17,
  },
  {
    id: "018",
    key: "sun-stone",
    aliases: ["sun_stone", "sunstone", "18"],
    name: "Nhật Thạch",
    emoji: "<:sun_stone:1419643257041981481>",
    type: "stone",
    order: 18,
  },
  {
    id: "019",
    key: "dusk-stone",
    aliases: ["dusk_stone", "duskstone", "19"],
    name: "Hoàng Hôn Thạch",
    emoji: "<:dusk_stone:1419643383567224931>",
    type: "stone",
    order: 19,
  },
  {
    id: "020",
    key: "dawn-stone",
    aliases: ["dawn_stone", "dawnstone", "20"],
    name: "Bình Minh Thạch",
    emoji: "<:dawn_stone:1419643394162032641>",
    type: "stone",
    order: 20,
  },
  {
    id: "021",
    key: "lure-wood",
    aliases: ["wood-lure", "lure_wood", "21"],
    name: "Mồi Mộc",
    emoji: "🪵",
    type: "tool",
    order: 21,
  },
  {
    id: "022",
    key: "lure-earth",
    aliases: ["earth-lure", "lure_earth", "22"],
    name: "Mồi Thổ",
    emoji: "🪨",
    type: "tool",
    order: 22,
  },
  {
    id: "023",
    key: "lure-water",
    aliases: ["water-lure", "lure_water", "23"],
    name: "Mồi Thủy",
    emoji: "💧",
    type: "tool",
    order: 23,
  },
  {
    id: "024",
    key: "lure-fire",
    aliases: ["fire-lure", "lure_fire", "24"],
    name: "Mồi Hỏa",
    emoji: "🔥",
    type: "tool",
    order: 24,
  },
  {
    id: "025",
    key: "lure-metal",
    aliases: ["metal-lure", "lure_metal", "25"],
    name: "Mồi Kim",
    emoji: "🪙",
    type: "tool",
    order: 25,
  },
  {
    id: "026",
    key: "shiny-stone",
    aliases: ["shiny_stone", "shinystone", "26"],
    name: "Minh Thạch",
    emoji: "<:shiny_stone:1419643403733565635>",
    type: "stone",
    order: 26,
  },
  {
    id: "027",
    key: "ice-stone",
    aliases: ["ice_stone", "icestone", "27"],
    name: "Băng Thạch",
    emoji: "<:ice_stone:1435842094089507007>",
    type: "stone",
    order: 27,
  },
  {
    id: "028",
    key: "prism-scale",
    aliases: ["prism_scale", "prismscale", "28"],
    name: "Vảy Cầu Vồng",
    emoji: "<:prism_scale:1419643438676312175>",
    type: "stone",
    order: 28,
  },
  {
    id: "029",
    key: "kings-rock",
    aliases: ["kings_rock", "kingsrock", "29"],
    name: "Vương Thạch",
    emoji: "<:kings_rock:1435842099068141648>",
    type: "stone",
    order: 29,
  },
  {
    id: "030",
    key: "metal-coat",
    aliases: ["metal_coat", "metalcoat", "30"],
    name: "Áo Kim Loại",
    emoji: "<:metal_coat:1435842103442673756>",
    type: "stone",
    order: 30,
  },

  // --- Somber Smithing Stones (031 - 039) ---
  {
    id: "031",
    key: "somber-1",
    aliases: ["somber1", "sm1", "sb1"],
    name: "Somber Smithing Stone [1]",
    emoji: "<:Somber1:1516030370099761322>",
    type: "stone",
    order: 31,
  },
  {
    id: "032",
    key: "somber-2",
    aliases: ["somber2", "sm2", "sb2"],
    name: "Somber Smithing Stone [2]",
    emoji: "<:Somber2:1516030372901687347>",
    type: "stone",
    order: 32,
  },
  {
    id: "033",
    key: "somber-3",
    aliases: ["somber3", "sm3", "sb3"],
    name: "Somber Smithing Stone [3]",
    emoji: "<:Somber3:1516030375443566675>",
    type: "stone",
    order: 33,
  },
  {
    id: "034",
    key: "somber-4",
    aliases: ["somber4", "sm4", "sb4"],
    name: "Somber Smithing Stone [4]",
    emoji: "<:Somber4:1516030379369431091>",
    type: "stone",
    order: 34,
  },
  {
    id: "035",
    key: "somber-5",
    aliases: ["somber5", "sm5", "sb5"],
    name: "Somber Smithing Stone [5]",
    emoji: "<:Somber5:1516030385241329746>",
    type: "stone",
    order: 35,
  },
  {
    id: "036",
    key: "somber-6",
    aliases: ["somber6", "sm6", "sb6"],
    name: "Somber Smithing Stone [6]",
    emoji: "<:Somber6:1516030387782942880>",
    type: "stone",
    order: 36,
  },
  {
    id: "037",
    key: "somber-7",
    aliases: ["somber7", "sm7", "sb7"],
    name: "Somber Smithing Stone [7]",
    emoji: "<:Somber7:1516030382762496191>",
    type: "stone",
    order: 37,
  },
  {
    id: "038",
    key: "somber-8",
    aliases: ["somber8", "sm8", "sb8"],
    name: "Somber Smithing Stone [8]",
    emoji: "<:Somber8:1516030389855060018>",
    type: "stone",
    order: 38,
  },
  {
    id: "039",
    key: "somber-9",
    aliases: ["somber9", "sm9", "sb9", "somber-dragon"],
    name: "Somber Ancient Dragon Smithing Stone",
    emoji: "<:Somber9:1516030391960735905>",
    type: "stone",
    order: 39,
  },

  // --- Cristal Smithing Stones (041 - 049) ---
  {
    id: "041",
    key: "cristal-1",
    aliases: ["cristal1", "cr1"],
    name: "Cristal Smithing Stone [1]",
    emoji: "<:Cristal1:1516030438529961985>",
    type: "stone",
    order: 41,
  },
  {
    id: "042",
    key: "cristal-2",
    aliases: ["cristal2", "cr2"],
    name: "Cristal Smithing Stone [2]",
    emoji: "<:Cristal2:1516030440840888390>",
    type: "stone",
    order: 42,
  },
  {
    id: "043",
    key: "cristal-3",
    aliases: ["cristal3", "cr3"],
    name: "Cristal Smithing Stone [3]",
    emoji: "<:Cristal3:1516030443089170512>",
    type: "stone",
    order: 43,
  },
  {
    id: "044",
    key: "cristal-4",
    aliases: ["cristal4", "cr4"],
    name: "Cristal Smithing Stone [4]",
    emoji: "<:Cristal4:1516030446465712178>",
    type: "stone",
    order: 44,
  },
  {
    id: "045",
    key: "cristal-5",
    aliases: ["cristal5", "cr5"],
    name: "Cristal Smithing Stone [5]",
    emoji: "<:Cristal5:1516030455785193595>",
    type: "stone",
    order: 45,
  },
  {
    id: "046",
    key: "cristal-6",
    aliases: ["cristal6", "cr6"],
    name: "Cristal Smithing Stone [6]",
    emoji: "<:Cristal6:1516030458301907014>",
    type: "stone",
    order: 46,
  },
  {
    id: "047",
    key: "cristal-7",
    aliases: ["cristal7", "cr7"],
    name: "Cristal Smithing Stone [7]",
    emoji: "<:Cristal7:1516030460004663408>",
    type: "stone",
    order: 47,
  },
  {
    id: "048",
    key: "cristal-8",
    aliases: ["cristal8", "cr8"],
    name: "Cristal Smithing Stone [8]",
    emoji: "<:Cristal8:1516030462970302555>",
    type: "stone",
    order: 48,
  },
  {
    id: "049",
    key: "cristal-9",
    aliases: ["cristal9", "cr9", "cristal-dragon", "cristal-10", "cristal10", "cr10", "cristal_10", "cristal-11", "cristal-12", "cristal", "cristal-stone", "cristal_stone", "crystal"],
    name: "Cristal Ancient Dragon Smithing Stone",
    emoji: "<:Cristal9:1516030465461715005>",
    type: "stone",
    order: 49,
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
  const raw = String(idOrAlias).trim().toLowerCase();
  
  // 1. Direct match
  if (ITEM_BY_ALIAS.has(raw)) return ITEM_BY_ALIAS.get(raw);

  // 2. Numeric normalization: e.g. "11" -> "011", "1" -> "001", "011" -> "11"
  if (/^\d+$/.test(raw)) {
    const padded = raw.padStart(3, "0");
    if (ITEM_BY_ALIAS.has(padded)) return ITEM_BY_ALIAS.get(padded);
    const unpadded = String(parseInt(raw, 10));
    if (ITEM_BY_ALIAS.has(unpadded)) return ITEM_BY_ALIAS.get(unpadded);
  }

  // 3. Hyphen <-> Underscore normalization (e.g. cristal_1 -> cristal-1)
  const withHyphen = raw.replace(/_/g, "-");
  if (ITEM_BY_ALIAS.has(withHyphen)) return ITEM_BY_ALIAS.get(withHyphen);

  const withUnderscore = raw.replace(/-/g, "_");
  if (ITEM_BY_ALIAS.has(withUnderscore)) return ITEM_BY_ALIAS.get(withUnderscore);

  // 4. Strip hyphens and underscores (e.g. catchnet -> catch-net, cristal1 -> cristal-1)
  const stripped = raw.replace(/[-_\s]/g, "");
  if (ITEM_BY_ALIAS.has(stripped)) return ITEM_BY_ALIAS.get(stripped);

  // 5. Special fallbacks for stones: e.g. cristal-10, cr10 -> cristal-9
  if (/^cristal[-_]?(10|11|12)$/.test(raw) || /^cr(10|11|12)$/.test(raw)) {
    return ITEM_BY_ALIAS.get("cristal-9");
  }
  if (/^somber[-_]?(10|11|12)$/.test(raw) || /^sm(10|11|12)$/.test(raw)) {
    return ITEM_BY_ALIAS.get("somber-9");
  }

  return null;
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
