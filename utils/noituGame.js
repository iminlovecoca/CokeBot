const fs = require("fs");
const path = require("path");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const User = require("../models/User");
const NoituGuild = require("../models/NoituGuild");
const config = require("../data/config");

const gwDataPath = path.join(__dirname, "../data/gwdata.json");
const officialWordsPath = path.join(__dirname, "../data/official-words.txt");
const reportWordsPath = path.join(__dirname, "../data/report-words.txt");
const queryPath = path.join(__dirname, "../data/query.txt");
const wordPlayedPath = path.join(__dirname, "../data/word-played.txt");
const roundPlayedPath = path.join(__dirname, "../data/round-played.txt");

if (!fs.existsSync(reportWordsPath)) {
  fs.writeFileSync(reportWordsPath, "");
}
if (!fs.existsSync(queryPath)) {
  fs.writeFileSync(queryPath, "0");
}
if (!fs.existsSync(wordPlayedPath)) {
  fs.writeFileSync(wordPlayedPath, "0");
}
if (!fs.existsSync(roundPlayedPath)) {
  fs.writeFileSync(roundPlayedPath, "0");
}

function readIntegerFile(filePath) {
  try {
    return parseInt(fs.readFileSync(filePath, "utf8"), 10) || 0;
  } catch {
    return 0;
  }
}

// In-memory counters with non-blocking debounced disk persistence
let queryCount = readIntegerFile(queryPath);
let wordPlayedCount = readIntegerFile(wordPlayedPath);
let roundPlayedCount = readIntegerFile(roundPlayedPath);

let querySaveTimer = null;
function addQuery(count = 1) {
  queryCount += count;
  if (!querySaveTimer) {
    querySaveTimer = setTimeout(() => {
      querySaveTimer = null;
      fs.writeFile(queryPath, String(queryCount), () => {});
    }, 2000);
  }
}

let wordSaveTimer = null;
function addWordPlayedCount() {
  wordPlayedCount += 1;
  if (!wordSaveTimer) {
    wordSaveTimer = setTimeout(() => {
      wordSaveTimer = null;
      fs.writeFile(wordPlayedPath, String(wordPlayedCount), () => {});
    }, 2000);
  }
}

let roundSaveTimer = null;
function addRoundPlayedCount() {
  roundPlayedCount += 1;
  if (!roundSaveTimer) {
    roundSaveTimer = setTimeout(() => {
      roundSaveTimer = null;
      fs.writeFile(roundPlayedPath, String(roundPlayedCount), () => {});
    }, 2000);
  }
}

function getQuery() {
  return queryCount;
}

function getWordPlayedCount() {
  return wordPlayedCount;
}

function getRoundPlayedCount() {
  return roundPlayedCount;
}

// Robust Vietnamese word normalizer
// Normalizes Unicode to NFC (resolves iOS/macOS NFD mismatch)
// Strips zero-width chars, markdown, emojis, and leading/trailing punctuation
function normalizeWord(text) {
  if (!text) return "";
  return String(text)
    .normalize("NFC")
    .replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u00AD]/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/^[\.,!?;:'"“”(){\}\[\]\-\\\/]+|[\.,!?;:'"“”(){\}\[\]\-\\\/]+$/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function getLastToken(word) {
  const parts = normalizeWord(word).split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getFirstToken(word) {
  const parts = normalizeWord(word).split(/\s+/).filter(Boolean);
  return parts[0] || "";
}

// High-performance word bank caches:
// - wordBankCache: Array for full compatibility
// - wordSetCache: Set for O(1) existence checks
// - firstTokenMapCache: Map<firstToken, string[]> for O(1) continuation lookups
let wordBankCache = [];
let wordSetCache = new Set();
let firstTokenMapCache = new Map();
let wordBankSourceMtime = 0;

function buildWordBankIndices(words) {
  wordBankCache = words;
  wordSetCache = new Set(words);
  firstTokenMapCache = new Map();

  for (const w of words) {
    const first = getFirstToken(w);
    if (!first) continue;
    let list = firstTokenMapCache.get(first);
    if (!list) {
      list = [];
      firstTokenMapCache.set(first, list);
    }
    list.push(w);
  }
}

function readWordBankSource() {
  if (fs.existsSync(officialWordsPath)) {
    try {
      const stat = fs.statSync(officialWordsPath);
      const words = fs
        .readFileSync(officialWordsPath, "utf8")
        .split(/\r?\n/)
        .map(normalizeWord)
        .filter((word) => word.split(/\s+/).length === 2);
      return {
        path: officialWordsPath,
        mtime: stat.mtimeMs,
        words,
      };
    } catch (err) {
      console.error("[Noitu] Error reading official words:", err);
    }
  }

  if (fs.existsSync(gwDataPath)) {
    try {
      const stat = fs.statSync(gwDataPath);
      const words = JSON.parse(fs.readFileSync(gwDataPath, "utf8"))
        .map(normalizeWord)
        .filter((word) => word.split(/\s+/).length === 2);
      return {
        path: gwDataPath,
        mtime: stat.mtimeMs,
        words,
      };
    } catch (err) {
      console.error("[Noitu] Error reading gwdata:", err);
    }
  }

  return {
    path: null,
    mtime: 0,
    words: [],
  };
}

function getWordBank() {
  const source = readWordBankSource();
  if (source.mtime !== wordBankSourceMtime || wordBankCache.length === 0) {
    buildWordBankIndices(source.words);
    wordBankSourceMtime = source.mtime;
  }
  return wordBankCache;
}

// Ensure initial word bank index is loaded on start
getWordBank();

let reportWords = [];
try {
  if (fs.existsSync(reportWordsPath)) {
    reportWords = fs
      .readFileSync(reportWordsPath, "utf8")
      .split(/\r?\n/)
      .map(normalizeWord)
      .filter(Boolean);
  }
} catch {
  reportWords = [];
}

// O(1) continuation check using token map
function hasContinuation(word, usedWords = []) {
  const normalizedWord = normalizeWord(word);
  const lastToken = getLastToken(normalizedWord);
  if (!lastToken) return false;

  getWordBank(); // ensure indices loaded
  const candidates = firstTokenMapCache.get(lastToken);
  if (!candidates || candidates.length === 0) return false;

  const usedSet = new Set(usedWords.map(normalizeWord));
  return candidates.some((candidate) => candidate !== normalizedWord && !usedSet.has(candidate));
}

// O(1) fast random word picker with continuation guarantee
function getRandomWord(usedWords = []) {
  getWordBank();
  if (wordBankCache.length === 0) return null;

  const usedSet = new Set(usedWords.map(normalizeWord));

  for (let i = 0; i < 100; i++) {
    const candidate = wordBankCache[Math.floor(Math.random() * wordBankCache.length)];
    if (!usedSet.has(candidate) && hasContinuation(candidate, usedWords)) {
      return candidate;
    }
  }

  // Fallback to any unused candidate
  for (const candidate of wordBankCache) {
    if (!usedSet.has(candidate)) {
      return candidate;
    }
  }

  return wordBankCache[0] || null;
}

function getNoituStatsSnapshot(user, guildId) {
  return (
    user?.noituStats?.[guildId] || {
      win: 0,
      true: 0,
      total: 0,
      name: "",
      avatar: "",
    }
  );
}

async function upsertNoituStats(userId, guildId, patch = {}) {
  try {
    const setPayload = {};
    const incPayload = {};

    for (const [key, value] of Object.entries(patch)) {
      if (typeof value === "number") {
        incPayload[`noituStats.${guildId}.${key}`] = value;
      } else {
        setPayload[`noituStats.${guildId}.${key}`] = value;
      }
    }

    setPayload[`noituStats.${guildId}.lastPlayedAt`] = new Date();

    await User.updateOne(
      { userId },
      {
        ...(Object.keys(setPayload).length ? { $set: setPayload } : {}),
        ...(Object.keys(incPayload).length ? { $inc: incPayload } : {}),
      },
      { upsert: true },
    );
  } catch (err) {
    console.error(`[Noitu] Failed to upsert stats for user ${userId}:`, err?.message);
  }
}

// Fast O(1) dictionary and continuation checks
function isValidNextWord(currentWord, nextWord, usedWords = []) {
  getWordBank();
  const normalizedNext = normalizeWord(nextWord);
  if (!normalizedNext || normalizedNext.split(/\s+/).length !== 2) {
    return false;
  }

  if (!wordSetCache.has(normalizedNext)) {
    return false;
  }

  const usedSet = new Set(usedWords.map(normalizeWord));
  if (usedSet.has(normalizedNext)) {
    return false;
  }

  if (!currentWord) {
    return true;
  }

  return getFirstToken(normalizedNext) === getLastToken(currentWord);
}

// Guild configs cache with TTL to avoid permanent null locks
const guildConfigsCache = new Map();
const GUILD_CONFIG_TTL = 60 * 1000;

async function getGuildConfig(guildId) {
  if (!guildId) return null;
  const cached = guildConfigsCache.get(guildId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.config;
  }
  try {
    const config = await NoituGuild.findOne({ guildId }).lean();
    guildConfigsCache.set(guildId, {
      config,
      expiresAt: now + (config ? GUILD_CONFIG_TTL : 5000), // if null, only cache 5s for auto-recovery
    });
    return config;
  } catch (err) {
    console.error(`[Noitu] Failed to fetch guild config for ${guildId}:`, err?.message);
    return cached?.config || null;
  }
}

function checkWordIfInDictionary(word) {
  getWordBank();
  return wordSetCache.has(normalizeWord(word));
}

function checkWordIfInReportDictionary(word) {
  return reportWords.includes(normalizeWord(word));
}

function addWordToDictionary(word) {
  const normalized = normalizeWord(word);
  if (!normalized || checkWordIfInDictionary(normalized)) {
    return false;
  }

  const nextBank = [...getWordBank(), normalized];
  try {
    fs.writeFileSync(officialWordsPath, nextBank.join("\n"));
    fs.writeFileSync(gwDataPath, JSON.stringify(nextBank, null, 2));
    buildWordBankIndices(nextBank);
    wordBankSourceMtime = fs.statSync(officialWordsPath).mtimeMs;
    return true;
  } catch (err) {
    console.error("[Noitu] Error adding word to dictionary:", err);
    return false;
  }
}

function getReportWords() {
  return reportWords;
}

function addWordToReportList(word) {
  const normalized = normalizeWord(word);
  if (!normalized || checkWordIfInReportDictionary(normalized)) {
    return false;
  }

  reportWords.push(normalized);
  try {
    fs.writeFileSync(reportWordsPath, reportWords.join("\n"));
    return true;
  } catch (err) {
    console.error("[Noitu] Error adding word to report list:", err);
    return false;
  }
}

function countWordInDictionary() {
  return Math.max(0, getWordBank().length - reportWords.length);
}

async function setGuildChannel(guildId, channelId) {
  guildConfigsCache.delete(guildId);
  await NoituGuild.updateOne(
    { guildId },
    { $set: { channelId, updatedAt: new Date() } },
    { upsert: true },
  );
}

async function clearGuildChannel(guildId) {
  guildConfigsCache.delete(guildId);
  await NoituGuild.updateOne(
    { guildId },
    { $set: { channelId: null, updatedAt: new Date() } },
    { upsert: true },
  );
}

function getGameState(client, guildId) {
  if (!client.noituGames) {
    client.noituGames = new Map();
  }
  return client.noituGames.get(guildId) || null;
}

async function setGameState(client, guildId, state) {
  if (!client.noituGames) {
    client.noituGames = new Map();
  }

  const resolvedChannelId =
    state.channelId ||
    (await getGuildConfig(guildId))?.channelId ||
    null;
  state.channelId = resolvedChannelId;

  client.noituGames.set(guildId, state);

  const payload = {
    "gameState.running": Boolean(state.running),
    "gameState.channelId": resolvedChannelId,
    "gameState.currentWord": state.currentWord || null,
    "gameState.currentPlayerId": state.currentPlayerId || null,
    "gameState.words": state.words || [],
    "gameState.lastUpdatedAt": state.lastUpdatedAt || Date.now(),
  };

  if (resolvedChannelId) {
    payload.channelId = resolvedChannelId;
  }

  try {
    await NoituGuild.updateOne(
      { guildId },
      { $set: payload },
      { upsert: true }
    );
  } catch (err) {
    console.error(`❌ [Noitu DB] Failed to save state for guild ${guildId}:`, err?.message);
  }
}

async function initNoituGames(client) {
  if (!client.noituGames) {
    client.noituGames = new Map();
  }

  try {
    const activeGuilds = await NoituGuild.find({
      $or: [
        { "gameState.running": true },
        { "gameState.running": "true" },
        { "gameState.running": 1 },
      ],
    }).lean();

    if (activeGuilds.length > 0) {
      console.log(`🔄 Loading ${activeGuilds.length} active noitu game states from database...`);
      for (const guildDoc of activeGuilds) {
        const resolvedChannelId = guildDoc.gameState?.channelId || guildDoc.channelId || null;
        const state = {
          running: true,
          channelId: resolvedChannelId,
          currentWord: guildDoc.gameState?.currentWord || null,
          currentPlayerId: guildDoc.gameState?.currentPlayerId || null,
          words: Array.isArray(guildDoc.gameState?.words) ? guildDoc.gameState.words : [],
          lastUpdatedAt: guildDoc.gameState?.lastUpdatedAt || Date.now(),
        };

        client.noituGames.set(guildDoc.guildId, state);

        if (!guildDoc.gameState?.channelId && resolvedChannelId) {
          NoituGuild.updateOne(
            { guildId: guildDoc.guildId },
            { $set: { "gameState.channelId": resolvedChannelId } }
          ).catch(() => {});
        }
      }
      console.log(`✅ Loaded ${client.noituGames.size} active Noitu game state(s) successfully.`);
    }
    return client.noituGames.size;
  } catch (err) {
    console.error("❌ Error loading active Noitu game states on startup:", err);
    return 0;
  }
}

function clearGameState(client, guildId) {
  if (client.noituGames) {
    client.noituGames.delete(guildId);
  }

  NoituGuild.updateOne(
    { guildId },
    {
      $set: {
        "gameState.running": false,
        "gameState.words": [],
        "gameState.currentWord": null,
        "gameState.currentPlayerId": null,
      },
    }
  ).catch((err) => {
    console.error(`❌ [Noitu DB] Failed to clear state for guild ${guildId}:`, err?.message);
  });
}

async function createGameStartMessage(channel, word) {
  return channel.send(
    `Từ bắt đầu: **${word}**\nHãy nối tiếp bằng 2 tiếng và dùng cùng tiếng cuối của từ trước.`,
  ).catch((err) => {
    console.error("[Noitu] Error sending game start message:", err?.message);
  });
}

async function startNoituGame(client, guildId, channel, starterId = null) {
  const nextWord = getRandomWord([]);

  if (!nextWord) {
    throw new Error("Không tìm thấy từ mở đầu phù hợp trong ngân hàng từ.");
  }

  const normalized = normalizeWord(nextWord);

  setGameState(client, guildId, {
    running: true,
    channelId: channel.id,
    currentWord: normalized,
    currentPlayerId: null,
    words: [normalized],
    lastUpdatedAt: Date.now(),
  });

  await createGameStartMessage(channel, nextWord);
  return nextWord;
}

async function stopNoituGame(client, guildId) {
  const state = getGameState(client, guildId);
  if (!state) {
    return false;
  }

  clearGameState(client, guildId);
  return true;
}

// Sequential Message Queue per Guild to prevent race conditions & desyncs
const guildQueues = new Map();

async function handleNoituMessage(message, client) {
  const guildId = message.guild?.id;
  if (!guildId) return false;

  const prevPromise = guildQueues.get(guildId) || Promise.resolve();
  let release;
  const currentPromise = new Promise((resolve) => {
    release = resolve;
  });
  guildQueues.set(guildId, currentPromise);

  try {
    await Promise.race([
      prevPromise,
      new Promise((res) => setTimeout(res, 3000)),
    ]);
    return await processNoituMessage(message, client);
  } catch (error) {
    console.error(`[Noitu] Error processing message in guild ${guildId}:`, error);
    return false;
  } finally {
    release();
    if (guildQueues.get(guildId) === currentPromise) {
      guildQueues.delete(guildId);
    }
  }
}

async function processNoituMessage(message, client) {
  if (!message.guild || message.author.bot) {
    return false;
  }

  let state = getGameState(client, message.guild.id);
  if (!state) {
    try {
      const guildDoc = await NoituGuild.findOne({ guildId: message.guild.id }).lean();
      if (guildDoc?.gameState?.running) {
        const resolvedChannelId = guildDoc.gameState?.channelId || guildDoc.channelId || null;
        state = {
          running: true,
          channelId: resolvedChannelId,
          currentWord: guildDoc.gameState.currentWord,
          currentPlayerId: guildDoc.gameState.currentPlayerId,
          words: Array.isArray(guildDoc.gameState.words) ? guildDoc.gameState.words : [],
          lastUpdatedAt: guildDoc.gameState.lastUpdatedAt || Date.now(),
        };
        if (!client.noituGames) client.noituGames = new Map();
        client.noituGames.set(message.guild.id, state);
      }
    } catch (dbErr) {
      console.error("[Noitu] Error loading fallback game state from DB:", dbErr?.message);
    }
  }

  const guildConfig = await getGuildConfig(message.guild.id);
  let activeChannelId = state?.channelId || guildConfig?.channelId;
  if (!activeChannelId) {
    try {
      const freshDoc = await NoituGuild.findOne({ guildId: message.guild.id }).lean();
      activeChannelId = freshDoc?.gameState?.channelId || freshDoc?.channelId;
    } catch {}
  }

  if (!activeChannelId || activeChannelId !== message.channel.id) {
    return false;
  }

  if (!state?.running) {
    return false;
  }

  const rawContent = message.content;
  if (!rawContent) {
    return false;
  }

  const contentLower = rawContent.toLowerCase().trim();
  if (contentLower.startsWith(config.prefix)) {
    const commandTokens = contentLower
      .slice(config.prefix.length)
      .trim()
      .split(/\s+/);
    const commandName = commandTokens[0];
    const hasMainCommand =
      client.commands?.get(commandName) ||
      client.commands?.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );
    const hasNoituCommand =
      client.noituCommands?.get(commandName) ||
      client.noituCommands?.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );
    if (hasMainCommand || hasNoituCommand) {
      return false;
    }
  }

  if (
    contentLower.startsWith(`${config.prefix} noitu`) ||
    contentLower.startsWith(`${config.prefix}noitu`)
  ) {
    return false;
  }

  const content = normalizeWord(rawContent);
  if (!content) {
    return false;
  }

  const parts = content.split(/\s+/).filter(Boolean);
  if (parts.length !== 2) {
    return false;
  }

  // Non-blocking background update of user display name and avatar
  upsertNoituStats(message.author.id, message.guild.id, {
    name: message.member?.displayName || message.author.username,
    avatar:
      message.author.displayAvatarURL?.() || message.author.avatarURL?.() || "",
  }).catch(() => {});

  addQuery(1);

  const currentWord = normalizeWord(state.currentWord);
  const normalizedContent = normalizeWord(content);

  const targetTail = getLastToken(currentWord);
  const userFirstToken = getFirstToken(normalizedContent);

  // Turn lock timeout: if game was inactive for > 3 minutes (e.g. idle or bot restarted),
  // unlock currentPlayerId so the game can continue even if the same player types again!
  const idleMs = Date.now() - (state.lastUpdatedAt || 0);
  if (idleMs > 3 * 60 * 1000) {
    state.currentPlayerId = null;
  }

  // Strict Turn-Based Rule: Người vừa nối đúng từ trước đó KHÔNG được nối liên tiếp 2 từ.
  // Nhưng ngay khi có NGƯỜI KHÁC nối đúng, người trước đó sẽ được mở khóa ngay lập tức!
  if (state.currentPlayerId && String(message.author.id) === String(state.currentPlayerId)) {
    await message.react("⛔").catch(() => {});
    const spamRoasts = [
      "✋ Từ từ đi má, mới trả lời rồi mà để người khác chơi với chứ!",
      "Gấp gáp cái gì? Mới vừa nối xong, để người khác thở nữa chứ! 🙄",
      "Ăn tham thế má, nhường lượt cho người khác đi! ✋",
      "Nín nín giùm cái, chờ người khác nối xong rồi hãy gõ tiếp! 🤫"
    ];
    await message.channel.send(spamRoasts[Math.floor(Math.random() * spamRoasts.length)]).catch(() => {});
    return true;
  }

  const usedWordsNormalized = (state.words || []).map(normalizeWord);
  if (usedWordsNormalized.includes(normalizedContent)) {
    await message.react("⛔").catch(() => {});
    const duplicateRoasts = [
      `Từ "**${normalizedContent}**" dùng rồi mà má, có chịu đọc tin nhắn ở trên không vậy?! 🤦`,
      `Mắt để quên ở nhà à? Từ "**${normalizedContent}**" vừa nối xong mà má! 🙄`,
      `Alooo, từ "**${normalizedContent}**" xài rồi nhé, kéo lên trên mà xem giùm cái! 🥱`,
      `Nhớ dai dữ vậy má, từ "**${normalizedContent}**" có người nói rồi! 😒`
    ];
    await message.channel.send(duplicateRoasts[Math.floor(Math.random() * duplicateRoasts.length)]).catch(() => {});
    return true;
  }

  // 1. Sai chữ cái đầu nối tiếp (không bắt đầu bằng đuôi từ trước)
  if (targetTail && userFirstToken !== targetTail) {
    await message.react("⛔").catch(() => {});
    const wrongTailRoasts = [
      `Đang là chữ "**${targetTail}**" mà mẹ, có biết nhìn không vậy?! 🤦`,
      `Mắt để đi đâu đấy? Chữ tiếp theo phải bắt đầu bằng "**${targetTail}**" cơ mà! 🙄`,
      `Mắt mờ hay không biết đọc thế? Đang nối chữ "**${targetTail}**" nha má! 😒`,
      `Ủa alo? Đang là "**${targetTail}**" mà nhảy đi đâu thế hả trời?! 🤨`,
      `Tập trung chuyên môn giùm cái, chữ "**${targetTail}**" to lù lù ra đấy! 👀`
    ];
    await message.channel.send(wrongTailRoasts[Math.floor(Math.random() * wrongTailRoasts.length)]).catch(() => {});
    User.updateOne(
      { userId: message.author.id },
      { $inc: { noituAttempts: 1 }, $set: { noituLastPlayedAt: new Date() } },
      { upsert: true },
    ).catch(() => {});
    upsertNoituStats(message.author.id, message.guild.id, { total: 1 }).catch(() => {});
    return true;
  }

  // 2. Bắt đầu bằng đúng từ nối nhưng KHÔNG CÓ TRONG TỪ ĐIỂN (bịa từ / chế từ)
  getWordBank();
  if (!wordSetCache.has(normalizedContent)) {
    await message.react("⛔").catch(() => {});
    const invalidWordRoasts = [
      `Từ "**${normalizedContent}**" này ở hành tinh nào rơi xuống vậy má? Từ điển Trái Đất làm gì có! 👽`,
      `Bịa từ vừa thôi con lạy mẹ! Tiếng Việt làm gì có từ "**${normalizedContent}**"?! 🤡`,
      `Học lại Tiếng Việt đi bạn ơi, tra nát từ điển cũng không có từ "**${normalizedContent}**" đâu! 📖`,
      `Chế từ đẳng cấp đấy nhưng từ điển bot từ chối hiểu từ "**${normalizedContent}**" nhé! 🥱`,
      `Ngôn ngữ của người ngoài hành tinh hả? Từ "**${normalizedContent}**" vô nghĩa vãi chưởng! 🛸`
    ];
    await message.channel.send(invalidWordRoasts[Math.floor(Math.random() * invalidWordRoasts.length)]).catch(() => {});
    User.updateOne(
      { userId: message.author.id },
      { $inc: { noituAttempts: 1 }, $set: { noituLastPlayedAt: new Date() } },
      { upsert: true },
    ).catch(() => {});
    upsertNoituStats(message.author.id, message.guild.id, { total: 1 }).catch(() => {});
    return true;
  }

  state.words.push(normalizedContent);
  state.currentWord = normalizedContent;
  state.currentPlayerId = String(message.author.id);
  state.lastUpdatedAt = Date.now();
  await setGameState(client, message.guild.id, state);

  User.updateOne(
    { userId: message.author.id },
    {
      $inc: { noituAttempts: 1, noituCorrect: 1 },
      $set: { noituLastPlayedAt: new Date() },
    },
    { upsert: true },
  ).catch(() => {});
  upsertNoituStats(message.author.id, message.guild.id, {
    true: 1,
    total: 1,
  }).catch(() => {});
  addWordPlayedCount();

  await message.react("✅").catch(() => {});

  if (!hasContinuation(content, state.words)) {
    User.updateOne(
      { userId: message.author.id },
      {
        $inc: { noituWins: 1, coke: 40000 },
        $set: { noituLastPlayedAt: new Date() },
      },
      { upsert: true },
    ).catch(() => {});
    upsertNoituStats(message.author.id, message.guild.id, { win: 1 }).catch(() => {});
    addRoundPlayedCount();

    await message.channel.send(
      `👑 **${message.member?.displayName || message.author.username}** chiến thắng sau **${state.words.length - 1} lượt**! Nhận **40,000 coke**.\n` +
        "Lượt mới bắt đầu!",
    ).catch(() => {});

    try {
      await startNoituGame(
        client,
        message.guild.id,
        message.channel,
        message.author.id,
      );
    } catch (startErr) {
      console.error("[Noitu] Error auto-restarting round after win:", startErr);
    }
  }

  return true;
}

module.exports = {
  normalizeWord,
  getLastToken,
  getFirstToken,
  hasContinuation,
  getRandomWord,
  isValidNextWord,
  getGuildConfig,
  checkWordIfInDictionary,
  checkWordIfInReportDictionary,
  addWordToDictionary,
  getReportWords,
  addWordToReportList,
  countWordInDictionary,
  setGuildChannel,
  clearGuildChannel,
  getGameState,
  setGameState,
  clearGameState,
  initNoituGames,
  startNoituGame,
  stopNoituGame,
  handleNoituMessage,
  createGameStartMessage,
  getNoituStatsSnapshot,
  upsertNoituStats,
  getQuery,
  addQuery,
  getWordPlayedCount,
  addWordPlayedCount,
  getRoundPlayedCount,
  addRoundPlayedCount,
  getWordBank,
};
