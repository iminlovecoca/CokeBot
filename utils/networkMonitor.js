const dns = require("dns");
const { Events } = require("discord.js");
const { request } = require("undici");

function checkInternet(timeout = 4000) {
  return new Promise((resolve) => {
    const probes = [];
    let resolved = false;
    const done = (status) => {
      if (resolved) return;
      resolved = true;
      resolve(status);
    };

    // Probe 1: DNS lookup discord.com
    probes.push(
      new Promise((res) =>
        dns.lookup("discord.com", (err) => res(!err)),
      ),
    );
    // Probe 2: DNS lookup google.com
    probes.push(
      new Promise((res) =>
        dns.lookup("google.com", (err) => res(!err)),
      ),
    );
    // Probe 3: HTTP request đến Discord endpoint thật
    probes.push(
      request("https://discord.com/api/v10/gateway", {
        headersTimeout: timeout,
        connectTimeout: 3000,
        method: "GET",
      })
        .then(async (res) => {
          try {
            await res.body.dump();
          } catch {}
          return true;
        })
        .catch(() => false),
    );

    // Mạng online nếu BẤT KỲ probe nào thành công.
    Promise.all(probes)
      .then((results) => done(results.includes(true)))
      .catch(() => done(false));

    // An toàn: force resolve sau timeout tổng.
    setTimeout(() => done(false), timeout * 2);
  });
}

function startNetworkMonitor(client) {
  let consecutiveFailures = 0;
  let firstFailureTime = 0;
  let shardDisconnectTimes = {};
  const CHECK_INTERVAL = 20_000;
  const SHARD_STUCK_TIMEOUT = 180_000; // 3 phút

  console.log("🔍 Network Monitor khởi động (giám sát kết nối mạng thông minh).");

  setInterval(async () => {
    const isOnline = await checkInternet();

    if (isOnline) {
      if (consecutiveFailures > 0) {
        console.log(`✅ Mạng VPS đã phục hồi sau ${consecutiveFailures} lần kiểm tra. Reset bộ đếm lỗi.`);
        consecutiveFailures = 0;
        firstFailureTime = 0;

        // Nếu mạng có lại mà WebSocket chưa online, kích hoạt reconnect các shard
        if (client.ws.status !== 0 && client.ws.status !== 1 && client.ws.status !== 2) {
          console.warn("⚠️ Mạng đã online nhưng Gateway chưa sẵn sàng. Đang kích hoạt reconnect...");
          try {
            if (client.ws.shards && client.ws.shards.size > 0) {
              for (const shard of client.ws.shards.values()) {
                if (shard.status !== 0 && shard.status !== 1 && shard.status !== 2) {
                  shard.connect().catch((e) => console.warn(`[Shard ${shard.id}] Lỗi reconnect:`, e?.message));
                }
              }
            }
          } catch (reconnectErr) {
            console.warn("Lỗi khi kiểm tra shard reconnect:", reconnectErr?.message);
          }
        }
      }
    } else {
      if (consecutiveFailures === 0) {
        firstFailureTime = Date.now();
      }
      consecutiveFailures++;
      const elapsed = Date.now() - firstFailureTime;
      // QUAN TRỌNG: TUYỆT ĐỐI KHÔNG exit process khi mạng đang mất!
      // Giữ process sống để khi VPS có mạng lại, bot tự động kết nối lại tức thì mà không bị PM2 crash loop.
      if (consecutiveFailures % 3 === 0 || consecutiveFailures === 1) {
        console.warn(`⚠️ Mất kết nối mạng lần ${consecutiveFailures} (~${Math.round(elapsed / 1000)}s). Đang giữ process sống và chờ mạng hồi phục...`);
      }
    }
  }, CHECK_INTERVAL);

  client.on(Events.ShardDisconnect, (event, shardId) => {
    console.warn(`⚠️ Shard ${shardId} mất kết nối gateway (code: ${event?.code}). Discord.js đang tự động resume/reconnect.`);
    shardDisconnectTimes[shardId] = Date.now();
  });

  client.on(Events.ShardResume, (shardId, replayedEvents) => {
    console.log(`⚡ Shard ${shardId} đã resume thành công (${replayedEvents} events).`);
    delete shardDisconnectTimes[shardId];
  });

  client.on(Events.ShardReady, (shardId) => {
    if (shardDisconnectTimes[shardId]) {
      const elapsed = Date.now() - shardDisconnectTimes[shardId];
      console.log(`✅ Shard ${shardId} reconnect thành công sau ${Math.round(elapsed / 1000)}s.`);
      delete shardDisconnectTimes[shardId];
    }
  });

  // Watchdog: Chỉ can thiệp nếu mạng đã online mà shard bị kẹt không tự kết nối lại sau 3 phút
  setInterval(async () => {
    const now = Date.now();
    for (const [shardId, disconnectTime] of Object.entries(shardDisconnectTimes)) {
      if (now - disconnectTime > SHARD_STUCK_TIMEOUT) {
        const isOnline = await checkInternet(3000);
        if (isOnline) {
          console.warn(`⚠️ Mạng bình thường nhưng Shard ${shardId} kẹt mất kết nối > ${SHARD_STUCK_TIMEOUT / 1000}s. Thử kích hoạt lại shard...`);
          try {
            const shard = client.ws.shards.get(Number(shardId));
            if (shard) {
              await shard.connect().catch((e) => console.warn(`Lỗi reconnect shard ${shardId}:`, e?.message));
              shardDisconnectTimes[shardId] = Date.now(); // reset timer
            }
          } catch (e) {
            console.error(`Không thể reconnect shard ${shardId}:`, e);
          }
        }
      }
    }
  }, 30_000);
}

module.exports = { startNetworkMonitor };
