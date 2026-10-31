/**
 * Monthly Event Utility for CokeBot
 * Reference: OwO Bot Event Drop Mechanics & Triangle Gem Lifecycle
 */

const { DateTime } = require("luxon");
const { TIMEZONE, getDailyDrops, getDailyResetCountdown } = require("./dateUtil");
const { EVENT_CONFIG, EVENT_REWARDS } = require("../data/event");
const { getGemById } = require("../data/gems");
const config = require("../data/config");

/**
 * Checks if the Monthly Event is currently active in Asia/Ho_Chi_Minh.
 * @param {Date|DateTime} [date]
 * @returns {boolean}
 */
function isMonthlyEventActive(date) {
  if (EVENT_CONFIG.forceActive !== null && EVENT_CONFIG.forceActive !== undefined) {
    return Boolean(EVENT_CONFIG.forceActive);
  }
  if (!EVENT_CONFIG.enabled) {
    return false;
  }

  let dt = date ? (date instanceof DateTime ? date : DateTime.fromJSDate(date).setZone(TIMEZONE)) : DateTime.now().setZone(TIMEZONE);

  if (EVENT_CONFIG.customRange) {
    const start = DateTime.fromISO(EVENT_CONFIG.customRange.start, { zone: TIMEZONE });
    const end = DateTime.fromISO(EVENT_CONFIG.customRange.end, { zone: TIMEZONE });
    return dt >= start && dt <= end;
  }

  // Monthly recurring window: Day 1 to Day 14 (inclusive)
  return dt.day >= EVENT_CONFIG.startDay && dt.day <= EVENT_CONFIG.endDay;
}

/**
 * Gets detailed status, countdown, and dates for the Monthly Event.
 * @param {Date|DateTime} [date]
 * @returns {object}
 */
function getEventStatus(date) {
  const dt = date ? (date instanceof DateTime ? date : DateTime.fromJSDate(date).setZone(TIMEZONE)) : DateTime.now().setZone(TIMEZONE);
  const active = isMonthlyEventActive(dt);

  let currentStart, currentEnd;
  if (EVENT_CONFIG.customRange) {
    currentStart = DateTime.fromISO(EVENT_CONFIG.customRange.start, { zone: TIMEZONE });
    currentEnd = DateTime.fromISO(EVENT_CONFIG.customRange.end, { zone: TIMEZONE });
  } else {
    currentStart = dt.set({ day: EVENT_CONFIG.startDay, hour: 0, minute: 0, second: 0, millisecond: 0 });
    currentEnd = dt.set({ day: EVENT_CONFIG.endDay, hour: 23, minute: 59, second: 59, millisecond: 999 });
  }

  let daysRemaining = 0;
  if (active) {
    const diff = currentEnd.diff(dt, ["days", "hours"]).toObject();
    daysRemaining = Math.max(0, Math.ceil(diff.days || 0));
  }

  let nextStart = null;
  if (!active) {
    if (dt.day > EVENT_CONFIG.endDay) {
      // Event ended this month, next event is 1st of next month
      nextStart = dt.plus({ months: 1 }).set({ day: EVENT_CONFIG.startDay, hour: 0, minute: 0, second: 0, millisecond: 0 });
    } else {
      // Before day 1 of this month (rare)
      nextStart = dt.set({ day: EVENT_CONFIG.startDay, hour: 0, minute: 0, second: 0, millisecond: 0 });
    }
  }

  return {
    isActive: active,
    name: EVENT_CONFIG.name,
    emoji: EVENT_CONFIG.emoji,
    dayOfEvent: active ? dt.day : null,
    totalDays: EVENT_CONFIG.endDay - EVENT_CONFIG.startDay + 1,
    daysRemaining,
    startDateStr: currentStart.toFormat("dd/MM/yyyy"),
    endDateStr: currentEnd.toFormat("dd/MM/yyyy"),
    nextStartDateStr: nextStart ? nextStart.toFormat("dd/MM/yyyy") : null,
    dailyCap: EVENT_CONFIG.dailyCap,
    dropChancePct: Math.round(EVENT_CONFIG.dropChance * 100),
  };
}

/**
 * Safely adds an item quantity to user.inventory (handles Map and Object).
 * @param {object} user
 * @param {string} key
 * @param {number} count
 */
function addInventoryItem(user, key, count = 1) {
  if (!user.inventory) {
    user.inventory = new Map();
  }
  if (user.inventory instanceof Map) {
    const cur = Number(user.inventory.get(key)) || 0;
    user.inventory.set(key, cur + count);
  } else {
    const cur = Number(user.inventory[key]) || 0;
    user.inventory[key] = cur + count;
  }
}

/**
 * Rolls an event drop for user when executing `hunt` or `battle`.
 * Follows exact OwO mechanics:
 * - Checks if event is active
 * - Checks daily cap (0/10)
 * - Rolls 22% drop chance
 * - Rolls reward from weighted pool
 * - Updates user inventory / coke / dailyDrops
 * - Returns formatted notification objects
 *
 * @param {object} user
 * @returns {object|null}
 */
function rollEventDrop(user) {
  if (!isMonthlyEventActive()) return null;

  const dailyDrops = getDailyDrops(user);
  const currentCount = Number(dailyDrops.eventDropCount) || 0;
  if (currentCount >= EVENT_CONFIG.dailyCap) {
    return null;
  }

  // Roll drop chance (22%)
  if (Math.random() > EVENT_CONFIG.dropChance) {
    return null;
  }

  // Roll reward category from EVENT_REWARDS
  const totalWeight = EVENT_REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  let selectedReward = EVENT_REWARDS[0];

  for (const reward of EVENT_REWARDS) {
    if (roll < reward.weight) {
      selectedReward = reward;
      break;
    }
    roll -= reward.weight;
  }

  // Increment event drop counter
  dailyDrops.eventDropCount = currentCount + 1;
  const newCount = dailyDrops.eventDropCount;

  let dropDetails = {};

  switch (selectedReward.type) {
    case "coke": {
      const amount = Math.floor(Math.random() * (selectedReward.maxCoke - selectedReward.minCoke + 1)) + selectedReward.minCoke;
      user.coke = (user.coke || 0) + amount;
      const moneyEmoji = config.emoji?.money || "<:cokecy:1509951335016173662>";
      dropDetails = {
        type: "coke",
        amount,
        displayName: `${amount.toLocaleString()} coke`,
        quantityText: `**${amount.toLocaleString()}**`,
        emoji: moneyEmoji,
      };
      break;
    }

    case "cookie": {
      user.cookie = (user.cookie || 0) + 1;
      addInventoryItem(user, "danisa", 1);
      dropDetails = {
        type: "cookie",
        amount: 1,
        displayName: "Bánh Danisa",
        quantityText: "một cái",
        emoji: selectedReward.emoji,
      };
      break;
    }

    case "gem": {
      // Roll a Triangle Special Gem from gemWeights
      const totalGemWeight = selectedReward.gemWeights.reduce((s, g) => s + g.weight, 0);
      let gRoll = Math.random() * totalGemWeight;
      let selectedGemId = selectedReward.gemWeights[0].id;
      for (const gw of selectedReward.gemWeights) {
        if (gRoll < gw.weight) {
          selectedGemId = gw.id;
          break;
        }
        gRoll -= gw.weight;
      }

      const gem = getGemById(selectedGemId);
      const paddedId = String(gem.id).padStart(3, "0");
      addInventoryItem(user, paddedId, 1);

      dropDetails = {
        type: "gem",
        gemId: gem.id,
        gemTier: gem.tier,
        displayName: `${gem.nameVi} (\`#${gem.id}\`)`,
        quantityText: "viên",
        emoji: gem.emoji,
      };
      break;
    }

    case "lootbox": {
      const isDouble = Math.random() < (selectedReward.doubleChance || 0.3);
      const count = isDouble ? 2 : 1;
      addInventoryItem(user, "lootbox", count);
      dropDetails = {
        type: "lootbox",
        amount: count,
        displayName: count > 1 ? `${count} Hộp Quà (Lootbox)` : "Hộp Quà (Lootbox)",
        quantityText: count > 1 ? `**${count}**` : "một",
        emoji: selectedReward.emoji,
      };
      break;
    }

    case "wc": {
      const isDouble = Math.random() < (selectedReward.doubleChance || 0.3);
      const count = isDouble ? 2 : 1;
      addInventoryItem(user, "wc", count);
      dropDetails = {
        type: "wc",
        amount: count,
        displayName: count > 1 ? `${count} Hộp Vũ Khí (Weapon Crate)` : "Hộp Vũ Khí (Weapon Crate)",
        quantityText: count > 1 ? `**${count}**` : "một",
        emoji: selectedReward.emoji,
      };
      break;
    }

    case "dungeonkey": {
      addInventoryItem(user, "dungeonkey", 1);
      dropDetails = {
        type: "dungeonkey",
        amount: 1,
        displayName: "Chìa khóa Phó bản",
        quantityText: "một",
        emoji: selectedReward.emoji,
      };
      break;
    }

    default:
      break;
  }

  if (typeof user.markModified === "function") {
    user.markModified("inventory");
    user.markModified("rpg");
  }

  const { hours, minutes, seconds } = getDailyResetCountdown();
  const resetStr = `[${newCount}/${EVENT_CONFIG.dailyCap}] RESETS IN: ${hours}H ${minutes}M ${seconds}S`;

  const huntNotificationText = `${EVENT_CONFIG.emoji} **|** ${dropDetails.emoji} Bạn tìm thấy ${dropDetails.quantityText} **${dropDetails.displayName}**! \`${resetStr}\``;
  const battleNotificationText = (characterName) =>
    `**${EVENT_CONFIG.emoji} | ${characterName}**, Bạn tìm thấy ${dropDetails.quantityText} **${dropDetails.displayName}**! \`${resetStr}\``;

  return {
    ...dropDetails,
    newCount,
    dailyCap: EVENT_CONFIG.dailyCap,
    resetStr,
    huntNotificationText,
    battleNotificationText,
  };
}

module.exports = {
  isMonthlyEventActive,
  getEventStatus,
  addInventoryItem,
  rollEventDrop,
};
