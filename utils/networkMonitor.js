const dns = require("dns");
const { Events } = require("discord.js");

function checkInternet(timeout = 5000) {
  return new Promise((resolve) => {
    let resolved = false;
    const done = (status) => {
      if (resolved) return;
      resolved = true;
      resolve(status);
    };
    
    dns.lookup("discord.com", (err) => { if (!err) done(true); });
    
    dns.lookup("google.com", (err) => { if (!err) done(true); });
    
    setTimeout(() => done(false), timeout);
  });
}

function startNetworkMonitor(client) {
  let consecutiveFailures = 0;
  let firstFailureTime = 0;
  let shardDisconnectTimes = {};
  const CHECK_INTERVAL = 30_000;  
  const MAX_FAILURES = 5;         
  const TRANSIENT_THRESHOLD = 60_000; 
  const SHARD_DISCONNECT_TIMEOUT = 60_000;

  console.log("🔍 Network Monitor khởi động (kiểm tra mạng mỗi 30 giây).");

  const intervalId = setInterval(async () => {
    const isOnline = await checkInternet();

    if (isOnline) {
      if (consecutiveFailures > 0) {
        console.log(`✅ Mạng đã phục hồi. Reset bộ đếm lỗi.`);
        consecutiveFailures = 0;
        firstFailureTime = 0;
      }
    } else {
      if (consecutiveFailures === 0) {
        firstFailureTime = Date.now();
      }
      consecutiveFailures++;
      const elapsed = Date.now() - firstFailureTime;

      if (consecutiveFailures < MAX_FAILURES) {
        console.warn(`⚠️ Mất kết nối mạng lần ${consecutiveFailures}/${MAX_FAILURES} (${Math.round(elapsed / 1000)}s).`);
      } else {
        console.error(`❌ Mất mạng ${consecutiveFailures} lần liên tiếp trong ${Math.round(elapsed / 1000)}s. Restart process...`);
        clearInterval(intervalId);
        process.exit(1);
      }
    }
  }, CHECK_INTERVAL);

  
  client.on(Events.ShardDisconnect, (event, shardId) => {
    console.warn(`⚠️ Shard ${shardId} mất kết nối gateway (code: ${event?.code}). Discord.js sẽ tự reconnect.`);
    shardDisconnectTimes[shardId] = Date.now();
  });

  client.on(Events.ShardReady, (shardId) => {
    if (shardDisconnectTimes[shardId]) {
      const elapsed = Date.now() - shardDisconnectTimes[shardId];
      console.log(`✅ Shard ${shardId} reconnect thành công sau ${Math.round(elapsed / 1000)}s.`);
      delete shardDisconnectTimes[shardId];
    }
  });

  setInterval(() => {
    const now = Date.now();
    for (const [shardId, disconnectTime] of Object.entries(shardDisconnectTimes)) {
      if (now - disconnectTime > SHARD_DISCONNECT_TIMEOUT) {
        console.error(`❌ Shard ${shardId} mất kết nối quá ${SHARD_DISCONNECT_TIMEOUT / 1000}s. Restart process...`);
        clearInterval(intervalId);
        process.exit(1);
      }
    }
  }, 10_000);
}

module.exports = { startNetworkMonitor };
