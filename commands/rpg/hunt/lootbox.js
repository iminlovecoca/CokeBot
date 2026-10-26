const BaseCommand = require("../../../core/BaseCommand");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { UserFriendlyError } = require("../../../utils/errors");
const { GEMS_DATA } = require("../../../data/gems");

// Tier probability weights for Lootbox drops (OwO Bot 1:1 match)
const LOOTBOX_TIER_WEIGHTS = [
  { tier: "Common", weight: 22.0 },
  { tier: "Rare", weight: 22.0 },
  { tier: "Epic", weight: 20.0 },
  { tier: "Legendary", weight: 20.0 },
  { tier: "Mythic", weight: 10.0 },
  { tier: "Ancient", weight: 5.0 },
  { tier: "Divine", weight: 1.0 },
];

const TOTAL_WEIGHT = LOOTBOX_TIER_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

function rollGemFromLootbox() {
  // 1. Pick gem type: 33.33% Hunting, 33.33% Empowering, 33.33% Lucky
  const typeRoll = Math.random() * 99.99;
  let pickedType = "hunting";
  if (typeRoll < 33.33) {
    pickedType = "hunting";
  } else if (typeRoll < 66.66) {
    pickedType = "empowering";
  } else {
    pickedType = "lucky";
  }

  // 2. Pick tier (Common 22%, Rare 22%, Epic 20%, Legendary 20%, Mythic 10%, Ancient 5%, Divine 1%)
  const tierRoll = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  let pickedTier = "Common";
  for (const item of LOOTBOX_TIER_WEIGHTS) {
    cumulative += item.weight;
    if (tierRoll < cumulative) {
      pickedTier = item.tier;
      break;
    }
  }

  // 3. Find matching gem in GEMS_DATA
  const pool = GEMS_DATA.filter(
    (g) => g.type === pickedType && g.tier === pickedTier,
  );
  if (pool.length > 0) {
    return pool[0];
  }

  // Fallback
  return GEMS_DATA.find((g) => g.type === pickedType) || GEMS_DATA[0];
}

function toSuperscript(num) {
  const digits = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return String(num)
    .split("")
    .map((d) => digits[d] || d)
    .join("");
}

class LootboxCommand extends BaseCommand {
  constructor() {
    super({
      name: "lootbox",
      aliases: ["xlb", "lb", "box", "hopqua"],
      description: "Mở Hộp Quà (Lootbox) để nhận ngẫu nhiên Ngọc Săn Thú (Gems).",
      usage: `${config.prefix}lb [số_lượng / all]`,
      examples: [
        { intent: "Mở 1 hộp quà", command: `${config.prefix}lb` },
        { intent: "Mở 5 hộp quà", command: `${config.prefix}xlb 5` },
        { intent: "Mở tất cả hộp quà đang có", command: `${config.prefix}lb all` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args = []) {
    const user = await getUser(message.author.id);
    if (!user.inventory) {
      user.inventory = new Map();
    }

    const ownedLb =
      user.inventory instanceof Map
        ? user.inventory.get("lootbox") || user.inventory.get("lb") || 0
        : user.inventory.lootbox || user.inventory.lb || 0;

    if (ownedLb <= 0) {
      throw new UserFriendlyError(
        `${config.emoji.no} Bạn không có **Hộp Quà (Lootbox)** nào trong túi đồ!\n` +
        `💡 Bạn nhận được Lootbox từ lần săn thú (\`${config.prefix}hunt\`) đầu tiên mỗi ngày!`,
      );
    }

    let quantity = 1;
    const qtyArg = args[0]?.toLowerCase();
    if (qtyArg === "all") {
      quantity = ownedLb;
    } else if (qtyArg) {
      const parsed = parseInt(qtyArg, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new UserFriendlyError(`${config.emoji.no} Số lượng mở hộp không hợp lệ!`);
      }
      quantity = Math.min(parsed, ownedLb);
    }

    // Deduct lootboxes from inventory
    const keyUsed =
      user.inventory instanceof Map
        ? user.inventory.has("lootbox")
          ? "lootbox"
          : "lb"
        : user.inventory.lootbox !== undefined
          ? "lootbox"
          : "lb";

    if (user.inventory instanceof Map) {
      const remaining = ownedLb - quantity;
      if (remaining <= 0) {
        user.inventory.delete(keyUsed);
      } else {
        user.inventory.set(keyUsed, remaining);
      }
    } else {
      const remaining = ownedLb - quantity;
      if (remaining <= 0) {
        delete user.inventory[keyUsed];
      } else {
        user.inventory[keyUsed] = remaining;
      }
    }

    // Open boxes & accumulate rewards
    const gemDropsMap = new Map(); // gemId -> { gem, count }
    let totalCokeBonus = 0;

    for (let i = 0; i < quantity; i++) {
      const rolledGem = rollGemFromLootbox();
      const existing = gemDropsMap.get(rolledGem.id);
      if (existing) {
        existing.count += 1;
      } else {
        gemDropsMap.set(rolledGem.id, { gem: rolledGem, count: 1 });
      }

      // Small Coke bonus per box
      const cokeGained = Math.floor(2000 + Math.random() * 4000);
      totalCokeBonus += cokeGained;
    }

    // Add gems to user.inventory
    for (const [gemId, { count }] of gemDropsMap.entries()) {
      if (user.inventory instanceof Map) {
        const current = user.inventory.get(gemId) || 0;
        user.inventory.set(gemId, current + count);
      } else {
        user.inventory[gemId] = (user.inventory[gemId] || 0) + count;
      }
    }

    user.coke = (user.coke || 0) + totalCokeBonus;

    if (typeof user.markModified === "function") {
      user.markModified("inventory");
    }
    await user.save();

    const displayName = message.member?.displayName || message.author.username;
    const lbstakeEmoji = "<a:lbstake:1563961853477130261>";
    const lbopenEmoji = "<a:lbopen:1563961128047091731>";

    // Build drops emoji line with superscripts (e.g. `<:lucky_common:...>¹ <a:empowering_mythic:...>¹`)
    const dropsEmojisList = Array.from(gemDropsMap.values())
      .map(({ gem, count }) => `${gem.emoji}${toSuperscript(count)}`)
      .join(" ");

    // Initial message before opening
    const initialContent = `${lbstakeEmoji} **| ${displayName}** đang mở **${quantity}** hộp quà (lootbox)...`;
    const sentMsg = await message.reply({ content: initialContent });

    // Edit message after animation delay (matching OwO style)
    setTimeout(async () => {
      const finalContent =
        `${config.emoji.blank} **| ${displayName}** mở ${quantity} hộp quà (lootbox)\n` +
        `${lbopenEmoji} **|** và nhận được: ${dropsEmojisList}`;
      await sentMsg.edit({ content: finalContent }).catch(() => null);
    }, 1500);

    return sentMsg;
  }
};

module.exports = new LootboxCommand();
