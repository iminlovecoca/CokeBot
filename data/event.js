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
 *   Generation pets are caught directly when hunting (`hunt` / `autohunt`) and have NO catch limits (no daily cap, no high-tier penalty).
 *   Special Gems (🔺) exclusively multiply the catch rate of Generation pets!
 *   Outside the 14-day event window, Generation pets CANNOT be caught. If a player misses the month's event,
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

// Monthly Event Themes, Holidays and FAQ config
const MONTHLY_EVENT_DETAILS = {
  10: {
    monthName: "October",
    monthNameVi: "Tháng 10",
    holidays: "Halloween & Đêm Hội Ma Quái (Halloween Holiday)",
    emojiHeader: "👻",
    emojiSection: "🎃",
  },
  11: {
    monthName: "November",
    monthNameVi: "Tháng 11",
    holidays: "Halloween & Lễ Hội Mùa Thu (Halloween & Autumn Season)",
    emojiHeader: "👻",
    emojiSection: "🎃",
  },
  12: {
    monthName: "December",
    monthNameVi: "Tháng 12",
    holidays: "Giáng Sinh & Lễ Hội Mùa Đông (Christmas & Winter Holiday)",
    emojiHeader: "🎄",
    emojiSection: "❄️",
  },
  1: {
    monthName: "January",
    monthNameVi: "Tháng 1",
    holidays: "Tết Nguyên Đán & Năm Mới (Lunar New Year)",
    emojiHeader: "🧨",
    emojiSection: "🧧",
  },
  2: {
    monthName: "February",
    monthNameVi: "Tháng 2",
    holidays: "Lễ Tình Nhân (Valentine's Day)",
    emojiHeader: "💖",
    emojiSection: "🍫",
  },
  3: {
    monthName: "March",
    monthNameVi: "Tháng 3",
    holidays: "Lễ Hội Hoa Mùa Xuân (Spring Blossom Festival)",
    emojiHeader: "🌸",
    emojiSection: "🌱",
  },
  4: {
    monthName: "April",
    monthNameVi: "Tháng 4",
    holidays: "Lễ Phục Sinh & Cá Tháng Tư (Easter & April Fools)",
    emojiHeader: "🥚",
    emojiSection: "🃏",
  },
  5: {
    monthName: "May",
    monthNameVi: "Tháng 5",
    holidays: "Lễ Hội Đầu Hè (Early Summer Festival)",
    emojiHeader: "☀️",
    emojiSection: "🏖️",
  },
  6: {
    monthName: "June",
    monthNameVi: "Tháng 6",
    holidays: "Lễ Hội Biển Nhiệt Đới (Tropical Sea Festival)",
    emojiHeader: "🌊",
    emojiSection: "🐬",
  },
  7: {
    monthName: "July",
    monthNameVi: "Tháng 7",
    holidays: "Lễ Hội Kỷ Niệm Mùa Hè (Mid-Summer Jubilee)",
    emojiHeader: "🎆",
    emojiSection: "🍉",
  },
  8: {
    monthName: "August",
    monthNameVi: "Tháng 8",
    holidays: "Lễ Hội Trăng Rằm & Trung Thu (Mid-Autumn Festival)",
    emojiHeader: "🌕",
    emojiSection: "🏮",
  },
  9: {
    monthName: "September",
    monthNameVi: "Tháng 9",
    holidays: "Lễ Hội Tựu Trường (Back to School Season)",
    emojiHeader: "🍁",
    emojiSection: "🎒",
  },
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
    weight: 25,
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
    weight: 16,
    name: "Hộp Quà (Lootbox)",
    emoji: "<:lootbox:1563961108727992470>",
    minCount: 1,
    maxCount: 2,
    doubleChance: 0.3, // 30% chance for 2 lb, 70% for 1 lb
  },
  {
    type: "wc",
    weight: 14,
    name: "Hộp Vũ Khí (Weapon Crate)",
    emoji: "<:crate:1512793698025603282>",
    minCount: 1,
    maxCount: 2,
    doubleChance: 0.3, // 30% chance for 2 wc, 70% for 1 wc
  },
  {
    type: "dungeonkey",
    weight: 5,
    name: "Chìa khóa Phó bản",
    emoji: "<:key:1516398711712911461>",
    count: 1,
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

/**
 * Formats the exact OwO Event FAQ Announcement matching the official Discord format.
 * @param {Date|DateTime} [date]
 * @returns {string}
 */
function formatEventFaqAnnouncement(date = null) {
  const dt = date ? (date instanceof DateTime ? date : DateTime.fromJSDate(date).setZone(TIMEZONE)) : DateTime.now().setZone(TIMEZONE);
  const details = MONTHLY_EVENT_DETAILS[dt.month] || {
    monthName: dt.toFormat("LLLL"),
    holidays: `Lễ Hội ${dt.toFormat("LLLL")}`,
    emojiHeader: "👻",
    emojiSection: "🎃",
  };

  const endDt = dt.set({ day: EVENT_CONFIG.endDay, hour: 23, minute: 59, second: 59 });
  const endFormatted = `${endDt.toFormat("HH:mm dd/MM/yy")}`;

  const petKeys = getActiveMonthlyEventPetKeys(dt.month);
  const { getAnimal } = require("./animals");
  const petObjects = petKeys.map((k) => getAnimal(k)).filter(Boolean);

  const petNamesStr = petObjects
    .map((p) => `${p.emoji} \`${p.aliases?.find((a) => a.startsWith("nov_")) || p.key}\` (${p.name})`)
    .join(", ");

  const config = require("./config");
  const genEmoji = config.emoji?.ranks?.generation || "<a:Generation:1563835095541092352>";
  const moneyEmoji = config.emoji?.money || "<:cokecy:1509951335016173662>";
  const lbEmoji = "<:lootbox:1563961108727992470>";
  const crateEmoji = "<:crate:1512793698025603282>";
  const cookieEmoji = "<:danisa:1404057793920635043>";
  const keyEmoji = "<:key:1516398711712911461>";
  const h = details.emojiHeader;
  const s = details.emojiSection;

  return `${h}${h} **${details.monthName} Event FAQ** ${h}${h}

__**What are the holidays being celebrated?**__
${details.holidays}

__**How long is the event?**__
• Event ending at \`${endFormatted}\`

__**How many ${genEmoji} pets are available?**__
• Pet Amount: ${petObjects.length} pets
• Pet Names: ${petNamesStr}
• Catch Rates: 0.005%–0.05%

__**Can I use my 🔺 Special Gems for this event?**__
Yes, you can use your special gems during the event!


${s}${s} **${details.monthName} FAQ** ${s}${s}
__**How to get event items?**__
The various items celebrating ${details.monthName} holidays/events can be obtained via hunt and battle.

__**How many can I get per day?**__
You can find up to 10 per day!

__**What does it do?**__
The event items will not be added to your inventory. It will automatically turn into a reward. The rewards will be added to your inventory.
• Possible rewards: ${moneyEmoji} 1,000–5,000, ${lbEmoji} 1–2, ${crateEmoji} 1–2, 🔺 Special Gem, ${cookieEmoji} 1, small chance for ${keyEmoji} 1`;
}

module.exports = {
  EVENT_CONFIG,
  EVENT_REWARDS,
  MONTHLY_EVENT_PETS,
  MONTHLY_EVENT_DETAILS,
  getActiveMonthlyEventPetKeys,
  formatEventFaqAnnouncement,
};
