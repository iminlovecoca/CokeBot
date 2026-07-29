const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.resolve(__dirname, 'cpu-profile.log');

function _log(label, duration) {
  if (process.env.PROFILE_CPU === 'true') {
    const line = `${new Date().toISOString()} ${label} ${duration.toFixed(2)}ms\n`;
    try {
      fs.appendFileSync(LOG_PATH, line);
    } catch (e) {
      // Fail silently – profiling should never crash the bot
    }
  }
}

/**
 * Profiles a synchronous function.
 * @param {string} label Identifier for the profiled block.
 * @param {Function} fn Function to execute.
 * @returns {*} Return value of fn.
 */
function profileSync(label, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  _log(label, end - start);
  return result;
}

/**
 * Profiles an asynchronous function (returns a Promise).
 * @param {string} label Identifier for the profiled block.
 * @param {Function} fn Async function to execute.
 * @returns {Promise<*>} Promise resolving to fn's result.
 */
async function profileAsync(label, fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  _log(label, end - start);
  return result;
}

module.exports = { profileSync, profileAsync };
