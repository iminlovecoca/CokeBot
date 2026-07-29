const LRU = require('lru-cache');

// Cache sizes & TTLs are tuned for typical bot usage.
// Users and channels are fetched most often, so we keep a slightly larger cache for them.
const userCache = new LRU({ max: 500, ttl: 5 * 60 * 1000 }); // 5 min
const channelCache = new LRU({ max: 200, ttl: 10 * 60 * 1000 }); // 10 min
const guildCache = new LRU({ max: 100, ttl: 10 * 60 * 1000 });
const roleCache = new LRU({ max: 200, ttl: 10 * 60 * 1000 });
const emojiCache = new LRU({ max: 200, ttl: 10 * 60 * 1000 });
const webhookCache = new LRU({ max: 100, ttl: 10 * 60 * 1000 });

/**
 * Generic fetch helper that checks the client cache first, then a local LRU cache,
 * and finally performs a network request.
 * @param {Discord.Client} client Discord.js client instance
 * @param {string} id Snowflake ID to fetch
 * @param {Function} fetchFn Function that performs the network fetch (e.g., client.users.fetch)
 * @param {LRU} cache LRU cache instance for the resource
 * @returns {Promise<any>} The fetched object or null on failure
 */
async function fetchWithCache(client, id, fetchFn, cache) {
  if (!id) return null;
  // Fast path: already in client cache (Discord.js keeps recent objects)
  const cached = client?.cache?.get?.(id) || cache.get(id);
  if (cached) return cached;
  try {
    const fetched = await fetchFn.call(client, id);
    if (fetched) cache.set(id, fetched);
    return fetched;
  } catch (_) {
    return null;
  }
}

module.exports = {
  async fetchUser(client, id) {
    return fetchWithCache(client, id, client.users.fetch, userCache);
  },
  async fetchChannel(client, id) {
    return fetchWithCache(client, id, client.channels.fetch, channelCache);
  },
  async fetchGuild(client, id) {
    return fetchWithCache(client, id, client.guilds.fetch, guildCache);
  },
  async fetchRole(guild, id) {
    // guild.roles.cache is a collection similar to client caches
    return fetchWithCache(guild, id, guild.roles.fetch, roleCache);
  },
  async fetchEmoji(client, id) {
    return fetchWithCache(client, id, client.emojis.fetch, emojiCache);
  },
  async fetchWebhook(client, id) {
    return fetchWithCache(client, id, client.fetchWebhook, webhookCache);
  },
};
