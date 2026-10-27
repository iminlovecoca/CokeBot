/**
 * Date and Daily Reset Utility for CokeBot
 * Standardized to Asia/Ho_Chi_Minh timezone
 */

const { DateTime } = require("luxon");

const TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Calculate countdown to next midnight (00:00:00 Asia/Ho_Chi_Minh) reset
 * @returns {{ hours: number, minutes: number, seconds: number, formatted: string }}
 */
function getDailyResetCountdown() {
  const now = DateTime.now().setZone(TIMEZONE);
  const nextMidnight = now.plus({ days: 1 }).startOf("day");
  const diff = nextMidnight.diff(now, ["hours", "minutes", "seconds"]).toObject();
  const seconds = Math.floor(diff.seconds || 0);
  const minutes = Math.floor(diff.minutes || 0);
  const hours = Math.floor(diff.hours || 0);
  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours}H ${minutes}M ${seconds}S`,
  };
}

/**
 * Returns today's date string in Asia/Ho_Chi_Minh (YYYY-MM-DD)
 */
function getTodayDateString() {
  return DateTime.now().setZone(TIMEZONE).toFormat("yyyy-MM-dd");
}

/**
 * Ensures user.rpg.dailyDrops is initialized and aligned with today's date (resets at 00:00 Asia/Ho_Chi_Minh)
 * @param {object} user 
 * @returns {object} user.rpg.dailyDrops
 */
function getDailyDrops(user) {
  if (!user.rpg) user.rpg = {};
  const today = getTodayDateString();
  if (!user.rpg.dailyDrops || typeof user.rpg.dailyDrops !== "object" || user.rpg.dailyDrops.date !== today) {
    user.rpg.dailyDrops = {
      date: today,
      huntLbCount: 0,
      battleWcCount: 0,
      dailyClaimed: false,
      cookieSent: false,
      questCompletedCount: 0,
      bossAttacks: 0,
      checklistClaimed: false,
    };
  }
  return user.rpg.dailyDrops;
}

module.exports = {
  TIMEZONE,
  getDailyResetCountdown,
  getTodayDateString,
  getDailyDrops,
};
