const BaseCommand = require("../../core/BaseCommand");
const { UserFriendlyError } = require("../../utils/errors");
const config = require("../../data/config");
const { FIXED_ITEMS, getItem, toSmallNum3Digits } = require("../../data/items");

class InventoryCommand extends BaseCommand {
  constructor() {
    super({
      name: "inventory",
      aliases: ["inv", "oinv", "tui", "tuido"],
      description: "Xem túi đồ dạng lưới chuẩn OwO với mã ID 3 chữ số cố định.",
      usage: `${config.prefix}inv [gems]`,
      examples: [
        { intent: "Xem túi đồ của bạn", command: `${config.prefix}inv` },
        { intent: "Xem túi đồ theo cú pháp OwO", command: `${config.prefix}oinv` },
        { intent: "Chỉ lọc ngọc săn thú", command: `${config.prefix}inv gems` },
      ],
      cooldown: 2,
    });
  }

  async execute(message, args = []) {
    const userRepository = message.client.services.get("userRepository");
    const user = await userRepository.getOrCreate(message.author.id);

    if (!user.inventory || (user.inventory instanceof Map ? user.inventory.size === 0 : Object.keys(user.inventory).length === 0)) {
      throw new UserFriendlyError(`${config.emoji.no} Túi đồ của bạn trống trơn!`);
    }

    // Aggregate inventory by fixed 3-digit ID
    const aggregated = new Map(); // fixedId -> { item, quantity }

    const rawEntries =
      user.inventory instanceof Map
        ? Array.from(user.inventory.entries())
        : Object.entries(user.inventory);

    for (const [key, qty] of rawEntries) {
      const quantity = Number(qty);
      if (!quantity || quantity <= 0) continue;

      const item = getItem(key);
      if (!item) {
        // Unknown raw item fallback
        const fallbackId = String(key).padStart(3, "0");
        const existing = aggregated.get(fallbackId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          aggregated.set(fallbackId, {
            item: { id: fallbackId, emoji: "📦", name: key, type: "misc", order: 999 },
            quantity,
          });
        }
        continue;
      }

      const existing = aggregated.get(item.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        aggregated.set(item.id, { item, quantity });
      }
    }

    if (aggregated.size === 0) {
      throw new UserFriendlyError(`${config.emoji.no} Túi đồ của bạn trống trơn!`);
    }

    // Filter by gems if requested
    const isGemsFilter = args[0]?.toLowerCase() === "gems" || args[0]?.toLowerCase() === "gem";
    let itemList = Array.from(aggregated.values());
    if (isGemsFilter) {
      itemList = itemList.filter((entry) => entry.item.type === "gem");
      if (itemList.length === 0) {
        throw new UserFriendlyError(`${config.emoji.no} Bạn không có viên ngọc nào trong túi đồ!`);
      }
    }

    // Sort items by fixed numerical order (order property / numeric ID)
    itemList.sort((a, b) => (a.item.order || 999) - (b.item.order || 999));

    // Format into 4 items per row (OwO style)
    const formattedCells = itemList.map(({ item, quantity }) => {
      const smallQty = toSmallNum3Digits(quantity);
      return `\`${item.id}\` ${item.emoji}${smallQty}`;
    });

    const rows = [];
    const ITEMS_PER_ROW = 4;
    for (let i = 0; i < formattedCells.length; i += ITEMS_PER_ROW) {
      rows.push(formattedCells.slice(i, i + ITEMS_PER_ROW).join("  "));
    }

    const displayName = message.member?.displayName || message.author.username;
    const header = `====== ${displayName}'s Inventory ======`;
    const fullText = `${header}\n${rows.join("\n")}`;

    return message.reply({ content: fullText });
  }
}

module.exports = new InventoryCommand();
