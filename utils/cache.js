const LRU = require('lru-cache');

// ---------- Image & Asset Caches (battle command) ----------
// Heavy canvas/Image objects – limit size and set TTL.
// max: number of entries, ttl: time‑to‑live in ms.
const imageCache = new LRU({ max: 80, ttl: 12 * 60 * 60 * 1000 }); // 12 h
const transparentCharCache = new LRU({ max: 80, ttl: 12 * 60 * 60 * 1000 });
const transparentAssetCache = new LRU({ max: 60, ttl: 12 * 60 * 60 * 1000 });
const emojiCanvasCache = new LRU({ max: 200, ttl: 6 * 60 * 60 * 1000 }); // emojis are cheap, longer TTL

// ---------- Username Cache ----------
// Cache Discord usernames (userId → displayName). Names can change, so TTL is short.
const usernameCache = new LRU({ max: 10_000, ttl: 6 * 60 * 60 * 1000 }); // 6 h

// ---------- Ban & Verification Caches (global client) ----------
// Bans are time‑limited, verification is short‑lived.
const bannedUsersCache = new LRU({ max: 5_000, ttl: 30 * 24 * 60 * 60 * 1000 }); // 30 days
const verificationCache = new LRU({ max: 5_000, ttl: 10 * 60 * 1000 }); // 10 min

// ---------- RPG Dungeon Cache ----------
// Dungeons expire after an hour of inactivity.
const rpgDungeonsCache = new LRU({ max: 500, ttl: 60 * 60 * 1000 }); // 1 h

// ---------- Active Game Caches (gamble, etc.) ----------
// Default TTL for games that should auto‑expire if something goes wrong.
const activeGamesCache = new LRU({ max: 1_000, ttl: 15 * 60 * 1000 }); // 15 min

module.exports = {
  imageCache,
  transparentCharCache,
  transparentAssetCache,
  emojiCanvasCache,
  usernameCache,
  bannedUsersCache,
  verificationCache,
  rpgDungeonsCache,
  activeGamesCache,
};
