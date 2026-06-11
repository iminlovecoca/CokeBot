const User = require("../models/User");

// 1. Mocking requireRpgCharacter before requiring the command
const mockUser = {
  userId: "999999",
  rpg: {
    settings: {
      battleDisplay: "image",
      battleSpeed: "instant",
      battleLogs: "false"
    }
  },
  markModified: function(path) {
    this.modifiedPath = path;
  },
  save: async function() {
    this.saved = true;
    return this;
  }
};

const rpgUtil = require("../utils/rpgUtil");
rpgUtil.requireRpgCharacter = async (userId) => {
  return { user: mockUser };
};

// 2. Now require the command
const xbattlesetting = require("../commands/rpg/xbattlesetting");

const runTests = async () => {
  console.log("=== VERIFYING BATTLE DISPLAY SETTING COMMAND ===");

  // Test case 1: No arguments (should show current settings layout and help menu)
  let repliedPayload = null;
  const mockMessageNoArgs = {
    author: {
      id: "999999",
      username: "Khang",
      displayAvatarURL: () => "https://example.com/avatar.png"
    },
    reply: (payload) => {
      repliedPayload = payload;
      return Promise.resolve(payload);
    }
  };

  await xbattlesetting.execute(mockMessageNoArgs, []);
  console.log("Test 1 (No arguments) reply:");
  console.log("Author:", repliedPayload.embeds[0].data.author);
  console.log("Description:", repliedPayload.embeds[0].data.description);

  if (!repliedPayload.embeds[0].data.author.name.includes("Khang's battle settings")) {
    console.error("FAIL: Test 1 author is incorrect.");
    process.exit(1);
  }
  if (!repliedPayload.embeds[0].data.description.includes("**Display =** `image`")) {
    console.error("FAIL: Test 1 display setting is incorrect.");
    process.exit(1);
  }
  if (!repliedPayload.embeds[0].data.description.includes("💡 **Cách thay đổi cài đặt / How to change settings:**")) {
    console.error("FAIL: Test 1 did not display guide/help text.");
    process.exit(1);
  }
  console.log("SUCCESS: Test 1 passed.");

  // Test case 2: Set setting to text via display=text
  repliedPayload = null;
  mockUser.saved = false;
  const mockMessageText = {
    author: {
      id: "999999",
      username: "Khang",
      displayAvatarURL: () => "https://example.com/avatar.png"
    },
    reply: (payload) => {
      repliedPayload = payload;
      return Promise.resolve(payload);
    }
  };

  await xbattlesetting.execute(mockMessageText, ["display=text"]);
  console.log("Test 2 (display=text) description:", repliedPayload.embeds[0].data.description);
  if (mockUser.rpg.settings.battleDisplay !== "text" || !mockUser.saved || mockUser.modifiedPath !== "rpg") {
    console.error("FAIL: Test 2 did not update settings to text.");
    process.exit(1);
  }
  if (!repliedPayload.embeds[0].data.description.includes("**Display =** `text`")) {
    console.error("FAIL: Test 2 description did not show updated settings block.");
    process.exit(1);
  }
  console.log("SUCCESS: Test 2 passed.");

  // Test case 3: Set display setting to compact via shorthand "compact"
  repliedPayload = null;
  mockUser.saved = false;
  const mockMessageCompact = {
    author: {
      id: "999999",
      username: "Khang",
      displayAvatarURL: () => "https://example.com/avatar.png"
    },
    reply: (payload) => {
      repliedPayload = payload;
      return Promise.resolve(payload);
    }
  };

  await xbattlesetting.execute(mockMessageCompact, ["compact"]);
  console.log("Test 3 (shorthand 'compact') description:", repliedPayload.embeds[0].data.description);
  if (mockUser.rpg.settings.battleDisplay !== "compact" || !mockUser.saved) {
    console.error("FAIL: Test 3 did not update settings to compact.");
    process.exit(1);
  }
  console.log("SUCCESS: Test 3 passed.");

  // Test case 4: Set logs setting to link via shorthand "link"
  repliedPayload = null;
  mockUser.saved = false;
  const mockMessageLogs = {
    author: {
      id: "999999",
      username: "Khang",
      displayAvatarURL: () => "https://example.com/avatar.png"
    },
    reply: (payload) => {
      repliedPayload = payload;
      return Promise.resolve(payload);
    }
  };

  await xbattlesetting.execute(mockMessageLogs, ["link"]);
  console.log("Test 4 (shorthand 'link') description:", repliedPayload.embeds[0].data.description);
  if (mockUser.rpg.settings.battleLogs !== "link" || !mockUser.saved) {
    console.error("FAIL: Test 4 did not update logs setting to link.");
    process.exit(1);
  }
  console.log("SUCCESS: Test 4 passed.");

  // Test case 5: Invalid argument
  repliedPayload = null;
  const mockMessageInvalid = {
    author: {
      id: "999999",
      username: "Khang",
      displayAvatarURL: () => "https://example.com/avatar.png"
    },
    reply: (payload) => {
      repliedPayload = payload;
      return Promise.resolve(payload);
    }
  };

  await xbattlesetting.execute(mockMessageInvalid, ["invalid_arg"]);
  console.log("Test 5 (invalid argument) reply:", repliedPayload);
  if (typeof repliedPayload !== "string" || !repliedPayload.includes("Cấu hình không hợp lệ")) {
    console.error("FAIL: Test 5 did not reject invalid argument.");
    process.exit(1);
  }
  console.log("SUCCESS: Test 5 passed.");

  console.log("=== ALL SETTINGS COMMAND TESTS PASSED SUCCESSFULLY! ===");
};

runTests().catch(err => {
  console.error("CRITICAL TEST FAILURE:", err);
  process.exit(1);
});
