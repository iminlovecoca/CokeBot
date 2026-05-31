const { Manager } = require("erela.js");

let manager = null;

function buildNodesFromEnv() {
  const host = process.env.LAVALINK_HOST || "";
  const port = Number(process.env.LAVALINK_PORT || 2333);
  const password = process.env.LAVALINK_PASSWORD || "";
  const secure = String(process.env.LAVALINK_SECURE || "false") === "true";

  if (!host || !password) return [];

  return [
    {
      id: `${host}:${port}`,
      host,
      port,
      password,
      secure,
    },
  ];
}

function init(client) {
  if (manager) return manager;

  const nodes = buildNodesFromEnv();
  if (!nodes.length) {
    console.log(
      "ℹ️ Lavalink not configured (LAVALINK_HOST/LAVALINK_PASSWORD missing). Skipping Lavalink init.",
    );
    return null;
  }

  manager = new Manager({
    nodes,
    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    },
  });

  manager.on("nodeConnect", (node) =>
    console.log(`✅ Lavalink node connected: ${node.options.id}`),
  );
  manager.on("nodeError", (node, error) =>
    console.warn(`⚠️ Lavalink node error (${node.options.id}):`, error),
  );

  // Attach manager to client for later use
  client.lavalink = manager;

  // Initialize with existing shards
  manager.init(
    client.user?.id
      ? client.user.id
      : client.application?.id || client.shard?.ids?.[0] || null,
  );

  return manager;
}

async function search(query, requester) {
  if (!manager) throw new Error("Lavalink manager not initialized");
  const res = await manager.search(query, requester);
  return res;
}

module.exports = { init, search, getManager: () => manager };
