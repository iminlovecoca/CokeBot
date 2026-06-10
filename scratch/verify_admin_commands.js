const User = require("../models/User");

// Mock mongoose findOne/create to avoid buffering timeout without DB connection
User.findOne = () => ({
  lean: () => ({
    exec: async () => null
  }),
  sort: () => ({
    exec: async () => null
  }),
  exec: async () => null
});

const weaponlist = require("../commands/admin/weaponlist");
const removegear = require("../commands/admin/removegear");

async function runTests() {
  console.log("=== STARTING ADMIN COMMANDS VERIFICATION ===\n");

  // 1. Verify weaponlist metadata
  console.log("Testing weaponlist command definition...");
  if (weaponlist.name !== "weaponlist" || !weaponlist.aliases.includes("weapons")) {
    throw new Error("FAIL: weaponlist name or aliases incorrect!");
  }
  console.log("SUCCESS: weaponlist command definition verified.\n");

  // 2. Verify removegear metadata
  console.log("Testing removegear command definition...");
  if (removegear.name !== "removegear" || !removegear.aliases.includes("deletegear")) {
    throw new Error("FAIL: removegear name or aliases incorrect!");
  }
  console.log("SUCCESS: removegear command definition verified.\n");

  console.log("=== ALL ADMIN COMMANDS TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
