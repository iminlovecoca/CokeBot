const config = require("../data/config");
const User = require("../models/User");
User.findOne = () => {
  return {
    sort: () => ({
      exec: async () => ({ rpg: { lastItemId: 100 } })
    })
  };
};

const { generateRpgGearDrop } = require("../utils/rpgUtil");

// Mock client.allItems
const mockAllItems = [
  { item_id: "somber-4", name: "Somber Smithing Stone [4]", emoji: "✨" },
  { item_id: "somber-5", name: "Somber Smithing Stone [5]", emoji: "✨" },
  { item_id: "somber-6", name: "Somber Smithing Stone [6]", emoji: "✨" },
  { item_id: "somber-7", name: "Somber Smithing Stone [7]", emoji: "✨" },
  { item_id: "somber-8", name: "Somber Smithing Stone [8]", emoji: "✨" },
  { item_id: "somber-9", name: "Somber Smithing Stone [9]", emoji: "✨" }
];

// Mock user
const mockUser = {
  userId: "12345",
  coke: 0,
  inventory: new Map(),
  rpg: {
    classKey: "warrior",
    level: 10,
    exp: 0,
    power: 0,
    items: [],
  },
  markModified: () => {},
  save: async function() { return this; }
};

// Mock requireRpgCharacter
const requireRpgCharacter = async (userId) => {
  return {
    user: mockUser,
    rpgClass: {
      name: "Warrior",
      bonuses: { expGain: 0.1, dropRate: 0.05 }
    }
  };
};

// Mock generateRpgGearDrop options and validation
async function testBossRewardsForTier(boss) {
  console.log(`\n--------------------------------------------`);
  console.log(`🤖 Testing rewards for boss: ${boss.name} (Rank: ${boss.rank})`);

  const bossRankKey = boss.rank || "thuong";
  const rankReward = config.rpg.boss?.bossRankRewards?.[bossRankKey];
  
  if (!rankReward) {
    throw new Error(`FAIL: Rank reward configuration not found for rank: ${bossRankKey}`);
  }

  console.log(`Rank Info:`, {
    label: rankReward.label,
    participantRarities: rankReward.participantRarities,
    lastHitRarities: rankReward.lastHitRarities,
    lastHitBonusRarities: rankReward.lastHitBonusRarities || null,
  });

  // Verify "Common" is not in any reward tier
  if (rankReward.participantRarities.includes("Common")) {
    throw new Error(`FAIL: Common rarity found in participantRarities for rank ${bossRankKey}`);
  }
  if (rankReward.lastHitRarities.includes("Common")) {
    throw new Error(`FAIL: Common rarity found in lastHitRarities for rank ${bossRankKey}`);
  }
  if (rankReward.lastHitBonusRarities && rankReward.lastHitBonusRarities.includes("Common")) {
    throw new Error(`FAIL: Common rarity found in lastHitBonusRarities for rank ${bossRankKey}`);
  }

  // Simulate drop generation
  const gears = [];
  const gear1 = await generateRpgGearDrop(mockUser, {
    forceDrop: true,
    allowedRarities: rankReward.participantRarities,
  });
  if (gear1) {
    if (gear1.rarity === "Common") {
      throw new Error("FAIL: Generated gear1 has Common rarity!");
    }
    gears.push(gear1);
  }

  const gear2 = await generateRpgGearDrop(mockUser, {
    forceDrop: true,
    allowedRarities: rankReward.lastHitRarities,
  });
  if (gear2) {
    if (gear2.rarity === "Common") {
      throw new Error("FAIL: Generated gear2 has Common rarity!");
    }
    gears.push(gear2);
  }

  if (rankReward.lastHitBonusRarities) {
    const gear3 = await generateRpgGearDrop(mockUser, {
      forceDrop: true,
      allowedRarities: rankReward.lastHitBonusRarities,
    });
    if (gear3) {
      if (gear3.rarity === "Common") {
        throw new Error("FAIL: Generated gear3 has Common rarity!");
      }
      gears.push(gear3);
    }
  }

  console.log(`Dropped Gears:`, gears.map(g => `${g.name} (${g.rarity})`));

  // Simulate stone drops
  const stonesDropped = [];
  if (bossRankKey === "rong" || bossRankKey === "thuongnhan") {
    const dropCount = 2; // Fixed for test predictability
    const stoneOptions = bossRankKey === "rong"
      ? ["somber-4", "somber-5", "somber-6"]
      : ["somber-7", "somber-8", "somber-9"];

    for (let i = 0; i < dropCount; i++) {
      const stoneId = stoneOptions[i % stoneOptions.length];
      const currentQty = mockUser.inventory.get(stoneId) || 0;
      mockUser.inventory.set(stoneId, currentQty + 1);

      const stoneData = mockAllItems.find(item => item.item_id === stoneId);
      stonesDropped.push({
        id: stoneId,
        name: stoneData?.name || stoneId,
        emoji: stoneData?.emoji || "💎",
        quantity: 1
      });
    }
  }
  if (stonesDropped.length > 0) {
    console.log(`Dropped Stones:`, stonesDropped.map(s => `${s.emoji} ${s.name} x${s.quantity}`));
  }
  
  // Clean up mock user inventory
  mockUser.inventory.clear();
  console.log(`✅ Success for ${boss.name}`);
}

async function runTests() {
  console.log("=== STARTING BOSS CONFIG & REWARD SIMULATION ===");

  const bossTiers = config.rpg.boss.tiers;
  console.log(`Found ${bossTiers.length} boss tiers.`);

  for (const boss of bossTiers) {
    await testBossRewardsForTier(boss);
  }

  console.log("\n=== ALL BOSS SIMULATION TESTS COMPLETED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
