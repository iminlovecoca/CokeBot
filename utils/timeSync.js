const axios = require("axios");

let cachedDrift = 0;

async function syncTimeDrift() {
  try {
    const startTime = Date.now();
    const res = await axios.head("https://discord.com", { timeout: 10000 });
    const endTime = Date.now();
    
    const serverTimeStr = res.headers.date;
    if (!serverTimeStr) return;
    
    const serverTime = new Date(serverTimeStr).getTime();
    
    // Estimate network latency (half of round trip time)
    const latency = (endTime - startTime) / 2;
    const estimatedServerTime = serverTime + latency;
    
    cachedDrift = Date.now() - estimatedServerTime;
    console.log(`[TimeSync] Measured clock drift with Discord: ${Math.round(cachedDrift / 1000)}s (${cachedDrift}ms)`);
  } catch (err) {
    console.warn("[TimeSync] Failed to measure clock drift:", err.message);
  }
}

function getDrift() {
  return cachedDrift;
}

module.exports = {
  syncTimeDrift,
  getDrift
};
