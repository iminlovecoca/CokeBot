const axios = require("axios");

async function checkDrift() {
  try {
    const startTime = Date.now();
    const res = await axios.head("https://discord.com", { timeout: 5000 });
    const endTime = Date.now();
    
    // Server time from HTTP headers
    const serverTimeStr = res.headers.date;
    const serverTime = new Date(serverTimeStr).getTime();
    
    // Estimate network latency (half of round trip time)
    const latency = (endTime - startTime) / 2;
    const estimatedServerTime = serverTime + latency;
    
    const localNow = Date.now();
    const drift = localNow - estimatedServerTime;
    
    console.log("Local Time:", new Date(localNow).toISOString());
    console.log("Server Time:", new Date(estimatedServerTime).toISOString());
    console.log("Drift (ms):", drift);
    console.log("Drift (seconds):", drift / 1000);
  } catch (error) {
    console.error("Error checking drift:", error.message);
  }
}

checkDrift();
