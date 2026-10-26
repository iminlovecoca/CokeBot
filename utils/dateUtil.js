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

module.exports = {
  getDailyResetCountdown,
};
