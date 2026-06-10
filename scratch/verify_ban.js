const path = require("path");
const assert = require("assert");

// Resolve paths to match require statements
const userUtilPath = path.resolve(__dirname, "../utils/userUtil.js");
const noituGamePath = path.resolve(__dirname, "../utils/noituGame.js");

// Setup default mock values
let isBanned = true;

// Mock userUtil
require.cache[userUtilPath] = {
  id: userUtilPath,
  filename: userUtilPath,
  loaded: true,
  exports: {
    getOrCreateUser: async (userId) => {
      return {
        userId,
        bannedUntil: isBanned ? new Date(Date.now() + 3600 * 1000) : null, // 1 hour ban or none
      };
    },
    getUser: async () => ({}),
    getActiveCokemon: async () => ({}),
    addUserXp: async () => ({}),
    getRankEmoji: () => "🥇",
    isDev: () => false,
    isAdmin: () => false,
  }
};

// Mock noituGame
require.cache[noituGamePath] = {
  id: noituGamePath,
  filename: noituGamePath,
  loaded: true,
  exports: {
    handleNoituMessage: async () => false,
    getGuildConfig: async (guildId) => {
      return {
        channelId: "noitu-channel-123"
      };
    }
  }
};

const interactionCreate = require("../events/interactionCreate");
const messageCreate = require("../events/messageCreate");
const mongoose = require("mongoose");

// Mock mongoose connection ready state
Object.defineProperty(mongoose.connection, "readyState", {
  get: () => 1,
  configurable: true
});

console.log("=== STARTING BAN RESTRICTION VERIFICATION ===");

async function testInteractionCreate() {
  console.log("\n--- Testing events/interactionCreate.js ---");

  let replyPayload = null;
  const mockInteraction = {
    user: { id: "test-user-456" },
    replied: false,
    deferred: false,
    customId: "rpg_boss_fight:123",
    reply: async (payload) => {
      replyPayload = payload;
      return payload;
    },
    followUp: async (payload) => {
      replyPayload = payload;
      return payload;
    },
    isButton: () => true,
    isChatInputCommand: () => false,
  };

  // 1. Test when user is banned
  isBanned = true;
  replyPayload = null;
  await interactionCreate.execute(mockInteraction, {});
  assert.ok(replyPayload, "Banned user interaction should be replied to");
  assert.ok(replyPayload.content.includes("🚫 Bạn đang bị cấm sử dụng bot"), "Reply should contain ban message");
  assert.strictEqual(replyPayload.flags, 64, "Response should be ephemeral");
  console.log("PASS: Banned user interaction was blocked with ephemeral warning.");

  // 2. Test when user is not banned
  isBanned = false;
  replyPayload = null;
  await interactionCreate.execute(mockInteraction, {
    commands: {
      get: () => ({
        handleFightInteraction: async () => {
          replyPayload = { content: "Boss fight handled successfully" };
        }
      })
    }
  });
  assert.ok(replyPayload, "Unbanned user interaction should proceed");
  assert.strictEqual(replyPayload.content, "Boss fight handled successfully", "Unbanned user should bypass ban block");
  console.log("PASS: Unbanned user interaction proceeded without block.");
}

async function testMessageCreate() {
  console.log("\n--- Testing events/messageCreate.js ---");

  let replyMessage = null;
  const mockClient = {
    botLocked: false,
    xpCooldowns: new Map(),
    friendshipCooldowns: new Map()
  };

  // Base message mock creator
  const createMockMessage = (content, channelId, isThread = false) => {
    return {
      author: { id: "test-user-456", bot: false },
      content,
      guild: { id: "guild-123" },
      channel: {
        id: channelId,
        isThread: () => isThread,
        ownerId: isThread ? "bot-client-id" : "some-user"
      },
      reply: async (text) => {
        replyMessage = text;
        return { content: text };
      }
    };
  };

  // Update client user ID for thread checks
  mockClient.user = { id: "bot-client-id" };

  // Case 1: Banned user typing prefix command (starts with x)
  isBanned = true;
  replyMessage = null;
  const msg1 = createMockMessage("xprofile", "general-channel");
  await messageCreate.execute(msg1, mockClient);
  assert.ok(replyMessage, "Banned user prefix command should be blocked and warned");
  assert.ok(replyMessage.includes("🚫 Bạn đang bị cấm sử dụng bot"), "Reply should contain ban message");
  console.log("PASS: Banned user prefix command blocked.");

  // Case 2: Banned user typing in noitu channel
  isBanned = true;
  replyMessage = null;
  const msg2 = createMockMessage("bút thước", "noitu-channel-123");
  await messageCreate.execute(msg2, mockClient);
  assert.ok(replyMessage, "Banned user in noitu channel should be blocked and warned");
  assert.ok(replyMessage.includes("🚫 Bạn đang bị cấm sử dụng bot"), "Reply should contain ban message");
  console.log("PASS: Banned user message in noitu channel blocked.");

  // Case 3: Banned user typing in AI thread
  isBanned = true;
  replyMessage = null;
  const msg3 = createMockMessage("tại sao?", "thread-channel-789", true);
  await messageCreate.execute(msg3, mockClient);
  assert.ok(replyMessage, "Banned user in AI thread should be blocked and warned");
  assert.ok(replyMessage.includes("🚫 Bạn đang bị cấm sử dụng bot"), "Reply should contain ban message");
  console.log("PASS: Banned user message in AI thread blocked.");

  // Case 4: Banned user typing general chat message (no prefix, not noitu channel, not thread)
  isBanned = true;
  replyMessage = null;
  const msg4 = createMockMessage("hello mọi người", "general-channel");
  await messageCreate.execute(msg4, mockClient);
  assert.strictEqual(replyMessage, null, "Banned user general chat message should be silently ignored (no warning spam)");
  console.log("PASS: Banned user general message silently ignored.");

  // Case 5: Unbanned user typing normal message
  isBanned = false;
  replyMessage = null;
  const msg5 = createMockMessage("xprofile", "general-channel");
  // Override execute command behavior or let it throw command error handled gracefully
  let executedCommand = false;
  mockClient.commands = {
    get: () => ({
      execute: async () => {
        executedCommand = true;
      }
    }),
    find: () => null
  };
  await messageCreate.execute(msg5, mockClient);
  assert.strictEqual(replyMessage, null, "Unbanned user command should not trigger ban warning");
  assert.ok(executedCommand, "Unbanned user command should execute");
  console.log("PASS: Unbanned user command executed normally.");
}

async function run() {
  await testInteractionCreate();
  await testMessageCreate();
  console.log("\n=== ALL BAN CHECK VERIFICATIONS PASSED SUCCESSFULLY! ===");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
