const BaseCommand = require("../../core/BaseCommand");
const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { requireRpgCharacter, getEquippedPet } = require("../../utils/rpgUtil");
const {
  PET_TIERS,
  PET_SPECIES,
  generatePetStats,
  getPetXpNeeded,
  findPetSpecies,
} = require("../../data/pets");

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

  async execute({ message, args }) {
    const { user } = await requireRpgCharacter(message.author.id);

    // Grant starter pet if empty
    if (!user.rpg.pets || user.rpg.pets.length === 0) {
      const starterSpecies = findPetSpecies("bee");
      const starterPet = {
        id: `pet-${Date.now()}-1`,
        key: starterSpecies.key,
        name: starterSpecies.name,
        nickname: starterSpecies.name,
        tier: starterSpecies.tier,
        emoji: starterSpecies.emoji,
        level: 1,
        exp: 0,
        stats: generatePetStats(starterSpecies),
        createdAt: new Date(),
      };
      user.rpg.pets = [starterPet];
      if (!user.rpg.equippedPet) {
        user.rpg.equippedPet = starterPet;
      }
      user.markModified("rpg");
      await user.save();
    }

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
    const neededExp = getPetXpNeeded(level);

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
        { name: "Level", value: `**${level}** (${currentExp}/${neededExp} EXP)`, inline: true },
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
      )
      .setFooter({
        text: `Dùng ${config.prefix}xaddpet <tên_pet> để trang bị | CokeBot RPG Pet`,
      });

    return message.channel.send({ embeds: [embed] });
  }

  async showPetList(message, user) {
    const pets = user.rpg.pets || [];
    const equipped = getEquippedPet(user);

    // Map owned species keys
    const ownedKeys = new Set(pets.map((p) => p.key));

    const username = message.member?.displayName || message.author.displayName || message.author.username;

    let text = `🌿🌱🌳 **${username}'s zoo!** 🌳🌱🌿\n`;
    if (equipped) {
      const lvl = equipped.level || 1;
      const hpPct = (lvl * 0.5).toFixed(1);
      const atkPct = (lvl * 0.4).toFixed(1);
      const defPct = (lvl * 0.35).toFixed(2);
      text += `⭐ **Đang Trang Bị**: ${equipped.emoji} **${equipped.name}** (Lvl **${lvl}**) | ❤️ +${hpPct}% HP | ⚔️ +${atkPct}% ATK | 🛡️ +${defPct}% DEF\n`;
    } else {
      text += `⚠️ **Chưa trang bị Linh Thú.** Dùng \`${config.prefix}xaddpet <tên_pet>\` để trang bị!\n`;
    }
    text += `──────────────────────────────\n`;

    const tierLetter = {
      Common: "C",
      Rare: "R",
      Epic: "E",
      Legendary: "L",
      Mythic: "M",
      Ancient: "A",
      Divine: "D",
    };

    const tierOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"];

    tierOrder.forEach((tierKey) => {
      const speciesInTier = PET_SPECIES.filter((s) => s.tier === tierKey);
      if (speciesInTier.length > 0) {
        const letter = tierLetter[tierKey] || tierKey[0];
        const itemsStr = speciesInTier
          .map((sp) => (ownedKeys.has(sp.key) ? sp.emoji : "🔒"))
          .join("   ");
        text += `**${letter}**   ${itemsStr}\n`;
      }
    });

    text += `──────────────────────────────\n`;
    text += `💡 *Gõ \`${config.prefix}xpet <tên_pet>\` để xem chi tiết | \`${config.prefix}xaddpet <tên_pet>\` để trang bị.*`;

    return message.channel.send(text);
  }
}

module.exports = PetCommand;
