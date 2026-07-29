const { LRUCache } = require('lru-cache');

// Cache sizes & TTLs are tuned for typical bot usage.
const userCache = new LRUCache({ max: 500, ttl: 5 * 60 * 1000 }); // 5 min
const channelCache = new LRUCache({ max: 200, ttl: 10 * 60 * 1000 }); // 10 min
const guildCache = new LRUCache({ max: 100, ttl: 10 * 60 * 1000 });
const roleCache = new LRUCache({ max: 200, ttl: 10 * 60 * 1000 });
const emojiCache = new LRUCache({ max: 200, ttl: 10 * 60 * 1000 });
const webhookCache = new LRUCache({ max: 100, ttl: 10 * 60 * 1000 });

/**
 * Generic fetch helper that checks the manager cache first, then a local LRU cache,
 * and finally performs a network request.
 * @param {object} manager Discord.js manager instance (e.g. client.users, client.channels)
 * @param {string} id Snowflake ID to fetch
 * @param {LRUCache} cache LRU cache instance for the resource
 * @returns {Promise<any>} The fetched object or null on failure
 */
async function fetchWithCache(manager, id, cache) {
  if (!id || !manager) return null;
  // Fast path: already in Discord.js manager cache or local LRU cache
  const cached = manager.cache?.get?.(id) || cache.get(id);
  if (cached) return cached;
  try {
    const fetched = await manager.fetch(id);
    if (fetched) cache.set(id, fetched);
    return fetched;
  } catch (_) {
    return null;
  }
}

module.exports = {
  async fetchUser(client, id) {
    return fetchWithCache(client?.users, id, userCache);
  },
  async fetchChannel(client, id) {
    return fetchWithCache(client?.channels, id, channelCache);
  },
  async fetchGuild(client, id) {
    return fetchWithCache(client?.guilds, id, guildCache);
  },
  async fetchRole(guild, id) {
    return fetchWithCache(guild?.roles, id, roleCache);
  },
  async fetchEmoji(client, id) {
    return fetchWithCache(client?.emojis, id, emojiCache);
  },
  async fetchWebhook(client, id) {
    if (!id || !client) return null;
    const cached = webhookCache.get(id);
    if (cached) return cached;
    try {
      const fetched = await client.fetchWebhook(id);
      if (fetched) webhookCache.set(id, fetched);
      return fetched;
    } catch (_) {
      return null;
    }
  },
};
