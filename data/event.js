/**
 * Monthly Event Configuration & Rewards Pool
 * Reference: OwO Bot Event System
 *
 * Rules:
 * - Runs once every month for 14 days (Day 1 at 00:00:00 to Day 14 at 23:59:59 Asia/Ho_Chi_Minh).
 * - During event, `hunt` and `battle` have a chance (22%) to drop 1 of the event reward types.
 * - Maximum 10 event drops per day per player (0/10), resets at midnight (00:00:00 Asia/Ho_Chi_Minh).
 * - Special Gems (🔺) can only be used and active during event. Outside event, equipped gem goes dormant (hidden) and wakes up automatically next event.
 * - Generation (Special Event) Pets: Each monthly event has exclusive Generation pets (e.g. Month 10/11 has ghostie & vampbat).
 *   Outside the 14-day event window, Generation pets CANNOT be caught or dropped. If a player misses the month's event,
 *   those pets become permanently unobtainable in future months!
 */

const { DateTime } = require("luxon");
const TIMEZONE = "Asia/Ho_Chi_Minh";

// Monthly exclusive Generation pets schedule (Keys matching PET_SPECIES in data/pets.js)
const MONTHLY_EVENT_PETS = {
  10: ["ghostie", "vampbat"], // Tháng 10 - Sự kiện Halloween
  11: ["ghostie", "vampbat"], // Tháng 11 - Sự kiện Halloween / Thu
  12: [], // Tháng 12 - Giáng sinh / Mùa đông (sẽ cập nhật pet mới khi đến tháng)
  1: [],  // Tháng 1 - Tết Nguyên Đán / Năm Mới
  2: [],  // Tháng 2 - Valentine
  3: [],  // Tháng 3 - Mùa Xuân
  4: [],  // Tháng 4 - Cá Tháng Tư / Phục Sinh
  5: [],  // Tháng 5 - Mùa Hè
  6: [],  // Tháng 6 - Lễ Hội Biển
  7: [],  // Tháng 7 - Kỷ Niệm
  8: [],  // Tháng 8 - Trung Thu
  9: [],  // Tháng 9 - Tựu Trường
};

const EVENT_CONFIG = {
  enabled: true,
  name: "Sự Kiện Hàng Tháng",
  emoji: "🎉",
  startDay: 1, // Opens on the 1st of every month
  endDay: 14, // Closes at the end of the 14th of every month (14 days)
  dailyCap: 10, // Max 10 event drops per day
  dropChance: 0.22, // 22% chance per hunt / battle

  // Active Generation Event Pets for current month (override or default to month schedule)
  activeEventPets: ["ghostie", "vampbat"],

  // Custom date range override (e.g. { start: "2026-11-01T00:00:00+07:00", end: "2026-11-14T23:59:59+07:00" })
  customRange: null,

  // Force active override for testing: true = always active, false = always inactive, null = follow schedule
  forceActive: null,
};

// Rewards pool configuration (Weighted distribution)
const EVENT_REWARDS = [
  {
    type: "coke",
    weight: 24,
    name: "Coke",
    minCoke: 1000,
    maxCoke: 5000,
  },
  {
    type: "cookie",
    weight: 20,
    name: "Bánh Danisa",
    emoji: "<:danisa:1404057793920635043>",
    count: 1,
  },
  {
    type: "gem",
    weight: 20,
    name: "Ngọc Đặc Biệt",
    // Distribution among Triangle Special Gems
    gemWeights: [
      { id: "79", weight: 40 }, // Common Special Gem
      { id: "81", weight: 26 }, // Rare Special Gem
      { id: "82", weight: 18 }, // Epic Special Gem
      { id: "84", weight: 10 }, // Legendary Special Gem
      { id: "83", weight: 4.5 }, // Mythic Special Gem
      { id: "92", weight: 1.2 }, // Ancient Special Gem
      { id: "93", weight: 0.3 }, // Divine Special Gem
    ],
  },
  {
    type: "lootbox",
    weight: 15,
    name: "Hộp Quà (Lootbox)",
    emoji: "<:lootbox:1563961108727992470>",
    minCount: 1,
    maxCount: 2,
    doubleChance: 0.3, // 30% chance for 2 lb, 70% for 1 lb
  },
  {
    type: "wc",
    weight: 12,
    name: "Hộp Vũ Khí (Weapon Crate)",
    emoji: "<:crate:1512793698025603282>",
    minCount: 1,
    maxCount: 2,
    doubleChance: 0.3, // 30% chance for 2 wc, 70% for 1 wc
  },
  {
    type: "dungeonkey",
    weight: 6,
    name: "Chìa khóa Phó bản",
    emoji: "<:key:1516398711712911461>",
    count: 1,
  },
  {
    type: "event_pet",
    weight: 3, // 3% jackpot chance to get exclusive Generation Event Pet directly!
    name: "Linh Thú Thế Hệ Sự Kiện",
  },
];

/**
 * Returns the list of active Generation Event Pet keys for the specified or current month.
 * @param {number} [month]
 * @returns {string[]}
 */
function getActiveMonthlyEventPetKeys(month = null) {
  if (EVENT_CONFIG.activeEventPets && Array.isArray(EVENT_CONFIG.activeEventPets) && EVENT_CONFIG.activeEventPets.length > 0) {
    return EVENT_CONFIG.activeEventPets;
  }
  const m = month || DateTime.now().setZone(TIMEZONE).month;
  return MONTHLY_EVENT_PETS[m] || ["ghostie", "vampbat"];
}

module.exports = {
  EVENT_CONFIG,
  EVENT_REWARDS,
  MONTHLY_EVENT_PETS,
  getActiveMonthlyEventPetKeys,
};
