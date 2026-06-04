const path = require("path");
const fs = require("fs");

// Mocking User and NoituGuild models to prevent database connection requirements
const mockModel = {
  updateOne: async () => ({ nModified: 1 }),
  findOne: () => ({
    lean: () => Promise.resolve({ channelId: "1234567890", guildId: "mock-guild" }),
  }),
  countDocuments: async () => 5,
};

// Intercept require calls for models
require("../models/User");
require("../models/NoituGuild");
require.cache[require.resolve("../models/User")] = { exports: mockModel };
require.cache[require.resolve("../models/NoituGuild")] = { exports: mockModel };

// Load the Bootstrap and Game modules
const { syncNoituData } = require("../utils/noituBootstrap");
const noituGame = require("../utils/noituGame");

async function runTests() {
  console.log("🧪 Starting word-linking game verification tests...\n");

  // 1. Sync Test
  console.log("🔄 Testing dictionary sync from GitHub...");
  try {
    await syncNoituData();
    console.log("✅ GitHub dictionary sync completed successfully.");
    const wordBankCount = noituGame.countWordInDictionary();
    console.log(`📚 Word bank current size: ${wordBankCount} words.\n`);
    if (wordBankCount === 0) {
      throw new Error("Word bank size is 0 after sync.");
    }
  } catch (error) {
    console.error("❌ Sync Test failed:", error.message);
    process.exit(1);
  }

  // 2. Tokenizer & Normalization Tests
  console.log("🔤 Testing word normalization and tokenization...");
  const cases = [
    { input: "  HỌC   sinh  ", normalized: "học sinh", first: "học", last: "sinh" },
    { input: "Sinh   Viên ", normalized: "sinh viên", first: "sinh", last: "viên" },
    { input: "học", normalized: "học", first: "học", last: "học" },
  ];

  for (const tc of cases) {
    const norm = noituGame.normalizeWord(tc.input);
    const first = noituGame.getFirstToken(tc.input);
    const last = noituGame.getLastToken(tc.input);

    if (norm !== tc.normalized) {
      throw new Error(`Normalization error for "${tc.input}": expected "${tc.normalized}", got "${norm}"`);
    }
    if (first !== tc.first) {
      throw new Error(`First token error for "${tc.input}": expected "${tc.first}", got "${first}"`);
    }
    if (last !== tc.last) {
      throw new Error(`Last token error for "${tc.input}": expected "${tc.last}", got "${last}"`);
    }
  }
  console.log("✅ Tokenizer and Normalization tests passed.\n");

  // 3. Validation Tests
  console.log("✅ Testing word link validation...");
  // We use real dictionary words "học sinh" -> "sinh viên"
  const word1 = "học sinh";
  const word2 = "sinh viên";
  const invalidWord = "sinh xyzabc"; // definitely not in real dictionary

  const testValid = noituGame.isValidNextWord(word1, word2, []);
  if (!testValid) {
    throw new Error(`Valid link '${word1}' -> '${word2}' was marked invalid!`);
  }

  const testInvalidSyllable = noituGame.isValidNextWord(word1, "gạch men", []);
  if (testInvalidSyllable) {
    throw new Error(`Invalid link '${word1}' -> 'gạch men' was marked valid!`);
  }

  const testDuplicate = noituGame.isValidNextWord(word1, word2, [word2]);
  if (testDuplicate) {
    throw new Error(`Used word '${word2}' was allowed to be re-used!`);
  }

  const testNotInDict = noituGame.isValidNextWord(word1, invalidWord, []);
  if (testNotInDict) {
    throw new Error(`Word not in dictionary '${invalidWord}' was allowed!`);
  }

  console.log("✅ Word link validation tests passed.\n");

  // 4. Continuation Tests
  console.log("🧩 Testing continuation checks...");
  // "học sinh" should have a continuation in the real dictionary
  const hasCont = noituGame.hasContinuation("học sinh", []);
  if (!hasCont) {
    throw new Error("'học sinh' should have a continuation in the loaded dictionary!");
  }

  // Find all continuation candidates for "học sinh" to force no-continuation
  const lastToken = noituGame.getLastToken("học sinh");
  const wordBank = noituGame.getWordBank();
  const continuationCandidates = wordBank.filter(
    (w) => noituGame.getFirstToken(w) === lastToken
  );

  console.log(`   Found ${continuationCandidates.length} continuation candidates for 'học sinh'.`);

  // If all continuation candidates are marked as used, then "học sinh" has no continuation
  const hasContAfterExhausted = noituGame.hasContinuation("học sinh", continuationCandidates);
  if (hasContAfterExhausted) {
    throw new Error("'học sinh' should have no continuation after all continuation candidates are used!");
  }
  console.log("✅ Continuation checks passed.\n");

  // 5. Client Game State Mock Tests
  console.log("🎮 Testing client game state operations...");
  const mockClient = {
    noituGames: new Map(),
  };
  const mockChannel = {
    id: "1234567890",
    send: async (msg) => {
      console.log(`   [Mock Channel Send]: ${msg}`);
      return {};
    },
  };

  await noituGame.startNoituGame(mockClient, "mock-guild", mockChannel);
  const state = noituGame.getGameState(mockClient, "mock-guild");
  if (!state || !state.running) {
    throw new Error("Game failed to start / state not running.");
  }
  console.log(`   Started word: ${state.currentWord}`);

  await noituGame.stopNoituGame(mockClient, "mock-guild");
  const stoppedState = noituGame.getGameState(mockClient, "mock-guild");
  if (stoppedState) {
    throw new Error("Game state was not cleared after stop.");
  }
  console.log("✅ Client game state tests passed.\n");

  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! CokeBot Word-Linking game operates perfectly.");
}

runTests().catch((err) => {
  console.error("❌ Test run failed with unexpected error:", err);
  process.exit(1);
});
