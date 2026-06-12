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

let wordBankCache = [];
let wordBankSourceMtime = 0;

function readWordBankSource() {
  if (fs.existsSync(officialWordsPath)) {
    return {
      path: officialWordsPath,
      mtime: fs.statSync(officialWordsPath).mtimeMs,
      words: fs
        .readFileSync(officialWordsPath, "utf8")
        .split(/\r?\n/)
        .map(normalizeWord)
        .filter((word) => word.split(/\s+/).length === 2),
    };
  }

  return {
    path: gwDataPath,
    mtime: fs.existsSync(gwDataPath) ? fs.statSync(gwDataPath).mtimeMs : 0,
    words: fs.existsSync(gwDataPath)
      ? JSON.parse(fs.readFileSync(gwDataPath, "utf8"))
          .map(normalizeWord)
          .filter((word) => word.split(/\s+/).length === 2)
      : [],
  };
}

function getWordBank() {
  const source = readWordBankSource();
  if (source.mtime !== wordBankSourceMtime) {
    wordBankCache = source.words;
    wordBankSourceMtime = source.mtime;
  }
  return wordBankCache;
}

let reportWords = fs
  .readFileSync(reportWordsPath, "utf8")
  .split(/\r?\n/)
  .map(normalizeWord)
  .filter(Boolean);

function readIntegerFile(filePath) {
  return parseInt(fs.readFileSync(filePath, "utf8"), 10) || 0;
}

function writeIntegerFile(filePath, value) {
  fs.writeFileSync(filePath, String(value));
}

function getQuery() {
  return readIntegerFile(queryPath);
}

function addQuery(query = 1) {
  writeIntegerFile(queryPath, getQuery() + query);
}

function getWordPlayedCount() {
  return readIntegerFile(wordPlayedPath);
}

function addWordPlayedCount() {
  writeIntegerFile(wordPlayedPath, getWordPlayedCount() + 1);
}

function getRoundPlayedCount() {
  return readIntegerFile(roundPlayedPath);
}

function addRoundPlayedCount() {
  writeIntegerFile(roundPlayedPath, getRoundPlayedCount() + 1);
}

function normalizeWord(text) {
  return String(text || "")
    .toLowerCase()
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

function hasContinuation(word, usedWords = []) {
  const lastToken = getLastToken(word);
  if (!lastToken) return false;

  const wordBank = getWordBank();
  const usedSet = new Set(usedWords.map(normalizeWord));
  return wordBank.some((candidate) => {
    const normalized = normalizeWord(candidate);
    return (
      normalized !== normalizeWord(word) &&
      !usedSet.has(normalized) &&
      getFirstToken(normalized) === lastToken
    );
  });
}

function getRandomWord(usedWords = []) {
  const wordBank = getWordBank();
  const usedSet = new Set(usedWords.map(normalizeWord));

  const firstTokenMap = new Map();
  for (const word of wordBank) {
    const normalized = normalizeWord(word);
    if (!usedSet.has(normalized)) {
      const first = getFirstToken(normalized);
      if (!firstTokenMap.has(first)) {
        firstTokenMap.set(first, []);
      }
      firstTokenMap.get(first).push(normalized);
    }
  }

  const candidates = [];
  for (const word of wordBank) {
    const normalized = normalizeWord(word);
    if (!usedSet.has(normalized)) {
      const last = getLastToken(normalized);
      const matches = firstTokenMap.get(last);
      if (matches) {
        const hasValidContinuation = matches.some((candidate) => candidate !== normalized);
        if (hasValidContinuation) {
          candidates.push(normalized);
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
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
}

function isValidNextWord(currentWord, nextWord, usedWords = []) {
  const wordBank = getWordBank();
  const normalizedNext = normalizeWord(nextWord);
  if (!normalizedNext || normalizedNext.split(/\s+/).length !== 2) {
    return false;
  }

  if (!wordBank.includes(normalizedNext)) {
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

const guildConfigsCache = new Map();

async function getGuildConfig(guildId) {
  if (guildConfigsCache.has(guildId)) {
    return guildConfigsCache.get(guildId);
  }
  const config = await NoituGuild.findOne({ guildId }).lean();
  guildConfigsCache.set(guildId, config);
  return config;
}

function checkWordIfInDictionary(word) {
  return getWordBank().includes(normalizeWord(word));
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
  fs.writeFileSync(officialWordsPath, nextBank.join("\n"));
  fs.writeFileSync(gwDataPath, JSON.stringify(nextBank, null, 2));
  wordBankCache = nextBank;
  wordBankSourceMtime = fs.statSync(officialWordsPath).mtimeMs;
  return true;
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
  fs.writeFileSync(reportWordsPath, reportWords.join("\n"));
  return true;
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

function setGameState(client, guildId, state) {
  if (!client.noituGames) {
    client.noituGames = new Map();
  }

  client.noituGames.set(guildId, state);

  // Persist state to MongoDB asynchronously in the background
  NoituGuild.updateOne(
    { guildId },
    {
      $set: {
        gameState: {
          running: state.running,
          channelId: state.channelId,
          currentWord: state.currentWord,
          currentPlayerId: state.currentPlayerId,
          words: state.words,
          lastUpdatedAt: state.lastUpdatedAt,
        },
      },
    },
    { upsert: true }
  ).catch((err) => {
    console.error(`❌ [Noitu DB] Failed to save state for guild ${guildId}:`, err);
  });
}

function clearGameState(client, guildId) {
  if (client.noituGames) {
    client.noituGames.delete(guildId);
  }

  // Clear state in MongoDB asynchronously in the background
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
    console.error(`❌ [Noitu DB] Failed to clear state for guild ${guildId}:`, err);
  });
}

async function createGameStartMessage(channel, word) {
  return channel.send(
    `Từ bắt đầu: **${word}**\nHãy nối tiếp bằng 2 tiếng và dùng cùng tiếng cuối của từ trước.`,
  );
}

async function startNoituGame(client, guildId, channel, starterId = null) {
  const nextWord = getRandomWord([]);

  if (!nextWord) {
    throw new Error("Không tìm thấy từ mở đầu phù hợp trong ngân hàng từ.");
  }

  setGameState(client, guildId, {
    running: true,
    channelId: channel.id,
    currentWord: normalizeWord(nextWord),
    currentPlayerId: null,
    words: [normalizeWord(nextWord)],
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

async function handleNoituMessage(message, client) {
  if (!message.guild || message.author.bot) {
    return false;
  }

  const guildConfig = await getGuildConfig(message.guild.id);
  if (!guildConfig?.channelId || guildConfig.channelId !== message.channel.id) {
    return false;
  }

  const state = getGameState(client, message.guild.id);
  if (!state?.running) {
    return false;
  }

  const content = normalizeWord(message.content);
  if (!content) {
    return false;
  }

  if (content.startsWith(config.prefix)) {
    const commandTokens = content
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
    content.startsWith(`${config.prefix} noitu`) ||
    content.startsWith(`${config.prefix}noitu`)
  ) {
    return false;
  }

  const parts = content.split(/\s+/).filter(Boolean);
  if (parts.length !== 2) {
    return false;
  }

  await upsertNoituStats(message.author.id, message.guild.id, {
    name: message.member?.displayName || message.author.username,
    avatar:
      message.author.displayAvatarURL?.() || message.author.avatarURL?.() || "",
  });

  addQuery(1);

  const currentWord = state.currentWord;
  if (state.currentPlayerId && message.author.id === state.currentPlayerId) {
    await message.react("⛔").catch(() => {});
    await message.channel.send("✋ Từ từ đi, bạn vừa trả lời rồi mà!");
    return true;
  }

  if (state.words.includes(content)) {
    await message.react("⛔").catch(() => {});
    await message.channel.send("Từ này đã tồn tại!");
    return true;
  }

  if (!isValidNextWord(currentWord, content, state.words)) {
    await message.react("⛔").catch(() => {});
    await User.updateOne(
      { userId: message.author.id },
      { $inc: { noituAttempts: 1 }, $set: { noituLastPlayedAt: new Date() } },
      { upsert: true },
    );
    await upsertNoituStats(message.author.id, message.guild.id, { total: 1 });
    return true;
  }

  state.words.push(content);
  state.currentWord = content;
  state.currentPlayerId = message.author.id;
  state.lastUpdatedAt = Date.now();
  setGameState(client, message.guild.id, state);

  await User.updateOne(
    { userId: message.author.id },
    {
      $inc: { noituAttempts: 1, noituCorrect: 1 },
      $set: { noituLastPlayedAt: new Date() },
    },
    { upsert: true },
  );
  await upsertNoituStats(message.author.id, message.guild.id, {
    true: 1,
    total: 1,
  });
  addWordPlayedCount();

  await message.react("✅").catch(() => {});

  if (!hasContinuation(content, state.words)) {
    await User.updateOne(
      { userId: message.author.id },
      {
        $inc: { noituWins: 1, coke: 50000 },
        $set: { noituLastPlayedAt: new Date() },
      },
      { upsert: true },
    );
    await upsertNoituStats(message.author.id, message.guild.id, { win: 1 });
    addRoundPlayedCount();

    await message.channel.send(
      `👑 **${message.member?.displayName || message.author.username}** chiến thắng sau **${state.words.length - 1} lượt**! Nhận **50,000 coke**.\n` +
        "Lượt mới bắt đầu!",
    );

    await startNoituGame(
      client,
      message.guild.id,
      message.channel,
      message.author.id,
    );
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
