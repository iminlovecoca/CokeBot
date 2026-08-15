const https = require("https");
const { PET_TIERS, PET_SPECIES } = require("../data/pets");
const { RANK_TIERS } = require("../utils/rankFrameUtil");
const fs = require("fs");
const path = require("path");

function checkEmojiUrl(emojiStr) {
  return new Promise((resolve) => {
    if (!emojiStr) return resolve({ emoji: emojiStr, ok: true, note: "Empty" });
    const match = emojiStr.match(/<(a)?:([^:]+):(\d+)>/);
    if (!match) {
      // Standard unicode emoji
      return resolve({ emoji: emojiStr, ok: true, type: "unicode" });
    }
    const isAnimated = Boolean(match[1]);
    const name = match[2];
    const id = match[3];
    const ext = isAnimated ? "gif" : "png";
    const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;

    const req = https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve({ emoji: emojiStr, name, id, ok: true, status: 200, url });
      } else {
        // Try fallback to png if gif failed
        https.get(`https://cdn.discordapp.com/emojis/${id}.png`, (res2) => {
          if (res2.statusCode === 200) {
            resolve({ emoji: emojiStr, name, id, ok: true, status: 200, url: `https://cdn.discordapp.com/emojis/${id}.png` });
          } else {
            resolve({ emoji: emojiStr, name, id, ok: false, status: res.statusCode, url });
          }
        }).on("error", (e) => resolve({ emoji: emojiStr, name, id, ok: false, error: e.message }));
      }
    });
    req.on("error", (e) => resolve({ emoji: emojiStr, name, id, ok: false, error: e.message }));
  });
}

async function validateAllEmojis() {
  console.log("🔍 Checking all Custom Discord Emojis across CokeBot...\n");

  const results = [];

  // 1. Rank Tiers
  console.log("--- 1. RANK TIERS EMOJIS ---");
  for (const [key, tier] of Object.entries(RANK_TIERS)) {
    if (tier.emoji) {
      const res = await checkEmojiUrl(tier.emoji);
      console.log(`Rank [${key}]: ${tier.emoji} -> ${res.ok ? "✅ VALID (200 OK)" : "❌ INVALID (" + res.status + ")"}`);
      results.push({ context: `Rank Tier ${key}`, ...res });
    }
  }

  // 2. Pet Tiers
  console.log("\n--- 2. PET TIERS EMOJIS ---");
  for (const [key, tier] of Object.entries(PET_TIERS)) {
    if (tier.emoji) {
      const res = await checkEmojiUrl(tier.emoji);
      console.log(`Pet Tier [${key}]: ${tier.emoji} -> ${res.ok ? "✅ VALID (200 OK)" : "❌ INVALID (" + res.status + ")"}`);
      results.push({ context: `Pet Tier ${key}`, ...res });
    }
  }

  // 3. Pet Species
  console.log("\n--- 3. PET SPECIES EMOJIS (30 Pets) ---");
  for (const pet of PET_SPECIES) {
    if (pet.emoji) {
      const res = await checkEmojiUrl(pet.emoji);
      console.log(`Pet [${pet.key} - ${pet.name}]: ${pet.emoji} -> ${res.ok ? "✅ VALID (200 OK)" : "❌ INVALID (" + res.status + ")"}`);
      results.push({ context: `Pet ${pet.key}`, ...res });
    }
  }

  // 4. Battle Bot NPCs in seeders/battleBots.js
  console.log("\n--- 4. BATTLE BOT NPCS (19 Bots) ---");
  const battleBotsContent = fs.readFileSync(path.join(__dirname, "../seeders/battleBots.js"), "utf8");
  const regex = /userId:\s*"([^"]+)",\s*name:\s*"([^"]+)",[\s\S]*?petEmoji:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(battleBotsContent)) !== null) {
    const botId = match[1];
    const botName = match[2];
    const petEmoji = match[3];
    const res = await checkEmojiUrl(petEmoji);
    console.log(`Bot [${botId} - ${botName}]: ${petEmoji} -> ${res.ok ? "✅ VALID (200 OK)" : "❌ INVALID (" + res.status + ")"}`);
    results.push({ context: `Bot ${botId}`, ...res });
  }

  const invalid = results.filter((r) => !r.ok);
  console.log(`\n========================================`);
  console.log(`TOTAL EMOJIS CHECKED: ${results.length}`);
  console.log(`VALID: ${results.length - invalid.length}`);
  console.log(`INVALID: ${invalid.length}`);
  if (invalid.length > 0) {
    console.log(`⚠️ Invalid Emojis detected:`, invalid);
  } else {
    console.log(`🎉 100% OF ALL EMOJIS AND IDS ARE VALID AND REACHABLE ON DISCORD CDN!`);
  }
}

validateAllEmojis().catch(console.error);
