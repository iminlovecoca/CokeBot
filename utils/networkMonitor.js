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
    
    dns.resolve("discord.com", (err) => { if (!err) done(true); });
    
    dns.resolve("google.com", (err) => { if (!err) done(true); });
    
    setTimeout(() => done(false), timeout);
  });
}

function startNetworkMonitor(client) {
  let consecutiveFailures = 0;
  const CHECK_INTERVAL = 30_000;  
  const MAX_FAILURES = 3;         

  console.log("🔍 Network Monitor khởi động (kiểm tra mạng mỗi 30 giây).");

  const intervalId = setInterval(async () => {
    const isOnline = await checkInternet();

    if (isOnline) {
      if (consecutiveFailures > 0) {
        console.log(`✅ Mạng đã phục hồi. Reset bộ đếm lỗi.`);
        consecutiveFailures = 0;
      }
    } else {
      consecutiveFailures++;
      console.warn(`⚠️ Mất kết nối mạng lần ${consecutiveFailures}/${MAX_FAILURES}.`);

      if (consecutiveFailures >= MAX_FAILURES) {
        console.error("❌ Mất mạng quá lâu. Khởi động lại process để PM2 reconnect...");
        clearInterval(intervalId);
        
        process.exit(1);
      }
    }
  }, CHECK_INTERVAL);

  
  client.on(Events.ShardDisconnect, async (event, shardId) => {
    console.warn(`⚠️ Shard ${shardId} mất kết nối gateway (code: ${event?.code}).`);
    const isOnline = await checkInternet();
    if (!isOnline) {
      console.error("❌ Gateway disconnect + mất mạng. Restart ngay...");
      clearInterval(intervalId);
      process.exit(1);
    }
  });
}

module.exports = { startNetworkMonitor };
