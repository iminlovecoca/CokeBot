const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../../data/config");
const { requireRpgCharacter, getEquippedPet } = require("../../../utils/rpgUtil");
const {
  PET_TIERS,
  PET_SPECIES,
  generatePetStats,
  findPetSpecies,
} = require("../../../data/pets");
const { getXpRequired } = require("../../../utils/petXpUtil");
const { getRpgColor, formatRpgFooter, formatRpgTitle } = require("../../../utils/rpgUi");

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
    const removeTones = (str) =>
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D") : "";
    const cleanQuery = removeTones(query).toLowerCase();

    let ownedPet = pets.find((p) => {
      if (species && p.key === species.key) return true;
      if (p.key && p.key.toLowerCase() === query.toLowerCase()) return true;
      if (p.name && removeTones(p.name).toLowerCase().includes(cleanQuery)) return true;
      if (p.nickname && removeTones(p.nickname).toLowerCase().includes(cleanQuery)) return true;
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

    const hpPct = (level * 0.5).toFixed(1);
    const atkPct = (level * 0.4).toFixed(1);
    const defPct = (level * 0.35).toFixed(2);

    const aliasesStr = (targetSpecies?.aliases || [petData.key]).join(", ");
    const desc = targetSpecies?.description || "*Linh thú huyền bí mang sức mạnh bổ trợ.*";
    const expStr = typeof neededExp === "number" && Number.isFinite(neededExp) ? `${currentExp}/${neededExp}` : "MAX";

    const embed = new EmbedBuilder()
      .setColor(isEquipped ? getRpgColor("accent") : getRpgColor("surface"))
      .setTitle(formatRpgTitle(`${petData.name}${isEquipped ? " • đang trang bị" : ""}`, petData.emoji))
      .setDescription(`*${desc}*`)
      .addFields(
        { name: "Cấp độ", value: `\`${level}\` • ${expStr} XP`, inline: true },
        { name: "Hạng", value: `${tierConfig.emoji} ${petData.tier}`, inline: true },
        { name: "Điểm hỗ trợ", value: `+${powerPoints.toLocaleString()}`, inline: true },
        { name: "HP", value: `+${hpVal} (+${hpPct}%)`, inline: true },
        { name: "ATK", value: `+${atkVal} (+${atkPct}%)`, inline: true },
        { name: "DEF", value: `+${defVal} (+${defPct}%)`, inline: true },
        { name: "Tên gọi khác", value: `\`${aliasesStr}\``, inline: true },
        { name: "Trạng thái", value: isOwned ? (isEquipped ? `${config.emoji.yes} Đang trang bị` : "Trong kho") : `${config.emoji.no} Chưa sở hữu`, inline: true }
      )
      .setFooter(formatRpgFooter("Linh thú • dùng xpet <tên> để xem chi tiết"));

    // Resolve and attach pet image for display at bottom of embed
    let petImageAttachment = null;
    let petImageUrl = null;

    const petKey = (petData.key || "").toLowerCase();
    const petKeyMap = {
      sabertiger: path.join(__dirname, "../../../assets/ranks/legendary/legendary_saber_tiger_fullbody.png"),
      mammoth: path.join(__dirname, "../../../assets/ranks/legendary/legendary_mammoth.png"),
      eagle: path.join(__dirname, "../../../assets/ranks/legendary/legendary_eagle_fullbody.png"),
      shark: path.join(__dirname, "../../../assets/ranks/legendary/legendary_shark.png"),
      snake: path.join(__dirname, "../../../assets/ranks/legendary/legendary_snake.png"),
    };

    if (petKeyMap[petKey] && fs.existsSync(petKeyMap[petKey])) {
      const localFile = petKeyMap[petKey];
      const fileName = path.basename(localFile);
      petImageAttachment = new AttachmentBuilder(localFile, { name: fileName });
      petImageUrl = `attachment://${fileName}`;
    } else if (petData.emoji && (petData.emoji.includes("<:") || petData.emoji.includes("<a:"))) {
      const match = petData.emoji.match(/<(a)?:[^:]+:(\d+)>/);
      if (match) {
        const isAnimated = Boolean(match[1]);
        const emojiId = match[2];
        petImageUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? "gif" : "png"}`;
      }
    } else if (petData.emoji) {
      const codePoints = [];
      for (const char of petData.emoji) {
        codePoints.push(char.codePointAt(0).toString(16));
      }
      const codePoint = codePoints.filter((cp) => cp !== "fe0f").join("-");
      if (codePoint) {
        petImageUrl = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${codePoint}.png`;
      }
    }

    if (petImageUrl) {
      embed.setImage(petImageUrl);
    }

    const payload = { embeds: [embed] };
    if (petImageAttachment) {
      payload.files = [petImageAttachment];
    }

    return message.channel.send(payload);
  }

  async showPetList(message, user) {
    const pets = user.rpg.pets || [];
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
