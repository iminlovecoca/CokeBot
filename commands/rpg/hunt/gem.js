const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { getUser } = require("../../../utils/userUtil");
const {
  getAllGems,
  getGemById,
  isGemId,
  GEM_TYPES,
} = require("../../../data/gems");
const {
  ensureUserGems,
  formatActiveGemsBadges,
  equipMultipleGems,
  getUserGemInventoryCount,
} = require("../../../utils/gemUtil");
const { getRpgColor, formatRpgFooter } = require("../../../utils/rpgUi");

class GemCommand extends BaseCommand {
  constructor() {
    super({
      name: "gem",
      aliases: ["gems", "ngoc"],
      description: "Xem và quản lý các viên ngọc hỗ trợ đi săn (OwO Gems).",
      usage: `${config.prefix}gem [use <id1> <id2>...]`,
      examples: [
        { intent: "Xem các ngọc đang kích hoạt và ngọc trong túi", command: `${config.prefix}gem` },
        { intent: "Kích hoạt ngọc bằng lệnh gem", command: `${config.prefix}gem use 51 65 72` },
        { intent: "Xem ngọc bằng alias", command: `${config.prefix}ngoc` },
      ],
      cooldown: 3,
    });
  }

  async execute(message, args = []) {
    const dbUser = await getUser(message.author.id);
    ensureUserGems(dbUser);

    // If subcommand is `use` or direct IDs provided: `xgem use 51 65 72` or `xgem 51 65 72`
    let potentialIds = [...args];
    if (potentialIds[0]?.toLowerCase() === "use") {
      potentialIds.shift();
    }

    const gemArgs = potentialIds.filter((arg) => isGemId(arg));
    if (gemArgs.length > 0) {
      const results = equipMultipleGems(dbUser, gemArgs);
      await dbUser.save();

      const lines = [];
      for (const res of results) {
        if (res.success) {
          lines.push(
            `✅ **|** Đã kích hoạt **${res.gem.emoji} ${res.gem.nameVi}** (\`#${res.gem.id}\` • Rank **${res.gem.tier}**) vào ô ngọc!`,
          );
        } else {
          lines.push(`❌ **|** \`#${res.id}\`: ${res.error}`);
        }
      }

      const activeBadges = formatActiveGemsBadges(dbUser);
      if (activeBadges) {
        lines.push(`\n💎 **| Ngọc đang kích hoạt:** ${activeBadges}`);
      }

      return message.reply(lines.join("\n"));
    }

    // Default: Display Gem Dashboard (Active Slots & Owned Gems)
    const displayName = message.member?.displayName || message.author.username;
    const embed = new EmbedBuilder()
      .setColor(getRpgColor("Mythic") || "#9b59b6")
      .setTitle(`💎 BẢNG NGỌC SĂN THÚ (OWO GEMS) • ${displayName}`)
      .setDescription(
        `Ngọc hỗ trợ gia tăng số lượng thú và tỉ lệ may mắn khi gõ \`${config.prefix}hunt\`.\n` +
        `Kích hoạt ngọc bằng: \`${config.prefix}use <id1> [id2] [id3]\` (ví dụ: \`${config.prefix}use 51 65 72\`).\n` +
        `*Lưu ý: Ngọc sau khi kích hoạt sẽ khóa chặt cho tới khi hết độ bền và vỡ vụn.*`,
      );

    // 1. Active Gem Slots
    const slots = [
      { key: "hunting", name: "Hunting Gem (Đi Săn)", emoji: "💎", desc: "Tăng số lượng thú mỗi lần hunt" },
      { key: "empowering", name: "Empowering Gem (Cường Hóa)", emoji: "🔮", desc: "Nhân đôi (2x) số thú bắt được" },
      { key: "lucky", name: "Lucky Gem (May Mắn)", emoji: "💖", desc: "Tăng tỉ lệ thú hiếm / giảm Common" },
      { key: "special", name: "Special Gem (Đặc Biệt)", emoji: "⭐", desc: "Tăng tỉ lệ thú Thần Thoại / Bí Mật" },
    ];

    let activeSlotsText = "";
    for (const slot of slots) {
      const active = dbUser.huntGems[slot.key];
      if (active && active.durability > 0) {
        const pct = Math.max(0, Math.min(100, Math.round((active.durability / (active.maxDurability || active.durability)) * 100)));
        activeSlotsText += `${slot.emoji} **${active.nameVi}** (\`#${active.id}\` • **${active.tier}**)\n` +
          `└ Độ bền: **${active.durability}/${active.maxDurability}** (${pct}%) • Hiệu ứng: ` +
          (active.bonusAnimals ? `+${active.bonusAnimals} thú` : "") +
          (active.multiplier ? `${active.multiplier}x thú` : "") +
          (active.luckMultiplier ? `+${active.luckMultiplier}x luck` : "") +
          (active.specialMultiplier ? `x${active.specialMultiplier} Divine/Secret` : "") +
          `\n`;
      } else {
        activeSlotsText += `${slot.emoji} **${slot.name}:** *(Trống)*\n`;
      }
    }
    embed.addFields({ name: "🛡️ Ô Ngọc Đang Kích Hoạt", value: activeSlotsText, inline: false });

    // 2. Gems in Inventory
    const allGems = getAllGems();
    const ownedGems = [];
    for (const gem of allGems) {
      const count = getUserGemInventoryCount(dbUser, gem.id);
      if (count > 0) {
        ownedGems.push({ ...gem, count });
      }
    }

    if (ownedGems.length === 0) {
      embed.addFields({
        name: "🎒 Ngọc Trong Túi Đồ",
        value: "*(Bạn chưa sở hữu viên ngọc nào. Mở Hộp Quà / Lootbox để nhận ngọc)*",
        inline: false,
      });
    } else {
      // Group by type
      for (const slot of slots) {
        const typeGems = ownedGems.filter((g) => g.type === slot.key);
        if (typeGems.length > 0) {
          const listText = typeGems
            .map((g) => `\`#${g.id}\` **${g.tier}** (x${g.count}): ${g.description}`)
            .join("\n");
          embed.addFields({
            name: `${slot.emoji} ${slot.name} (Túi: ${typeGems.reduce((s, g) => s + g.count, 0)})`,
            value: listText,
            inline: false,
          });
        }
      }
    }

    embed.setFooter(formatRpgFooter(`Dùng ${config.prefix}use <id> để trang bị ngọc`));
    return message.reply({ embeds: [embed] });
  }
}

module.exports = new GemCommand();
