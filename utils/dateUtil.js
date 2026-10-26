/**
 * Date and Daily Reset Utility for CokeBot (OwO Bot standard countdown)
 */

/**
 * Calculate countdown to next midnight UTC reset (standard across OwO & CokeBot daily trackers)
 * @returns {{ hours: number, minutes: number, seconds: number, formatted: string }}
 */
function getDailyResetCountdown() {
  const now = new Date();
  const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diffSec = Math.max(0, Math.floor((nextUtcMidnight.getTime() - now.getTime()) / 1000));
  const seconds = diffSec % 60;
  const minutes = Math.floor(diffSec / 60) % 60;
  const hours = Math.floor(diffSec / 3600);
  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours}H ${minutes}M ${seconds}S`,
  };
}

/**
 * Returns today's UTC date string (YYYY-MM-DD)
 */
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ensures user.rpg.dailyDrops is initialized and aligned with today's date (resets at 00:00 UTC)
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
  getDailyResetCountdown,
  getTodayDateString,
  getDailyDrops,
};
