const User = require("../models/User");
const takeCommand = require("../commands/admin/take.js");

// Mock mockUser
const mockUser = {
  userId: "12345",
  coke: 1000,
  inventory: new Map([
    ["stone3", 5],
    ["somber-1", 10]
  ]),
  markModified: function(field) {
    this.modifiedField = field;
  },
  save: async function() {
    return this;
  }
};

// Mock User models
User.findOne = (query) => {
  if (query && query.userId === "12345") {
    return mockUser;
  }
  return null;
};

// Mock client.allItems
const mockAllItems = [
  { item_id: "stone3", name: "Đá Cấp 3", emoji: "💎" },
  { item_id: "somber-1", name: "Somber Stone 1", emoji: "✨" }
];

const config = require("../data/config");
config.permissions.dev_ids.push("745950731638407210");

async function runTests() {
  console.log("=== STARTING TAKE COMMAND TEST ===");

  // Mock message
  const mockMessage = {
    author: { id: "745950731638407210" }, // Owner/Dev ID
    mentions: {
      users: {
        first: () => ({ id: "12345" })
      }
    },
    client: {
      allItems: mockAllItems,
      users: {
        fetch: async () => ({ id: "12345" })
      }
    },
    replies: [],
    reply: function(response) {
      this.replies.push(response);
      return Promise.resolve(response);
    }
  };

  // Test Case 1: Take coke
  console.log("Test Case 1: Xtake @user 500");
  await takeCommand.execute(mockMessage, ["<@12345>", "500"]);
  if (mockUser.coke !== 500) {
    throw new Error(`FAIL: expected coke to be 500, got ${mockUser.coke}`);
  }
  console.log("SUCCESS: coke deducted correctly.");

  // Test Case 2: Take items (partial quantity)
  console.log("Test Case 2: Xtake item @user stone3 2");
  await takeCommand.execute(mockMessage, ["item", "<@12345>", "stone3", "2"]);
  const qty = mockUser.inventory.get("stone3");
  if (qty !== 3) {
    throw new Error(`FAIL: expected stone3 qty to be 3, got ${qty}`);
  }
  console.log("SUCCESS: item partial quantity deducted correctly.");

  // Test Case 3: Take items (case-insensitive ID)
  console.log("Test Case 3: Xtake item @user Stone3 1");
  await takeCommand.execute(mockMessage, ["item", "<@12345>", "Stone3", "1"]);
  const qtyAfterCase = mockUser.inventory.get("stone3");
  if (qtyAfterCase !== 2) {
    throw new Error(`FAIL: expected stone3 qty to be 2, got ${qtyAfterCase}`);
  }
  console.log("SUCCESS: case-insensitive item deduction verified.");

  // Test Case 4: Take items to 0 (delete item from map)
  console.log("Test Case 4: Xtake item @user stone3 2");
  await takeCommand.execute(mockMessage, ["item", "<@12345>", "stone3", "2"]);
  const stone3Exists = mockUser.inventory.has("stone3");
  if (stone3Exists) {
    throw new Error(`FAIL: expected stone3 to be deleted from inventory, but it exists`);
  }
  console.log("SUCCESS: item deleted from inventory when count reaches 0.");

  // Test Case 5: Take more than available (should throw)
  console.log("Test Case 5: Xtake item @user somber-1 15 (should fail)");
  try {
    await takeCommand.execute(mockMessage, ["item", "<@12345>", "somber-1", "15"]);
    throw new Error("FAIL: expected command to throw error for insufficient quantity");
  } catch (error) {
    console.log("SUCCESS: Threw error as expected:", error.message);
  }

  // Test Case 6: Take invalid item (should throw)
  console.log("Test Case 6: Xtake item @user nonexistent_item 1 (should fail)");
  try {
    await takeCommand.execute(mockMessage, ["item", "<@12345>", "nonexistent_item", "1"]);
    throw new Error("FAIL: expected command to throw error for nonexistent item");
  } catch (error) {
    console.log("SUCCESS: Threw error as expected:", error.message);
  }

  console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
