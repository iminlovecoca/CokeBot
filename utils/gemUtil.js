/**
 * CokeBot Gem Utility
 * Manages equipping, durability consumption, and formatting of Hunting Gems based on OwO Bot.
 */

const { getGemById, getAllGems, GEMS_DATA, GEM_TYPES } = require("../data/gems");
const { ZOO_RANKS } = require("../data/animals");
const Item = require("../models/cokemon/Item");

/**
 * Seed all gems into MongoDB Item collection and populate client.allItems cache.
 */
async function seedGems(client) {
  if (!client) return;
  if (!Array.isArray(client.allItems)) {
    client.allItems = [];
  }

  const allGems = getAllGems();
  for (const gem of allGems) {
    const itemData = {
      item_id: gem.id,
      name: `${gem.emoji} ${gem.nameVi} (${gem.name})`,
      description: gem.description,
      item_type: "gem",
      price: gem.price || null,
      emoji: gem.emoji,
      effects: {
        type: gem.type,
        tier: gem.tier,
        rankLetter: gem.rankLetter,
        bonusAnimals: gem.bonusAnimals || 0,
        multiplier: gem.multiplier || 1,
        luckMultiplier: gem.luckMultiplier || 0,
        specialMultiplier: gem.specialMultiplier || 1,
        durability: gem.durability,
      },
    };

    let dbItem = await Item.findOne({ item_id: gem.id });
    if (!dbItem) {
      dbItem = await Item.create(itemData);
      console.log(`💎 Seeded gem in DB: #${gem.id} (${gem.name})`);
    } else {
      let changed = false;
      if (dbItem.name !== itemData.name) {
        dbItem.name = itemData.name;
        changed = true;
      }
      if (dbItem.description !== itemData.description) {
        dbItem.description = itemData.description;
        changed = true;
      }
      if (dbItem.emoji !== itemData.emoji) {
        dbItem.emoji = itemData.emoji;
        changed = true;
      }
      if (dbItem.item_type !== itemData.item_type) {
        dbItem.item_type = itemData.item_type;
        changed = true;
      }
      if (dbItem.price !== itemData.price) {
        dbItem.price = itemData.price;
        changed = true;
      }
      if (changed) {
        await dbItem.save();
        console.log(`💎 Updated gem in DB: #${gem.id} (${gem.name})`);
      }
    }

    const cachedIdx = client.allItems.findIndex((i) => i.item_id === gem.id);
    const obj = dbItem.toObject ? dbItem.toObject() : dbItem;
    if (cachedIdx > -1) {
      client.allItems[cachedIdx] = obj;
    } else {
      client.allItems.push(obj);
    }
  }
}

/**
 * Ensures user.huntGems object is properly structured.
 */
function ensureUserGems(user) {
  if (!user.huntGems || typeof user.huntGems !== "object") {
    user.huntGems = {
      hunting: null,
      empowering: null,
      lucky: null,
      special: null,
    };
  }
  return user.huntGems;
}

/**
 * Get count of a gem in user.inventory.
 */
function getUserGemInventoryCount(user, gemId) {
  if (!user || !user.inventory) return 0;
  const rawId = String(gemId).toLowerCase();
  if (user.inventory instanceof Map) {
    return (
      user.inventory.get(rawId) ||
      user.inventory.get(`gem-${rawId}`) ||
      0
    );
  }
  return (
    user.inventory[rawId] ||
    user.inventory[`gem-${rawId}`] ||
    0
  );
}

/**
 * Deduct 1 gem from user.inventory.
 */
function deductGemFromInventory(user, gemId) {
  if (!user || !user.inventory) return false;
  const rawId = String(gemId).toLowerCase();
  let keyToUse = rawId;

  if (user.inventory instanceof Map) {
    if (!user.inventory.has(keyToUse) && user.inventory.has(`gem-${rawId}`)) {
      keyToUse = `gem-${rawId}`;
    }
    const current = user.inventory.get(keyToUse) || 0;
    if (current <= 1) {
      user.inventory.delete(keyToUse);
    } else {
      user.inventory.set(keyToUse, current - 1);
    }
    if (typeof user.markModified === "function") {
      user.markModified("inventory");
    }
    return true;
  }

  if (user.inventory[keyToUse] === undefined && user.inventory[`gem-${rawId}`] !== undefined) {
    keyToUse = `gem-${rawId}`;
  }
  const current = user.inventory[keyToUse] || 0;
  if (current <= 1) {
    delete user.inventory[keyToUse];
  } else {
    user.inventory[keyToUse] = current - 1;
  }
  if (typeof user.markModified === "function") {
    user.markModified("inventory");
  }
  return true;
}

/**
 * Equips a single gem for a user into their active huntGems slot.
 * Enforces OwO rules:
 * - Must own gem in inventory.
 * - Cannot equip if an active gem of that slot is already in use (must wait for it to break).
 */
function equipGem(user, gemIdOrName) {
  const gem = getGemById(gemIdOrName);
  if (!gem) {
    return {
      success: false,
      error: `Vật phẩm \`${gemIdOrName}\` không phải là một viên ngọc hợp lệ.`,
    };
  }

  ensureUserGems(user);
  const currentSlot = user.huntGems[gem.type];
  if (currentSlot && currentSlot.durability > 0) {
    return {
      success: false,
      error: `Bạn đã gắn **${currentSlot.emoji} ${currentSlot.name}** (còn **${currentSlot.durability}** độ bền). Theo luật OwO, bạn không thể thay hoặc tháo ngọc cho đến khi nó vỡ hoàn toàn!`,
    };
  }

  const owned = getUserGemInventoryCount(user, gem.id);
  if (owned < 1) {
    return {
      success: false,
      error: `Bạn không có viên ngọc **${gem.emoji} ${gem.nameVi}** (\`#${gem.id}\`) trong túi đồ!`,
    };
  }

  // Deduct from inventory
  deductGemFromInventory(user, gem.id);

  // Equip into slot
  user.huntGems[gem.type] = {
    id: gem.id,
    name: gem.name,
    nameVi: gem.nameVi,
    type: gem.type,
    tier: gem.tier,
    rankLetter: gem.rankLetter,
    emoji: gem.emoji,
    bonusAnimals: gem.bonusAnimals || 0,
    multiplier: gem.multiplier || 1,
    luckMultiplier: gem.luckMultiplier || 0,
    specialMultiplier: gem.specialMultiplier || 1,
    durability: gem.durability,
    maxDurability: gem.durability,
  };

  if (typeof user.markModified === "function") {
    user.markModified("huntGems");
  }

  return {
    success: true,
    gem,
  };
}

/**
 * Equips multiple gems at once (e.g. xuse 51 65 72).
 */
function equipMultipleGems(user, gemIds) {
  const results = [];
  for (const id of gemIds) {
    const res = equipGem(user, id);
    results.push({ id, ...res });
  }
  return results;
}

/**
 * Consumes gem durabilities after an xhunt execution.
 * Rules calibrated to OwO:
 * - Hunting Gem: -1 durability per hunt.
 * - Empowering Gem: -doubledAnimals durability (number of animals gained from doubling).
 * - Lucky Gem: -animals caught (synchronized with Empowering when all 3 active).
 * - Special Gem: -animals caught.
 * - Breaks gem when durability <= 0.
 */
function consumeGemsOnHunt(user, totalAnimalsCaught, baseCatchCount) {
  ensureUserGems(user);
  const gems = user.huntGems;
  const brokenGems = [];

  const hasHunting = gems.hunting && gems.hunting.durability > 0;
  const hasEmpowering = gems.empowering && gems.empowering.durability > 0;
  const hasLucky = gems.lucky && gems.lucky.durability > 0;
  const isAllThreeActive = hasHunting && hasEmpowering && hasLucky;

  const doubledAnimals = Math.max(0, totalAnimalsCaught - baseCatchCount);

  // 1. Hunting Gem (-1 hunt)
  if (hasHunting) {
    gems.hunting.durability -= 1;
    if (gems.hunting.durability <= 0) {
      brokenGems.push({ ...gems.hunting });
      gems.hunting = null;
    }
  }

  // 2. Empowering Gem (-doubled animals)
  if (hasEmpowering) {
    gems.empowering.durability -= doubledAnimals;
    if (gems.empowering.durability <= 0) {
      brokenGems.push({ ...gems.empowering });
      gems.empowering = null;
    }
  }

  // 3. Lucky Gem
  if (hasLucky) {
    if (isAllThreeActive) {
      // Synchronized to empower rate so same-tier sets run out together
      gems.lucky.durability -= doubledAnimals;
    } else {
      gems.lucky.durability -= totalAnimalsCaught;
    }
    if (gems.lucky.durability <= 0) {
      brokenGems.push({ ...gems.lucky });
      gems.lucky = null;
    }
  }

  // 4. Special Gem
  if (gems.special && gems.special.durability > 0) {
    gems.special.durability -= totalAnimalsCaught;
    if (gems.special.durability <= 0) {
      brokenGems.push({ ...gems.special });
      gems.special = null;
    }
  }

  if (typeof user.markModified === "function") {
    user.markModified("huntGems");
  }

  return {
    brokenGems,
    activeGems: gems,
  };
}

/**
 * Formats active gems into badge strings: e.g. `[💎 C (24)] [🔮 C (48)] [💖 C (48)]`
 */
function formatActiveGemsBadges(user) {
  if (!user || !user.huntGems) return "";
  const badges = [];
  const order = ["hunting", "empowering", "lucky", "special"];

  for (const slot of order) {
    const gem = user.huntGems[slot];
    if (gem && gem.durability > 0) {
      badges.push(`[${gem.emoji} ${gem.rankLetter} (${gem.durability})]`);
    }
  }

  return badges.length > 0 ? badges.join(" ") : "";
}

/**
 * Returns formatted text description of active gems for inventory or gem info command.
 */
function formatActiveGemsDetailed(user) {
  ensureUserGems(user);
  const slots = [
    { key: "hunting", label: "Hunting Gem (Đi Săn)", emoji: "💎" },
    { key: "empowering", label: "Empowering Gem (Cường Hóa)", emoji: "🔮" },
    { key: "lucky", label: "Lucky Gem (May Mắn)", emoji: "💖" },
    { key: "special", label: "Special Gem (Đặc Biệt)", emoji: "⭐" },
  ];

  return slots
    .map((s) => {
      const g = user.huntGems[s.key];
      if (!g || g.durability <= 0) {
        return `${s.emoji} **${s.label}:** *(Trống)*`;
      }
      return `${s.emoji} **${g.nameVi}** (\`#${g.id}\` • Rank **${g.tier}**)\n└ Độ bền: **${g.durability}/${g.maxDurability}**`;
    })
    .join("\n");
}

module.exports = {
  seedGems,
  ensureUserGems,
  getUserGemInventoryCount,
  equipGem,
  equipMultipleGems,
  consumeGemsOnHunt,
  formatActiveGemsBadges,
  formatActiveGemsDetailed,
};
