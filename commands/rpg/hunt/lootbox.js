const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const { UserFriendlyError } = require("../../../utils/errors");
const { getGemsByType, GEMS_DATA } = require("../../../data/gems");
const { getRpgColor, formatRpgFooter } = require("../../../utils/rpgUi");

// Tier probability weights for Lootbox drops (Calibrated to OwO Bot rates)
const LOOTBOX_TIER_WEIGHTS = [
  { tier: "Common", weight: 22.0 },
  { tier: "Rare", weight: 20.0 },
  { tier: "Epic", weight: 20.0 },
  { tier: "Generation", weight: 15.0 },
  { tier: "Legendary", weight: 10.0 },
  { tier: "Mythic", weight: 7.0 },
  { tier: "Ancient", weight: 4.0 },
  { tier: "Divine", weight: 1.5 },
  { tier: "Secret", weight: 0.5 },
];

const TOTAL_WEIGHT = LOOTBOX_TIER_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

function rollGemFromLootbox() {
  // 1. Pick gem type (Hunting 32%, Empowering 32%, Lucky 32%, Special 4%)
  const typeRoll = Math.random() * 100;
  let pickedType = "hunting";
  if (typeRoll < 32) {
    pickedType = "hunting";
  } else if (typeRoll < 64) {
    pickedType = "empowering";
  } else if (typeRoll < 96) {
    pickedType = "lucky";
  } else {
    pickedType = "special";
  }

  // 2. Pick tier
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

  // Fallback to Common of that type
  const fallback = GEMS_DATA.find((g) => g.type === pickedType && g.tier === "Common");
  return fallback || GEMS_DATA[0];
}

class LootboxCommand extends BaseCommand {
  constructor() {
    super({
      name: "lootbox",
      aliases: ["lb", "box", "hopqua"],
      description: "Mở Hộp Quà (Lootbox) để nhận ngẫu nhiên Ngọc Săn Thú (Gems) và Coke.",
      usage: `${config.prefix}lb [số_lượng / all]`,
      examples: [
        { intent: "Mở 1 hộp quà", command: `${config.prefix}lb` },
        { intent: "Mở 5 hộp quà", command: `${config.prefix}lb 5` },
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
        `💡 Bạn có thể mua tại cửa hàng bằng lệnh: \`${config.prefix}buy lootbox [số_lượng]\` (25.000 Coke/hộp).`,
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

      // 2,000 to 8,000 Coke per box
      const cokeGained = Math.floor(2000 + Math.random() * 6000);
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

    // Format Embed Output
    const displayName = message.member?.displayName || message.author.username;
    const sortedDrops = Array.from(gemDropsMap.values()).sort(
      (a, b) => (b.gem.price || 0) - (a.gem.price || 0),
    );

    const dropLines = sortedDrops.map(
      ({ gem, count }) =>
        `${gem.emoji} **${gem.nameVi}** (\`#${gem.id}\` • Rank **${gem.tier}**) x**${count}**\n└ *${gem.description}*`,
    );

    const embed = new EmbedBuilder()
      .setColor(getRpgColor("Legendary") || "#f39c12")
      .setTitle(`🎁 KẾT QUẢ MỞ ${quantity} HỘP QUÀ (LOOTBOX) • ${displayName}`)
      .setDescription(
        `Bạn đã mở thành công **${quantity}x Hộp Quà** và nhận được:\n\n` +
        dropLines.join("\n\n") +
        `\n\n🪙 **+${totalCokeBonus.toLocaleString()} Coke**`,
      )
      .setFooter(formatRpgFooter(`Dùng ${config.prefix}use <id1> <id2> <id3> để kích hoạt ngọc`));

    return message.reply({ embeds: [embed] });
  }
}

module.exports = new LootboxCommand();
