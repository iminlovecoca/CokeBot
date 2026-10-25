const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../../data/config");
const { requireRpgCharacter } = require("../../../utils/rpgUtil");
const {
  PET_STAT_ICONS,
  PET_TIERS,
  getPetBattleStats,
  generatePetStats,
  findPetSpecies,
} = require("../../../data/pets");
const { ZOO_RANKS } = require("../../../data/animals");
const { getXpRequired } = require("../../../utils/petXpUtil");
const { getRpgColor, formatRpgFooter } = require("../../../utils/rpgUi");
const zooCommand = require("../hunt/zoo");

class PetCommand extends BaseCommand {
  constructor() {
    super({
      name: "pet",
      aliases: ["pets", "p", "dex"],
      category: "rpg",
      description: "Xem sở thú (zoo) hoặc bảng Dex 6 chỉ số chi tiết của một Linh Thú.",
      usage: "xpet [tên_pet]",
    });
  }

  async execute(message, args = []) {
    const { user } = await requireRpgCharacter(message.author.id);
    // Sync any animals unlocked in user.zoo into user.rpg.pets
    if (user.zoo && typeof user.zoo === "object") {
      user.rpg.pets = user.rpg.pets || [];
      let synced = false;
      for (const [key, entry] of Object.entries(user.zoo)) {
        const isOwnedInZoo = typeof entry === "object" && entry !== null
          ? ((entry.totalCount || 0) > 0 || (entry.count || 0) > 0)
          : Number(entry) > 0;
        if (isOwnedInZoo && !user.rpg.pets.some((p) => p && p.key === key)) {
          const sp = findPetSpecies(key);
          if (sp) {
            user.rpg.pets.push({
              id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              key: sp.key,
              name: sp.name,
              nickname: sp.name,
              tier: sp.tier,
              emoji: sp.emoji,
              level: 1,
              exp: 0,
              stats: generatePetStats(sp),
              createdAt: new Date(),
            });
            synced = true;
          }
        }
      }
      if (synced) {
        user.markModified("rpg");
        await user.save().catch(() => {});
      }
    }

    const query = args.join(" ").trim();
    const lowerQuery = query.toLowerCase();
    const isZooFlag =
      !query ||
      lowerQuery === "all" ||
      lowerQuery === "display" ||
      lowerQuery === "-display" ||
      lowerQuery === "d" ||
      Boolean(message.mentions.users.first());

    if (!isZooFlag) {
      return this.showPetDetail(message, user, query);
    }
    return this.showPetList(message, user, args);
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

    const tierName = targetSpecies ? targetSpecies.tier : (ownedPet?.tier || "Common");
    const tierConfig = PET_TIERS[tierName] || PET_TIERS.Common;
    const zooRank = ZOO_RANKS[tierName] || ZOO_RANKS.Common;

    const petData = ownedPet || {
      id: "preview",
      key: targetSpecies.key,
      name: targetSpecies.name,
      nickname: targetSpecies.name,
      tier: tierName,
      emoji: targetSpecies.emoji,
      level: 1,
      exp: 0,
      stats: generatePetStats(targetSpecies),
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
    const expStr = typeof neededExp === "number" && Number.isFinite(neededExp) ? `${currentExp}/${neededExp}` : "MAX";

    // Zoo counts (current / total caught)
    const zooEntry = user.zoo?.[petData.key];
    const currentCount = typeof zooEntry === "object" && zooEntry !== null
      ? (zooEntry.count ?? 0)
      : (Number(zooEntry) || (isOwned ? 1 : 0));
    const totalCount = typeof zooEntry === "object" && zooEntry !== null
      ? (zooEntry.totalCount ?? currentCount)
      : currentCount;

    // 6 Battle Stats (0 - 19 points) & scaled combat stats
    const { points: bStats, role, scaled } = getPetBattleStats(targetSpecies || petData, level);

    const aliasesStr = (targetSpecies?.aliases || [petData.key]).join(", ");
    const desc = targetSpecies?.description || "Linh thú huyền bí mang sức mạnh bổ trợ.";

    const statIcons = {
      hp: config.emoji?.petStats?.hp || PET_STAT_ICONS.hp,
      att: config.emoji?.petStats?.att || PET_STAT_ICONS.att,
      pr: config.emoji?.petStats?.pr || PET_STAT_ICONS.pr,
      wp: config.emoji?.petStats?.wp || PET_STAT_ICONS.wp,
      mag: config.emoji?.petStats?.mag || PET_STAT_ICONS.mag,
      mr: config.emoji?.petStats?.mr || PET_STAT_ICONS.mr,
    };

    const dexLines = [
      `*${desc}*`,
      "",
      `**Count:** ${currentCount}/${totalCount}`,
      `**Rank:** ${zooRank.emoji || tierConfig.emoji} ${tierName.toLowerCase()}`,
      `**Role:** ${role} *(Lv.${level} • ${expStr} XP)*`,
      `**Alias:** ${aliasesStr}`,
      `**Points:** ${(zooRank.points || tierConfig.points || 1).toLocaleString()}`,
      `**Sell:** ${(zooRank.price || 80).toLocaleString()} Coke`,
      `**Sacrifice:** ${(zooRank.essence || 5).toLocaleString()} Essence`,
      `${statIcons.hp} \`${bStats.hp}\` ${statIcons.att} \`${bStats.att}\` ${statIcons.pr} \`${bStats.pr}\``,
      `${statIcons.wp} \`${bStats.wp}\` ${statIcons.mag} \`${bStats.mag}\` ${statIcons.mr} \`${bStats.mr}\``,
    ];

    const embed = new EmbedBuilder()
      .setColor(isEquipped ? getRpgColor("accent") : 0x3b82f6)
      .setTitle(`${petData.emoji} ${petData.name}${isEquipped ? " • Đang trang bị" : ""}`)
      .setDescription(dexLines.join("\n"))
      .addFields({
        name: `Chỉ số thực chiến (Lv.${level})`,
        value: `\`HP: ${scaled.maxHp}\` • \`WP: ${scaled.maxWp}\` • \`ATT: ${scaled.physAtk}\` • \`MAG: ${scaled.magAtk}\` • \`PR: ${scaled.physResPct}%\` • \`MR: ${scaled.magResPct}%\``,
        inline: false,
      })
      .setFooter(formatRpgFooter("Dex Linh Thú • Dùng xaddpet <tên> để trang bị"));

    // Resolve and attach pet image as top-right thumbnail (matching Dex card layout)
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
      embed.setThumbnail(petImageUrl);
    }

    const payload = { embeds: [embed] };
    if (petImageAttachment) {
      payload.files = [petImageAttachment];
    }

    return message.channel.send(payload);
  }

  async showPetList(message, _user, args = []) {
    return zooCommand.execute(message, args);
  }
}

module.exports = new PetCommand();
