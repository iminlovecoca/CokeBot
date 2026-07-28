const BaseCommand = require("../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { requireRpgCharacter, getEquippedPet } = require("../../utils/rpgUtil");
const {
  PET_TIERS,
  PET_SPECIES,
  generatePetStats,
  findPetSpecies,
} = require("../../data/pets");
const { getXpRequired } = require("../../utils/petXpUtil");

class PetCommand extends BaseCommand {
  constructor() {
    super({
      name: "pet",
      aliases: ["pets", "p", "zoo"],
      category: "rpg",
      description: "Xem danh sách thú sở hữu (Zoo) hoặc chi tiết Linh Thú của bạn.",
      usage: "xpet [tên_pet]",
    });
  }

  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);

    const query = args.join(" ").trim();
    if (query) {
      return this.showPetDetail(message, user, query);
    }

    return this.showPetList(message, user);
  }

  async showPetDetail(message, user, query) {
    const pets = user.rpg.pets || [];
    const species = findPetSpecies(query);

    let ownedPet = pets.find((p) => {
      if (p.name.toLowerCase().includes(query.toLowerCase())) return true;
      if (p.key.toLowerCase() === query.toLowerCase()) return true;
      if (p.nickname && p.nickname.toLowerCase().includes(query.toLowerCase()))
        return true;
      return false;
    });

    let targetSpecies = species;
    if (ownedPet && !targetSpecies) {
      targetSpecies = findPetSpecies(ownedPet.key);
    }

    if (!ownedPet && !targetSpecies) {
      return message.channel.send(
        `${config.emoji.no} Không tìm thấy linh thú có tên hoặc alias **"${query}"**.`
      );
    }

    const tierConfig = PET_TIERS[targetSpecies ? targetSpecies.tier : "Common"] || PET_TIERS.Common;
    const petData = ownedPet || {
      id: "preview",
      key: targetSpecies.key,
      name: targetSpecies.name,
      nickname: targetSpecies.name,
      tier: targetSpecies.tier,
      emoji: targetSpecies.emoji,
      level: 1,
      exp: 0,
      stats: {
        baseHp: tierConfig.baseHp,
        baseAtk: tierConfig.baseAtk,
        baseDef: tierConfig.baseDef,
      },
    };

    const isOwned = Boolean(ownedPet);
    const isEquipped =
      isOwned &&
      user.rpg.equippedPet &&
      (user.rpg.equippedPet.id === petData.id ||
        user.rpg.equippedPet.key === petData.key);

    const level = petData.level || 1;
    const currentExp = petData.exp || 0;
    const neededExp = getXpRequired(level);

    // Calculate Points (Power added)
    const tierMulti = {
      Common: 100,
      Rare: 250,
      Epic: 500,
      Legendary: 1000,
      Mythic: 2000,
      Ancient: 3500,
      Divine: 5000,
    };
    const hpVal = petData.stats?.baseHp || tierConfig.baseHp || 0;
    const atkVal = petData.stats?.baseAtk || tierConfig.baseAtk || 0;
    const defVal = petData.stats?.baseDef || tierConfig.baseDef || 0;

    const powerPoints =
      (tierMulti[petData.tier] || 100) +
      hpVal * 2 +
      atkVal * 5 +
      defVal * 4 +
      level * 35;

    // % Bonuses: HP +0.5% per level, ATK +0.4% per level, DEF +0.35% per level
    const hpPct = (level * 0.5).toFixed(1);
    const atkPct = (level * 0.4).toFixed(1);
    const defPct = (level * 0.35).toFixed(2);

    const aliasesStr = (targetSpecies?.aliases || [petData.key]).join(", ");
    const desc =
      targetSpecies?.description || "*Linh thú huyền bí mang sức mạnh bổ trợ.*";

    // Embed formatting matching OwO reference card
    const embed = new EmbedBuilder()
      .setColor(isEquipped ? 0x9b59b6 : 0x2b2d31)
      .setTitle(`${petData.emoji} ${petData.name} ${isEquipped ? "⭐ (Đang Trang Bị)" : ""}`)
      .setDescription(`*${desc}*`)
      .addFields(
        { name: "Nickname", value: `**${petData.nickname || petData.name}**`, inline: true },
        { name: "Level", value: `**${level}** (${currentExp}/${typeof neededExp === "number" ? neededExp : "MAX"} EXP)`, inline: true },
        { name: "Rank", value: `${tierConfig.emoji} **${petData.tier}**`, inline: true },
        { name: "Alias", value: `\`${aliasesStr}\``, inline: true },
        { name: "Points", value: `⚡ **+${powerPoints.toLocaleString()}** Power`, inline: true },
        { name: "Trạng thái", value: isOwned ? (isEquipped ? "✅ Đã trang bị" : "📦 Trong kho") : "❌ Chưa sở hữu", inline: true },
        {
          name: "❤️ Máu (HP)",
          value: `+${hpVal} (+${hpPct}% / lvl)`,
          inline: true,
        },
        {
          name: "⚔️ Tấn Công (ATK)",
          value: `+${atkVal} (+${atkPct}% / lvl)`,
          inline: true,
        },
        {
          name: "🛡️ Phòng Thủ (DEF)",
          value: `+${defVal} (+${defPct}% / lvl)`,
          inline: true,
        }
      );

    return message.channel.send({ embeds: [embed] });
  }

  async showPetList(message, user) {
    const pets = user.rpg.pets || [];

    // Map owned species keys
    const ownedKeys = new Set(pets.map((p) => p.key));

    const username = message.member?.displayName || message.author.displayName || message.author.username;

    let text = `🌿🌱🌳 **${username}'s zoo!** 🌳🌱🌿\n`;

    const tierOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];

    tierOrder.forEach((tierKey) => {
      const tierConfig = PET_TIERS[tierKey];
      const speciesInTier = PET_SPECIES.filter((s) => s.tier === tierKey);
      if (speciesInTier.length > 0 && tierConfig) {
        const itemsStr = speciesInTier
          .map((sp) => (ownedKeys.has(sp.key) ? sp.emoji : "❓"))
          .join("   ");
        text += `${tierConfig.emoji}   ${itemsStr}\n`;
      }
    });

    return message.channel.send(text);
  }
}

module.exports = new PetCommand();
