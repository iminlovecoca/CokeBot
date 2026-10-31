/**
 * CokeBot Gem Utility
 * Manages equipping, durability consumption, and formatting of Hunting Gems based on OwO Bot.
 */

const { getGemById, getAllGems, GEMS_DATA, GEM_TYPES } = require("../data/gems");
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
      price: null,
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
  const rawId = String(gemId).replace(/^0+/, "") || "0";
  const paddedId = String(gemId).padStart(3, "0");
  const keys = [paddedId, rawId, `gem-${paddedId}`, `gem-${rawId}`];

  if (user.inventory instanceof Map) {
    for (const k of keys) {
      const val = user.inventory.get(k);
      if (val !== undefined && val > 0) return val;
    }
    return 0;
  }
  for (const k of keys) {
    const val = user.inventory[k];
    if (val !== undefined && val > 0) return val;
  }
  return 0;
}

/**
 * Deduct 1 gem from user.inventory.
 */
function deductGemFromInventory(user, gemId) {
  if (!user || !user.inventory) return false;
  const rawId = String(gemId).replace(/^0+/, "") || "0";
  const paddedId = String(gemId).padStart(3, "0");
  const keys = [paddedId, rawId, `gem-${paddedId}`, `gem-${rawId}`];

  if (user.inventory instanceof Map) {
    let targetKey = null;
    for (const k of keys) {
      if (user.inventory.has(k) && user.inventory.get(k) > 0) {
        targetKey = k;
        break;
      }
    }
    if (!targetKey) return false;

    const current = user.inventory.get(targetKey) || 0;
    if (current <= 1) {
      user.inventory.delete(targetKey);
    } else {
      user.inventory.set(targetKey, current - 1);
    }
    if (typeof user.markModified === "function") {
      user.markModified("inventory");
    }
    return true;
  }

  let targetKey = null;
  for (const k of keys) {
    if (user.inventory[k] !== undefined && user.inventory[k] > 0) {
      targetKey = k;
      break;
    }
  }
  if (!targetKey) return false;

  const current = user.inventory[targetKey] || 0;
  if (current <= 1) {
    delete user.inventory[targetKey];
  } else {
    user.inventory[targetKey] = current - 1;
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
      code: "INVALID_ID",
      error: `ID ngọc \`${gemIdOrName}\` không hợp lệ!`,
    };
  }

  ensureUserGems(user);
  if (gem.type === "special") {
    const { isMonthlyEventActive } = require("./eventUtil");
    if (!isMonthlyEventActive()) {
      return {
        success: false,
        code: "EVENT_INACTIVE",
        gem,
        error: "sự kiện hàng tháng hiện chưa mở! Ngọc Đặc Biệt (hình tam giác) chỉ có thể kích hoạt khi sự kiện đang diễn ra.",
      };
    }
  }
  const currentSlot = user.huntGems[gem.type];
  if (currentSlot && currentSlot.durability > 0) {
    return {
      success: false,
      code: "ALREADY_ACTIVE",
      type: gem.type,
      gem,
      error: `bạn đã gắn loại ngọc này rồi!`,
    };
  }

  const owned = getUserGemInventoryCount(user, gem.id);
  if (owned < 1) {
    return {
      success: false,
      code: "NOT_OWNED",
      gem,
      error: `bạn không có viên ngọc này trong túi đồ!`,
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
 * Equips multiple gems at once (e.g. use 51 65 72).
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
 * Returns formatted description of the gem's activation effect (matching OwO style).
 */
function getGemActivationDescription(gem) {
  if (!gem) return "";
  switch (gem.type) {
    case "hunting":
      return `${gem.durability} lần săn thủ công tiếp theo của bạn sẽ được tăng thêm ${gem.bonusAnimals} con thú`;
    case "empowering":
      return `${gem.durability} con thú tiếp theo bắt được sẽ được nhân đôi (2x)`;
    case "lucky":
      return `${gem.durability} con thú tiếp theo sẽ được tăng tỉ lệ may mắn thêm +${gem.luckMultiplier}x`;
    case "special":
      return `${gem.durability} con thú tiếp theo sẽ được tăng tỉ lệ bắt gặp Linh Thú Sự Kiện (Generation) thêm x${gem.specialMultiplier}`;
    default:
      return `${gem.description}`;
  }
}

/**
 * Consumes gem durabilities after an hunt execution.
 * Rules calibrated to OwO:
 * - Hunting Gem: -1 durability per hunt.
 * - Empowering Gem: -doubledAnimals durability.
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
      gems.lucky.durability -= doubledAnimals;
    } else {
      gems.lucky.durability -= totalAnimalsCaught;
    }
    if (gems.lucky.durability <= 0) {
      brokenGems.push({ ...gems.lucky });
      gems.lucky = null;
    }
  }

  // 4. Special Gem (Only consumes during active monthly event)
  if (gems.special && gems.special.durability > 0) {
    const { isMonthlyEventActive } = require("./eventUtil");
    if (isMonthlyEventActive()) {
      gems.special.durability -= totalAnimalsCaught;
      if (gems.special.durability <= 0) {
        brokenGems.push({ ...gems.special });
        gems.special = null;
      }
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
 * Formats active gems into OwO hunt badge string: e.g. `<:hunting_mythic:...> [0/100] <:empowering_mythic:...> [381/525] <:lucky_mythic:...> [261/525]`
 */
function formatActiveGemsBadges(user) {
  if (!user || !user.huntGems) return "";
  const badges = [];
  const order = ["hunting", "empowering", "lucky", "special"];

  for (const slot of order) {
    if (slot === "special") {
      const { isMonthlyEventActive } = require("./eventUtil");
      if (!isMonthlyEventActive()) continue;
    }
    const gem = user.huntGems[slot];
    if (gem && gem.durability !== undefined) {
      const remaining = Math.max(0, gem.durability);
      const maxD = gem.maxDurability || gem.durability || 100;
      badges.push(`${gem.emoji} [${remaining}/${maxD}]`);
    }
  }

  return badges.length > 0 ? badges.join(" ") : "";
}

/**
 * Formats active gems before consumption for hunt header.
 */
function formatActiveGemsBeforeHunt(gems) {
  if (!gems) return "";
  const badges = [];
  const order = ["hunting", "empowering", "lucky", "special"];

  for (const slot of order) {
    if (slot === "special") {
      const { isMonthlyEventActive } = require("./eventUtil");
      if (!isMonthlyEventActive()) continue;
    }
    const gem = gems[slot];
    if (gem && gem.durability > 0) {
      const remaining = Math.max(0, gem.durability);
      const maxD = gem.maxDurability || gem.durability || 100;
      badges.push(`${gem.emoji} [${remaining}/${maxD}]`);
    }
  }

  return badges.length > 0 ? badges.join(" ") : "";
}

module.exports = {
  seedGems,
  ensureUserGems,
  getUserGemInventoryCount,
  deductGemFromInventory,
  equipGem,
  equipMultipleGems,
  getGemActivationDescription,
  consumeGemsOnHunt,
  formatActiveGemsBadges,
  formatActiveGemsBeforeHunt,
};
