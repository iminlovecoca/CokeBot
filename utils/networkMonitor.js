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
        .then((res) => {
          res.body?.cancel?.();
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
  const CHECK_INTERVAL = 30_000;
  const MAX_FAILURES = 3;
  const MIN_DURATION_MS = 90_000;
  const SHARD_DISCONNECT_TIMEOUT = 90_000;

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

      // Chỉ restart khi ĐỦ số lần fail VÀ kéo dài ĐỦ lâu (>90s)
      const shouldRestart =
        consecutiveFailures >= MAX_FAILURES && elapsed >= MIN_DURATION_MS;

      if (shouldRestart) {
        console.error(`❌ Mất mạng ${consecutiveFailures} lần liên tiếp trong ${Math.round(elapsed / 1000)}s. Restart process...`);
        clearInterval(intervalId);
        process.exit(1);
      } else {
        console.warn(`⚠️ Mất kết nối mạng lần ${consecutiveFailures}/${MAX_FAILURES} (${Math.round(elapsed / 1000)}s).`);
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
  }, 15_000);
}

module.exports = { startNetworkMonitor };
