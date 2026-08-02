const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../../data/config");
const gachaBanner = require("../../../data/gachaBanner");
const {
  requireRpgCharacter,
  generateRpgGearDrop,
  addRpgGearToUser,
  getGearDisplayName,
  getItemImageFile,
} = require("../../../utils/rpgUtil");
const { UserFriendlyError } = require("../../../utils/errors");
class GachaCommand extends BaseCommand {
  constructor() {
    super({
      name: "gacha",
      aliases: ["qc"],
      description: "Hệ thống Gacha vũ khí RPG với bảo hiểm.",
      usage: `${config.prefix}gacha <1 hoặc 10> [coke/souls]`,
      cooldown: 0
    });
  }
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    if (subcommand === "banner") {
      const bannerCmd = require("./banner");
      return bannerCmd.execute(message, args.slice(1));
    }

    let pullsInput;
    let currencyPref;

    if (subcommand === "1" || subcommand === "10") {
      pullsInput = subcommand;
      currencyPref = args[1]?.toLowerCase();
    } else if (subcommand === "wp" || subcommand === "weapon") {
      pullsInput = args[1];
      currencyPref = args[2]?.toLowerCase();
    } else {
      throw new UserFriendlyError(
        `❌ Lệnh hợp lệ:\n• \`${config.prefix}gacha <1 hoặc 10> [coke/souls]\` (hoặc \`${config.prefix}gacha wp <1 hoặc 10>\`) để quay gacha vũ khí.\n• \`${config.prefix}gacha banner\` để xem thông tin banner.`
      );
    }

    if (!pullsInput || (pullsInput !== "1" && pullsInput !== "10")) {
      throw new UserFriendlyError(`❌ Vui lòng chọn số lượt quay hợp lệ (1 hoặc 10).`);
    }
    const pulls = parseInt(pullsInput);
    const { user } = await requireRpgCharacter(message.author.id);
    if (!user.inventory) {
      user.inventory = new Map();
    }
    const currentSouls = user.inventory.get("souls") || 0;
    const currentCoke = user.coke || 0;
    let usedCoke = false;
    const costSouls = pulls === 1 ? 10 : 100;
    const costCoke = pulls === 1 ? 100000 : 1000000;
    if (currencyPref === "coke") {
      if (currentCoke < costCoke) {
        throw new UserFriendlyError(
          `❌ Bạn không đủ Coke! Cần **${costCoke.toLocaleString()} Coke** để quay ${pulls} lần (bạn hiện có **${currentCoke.toLocaleString()}**).`
        );
      }
      usedCoke = true;
    } else if (currencyPref === "souls" || currencyPref === "soul") {
      if (currentSouls < costSouls) {
        throw new UserFriendlyError(
          `❌ Bạn không đủ Linh Hồn <:souls:1518749776538243082>! Cần **${costSouls} Linh Hồn** (bạn hiện có **${currentSouls}**).`
        );
      }
      usedCoke = false;
    } else {
      if (currentSouls >= costSouls) {
        usedCoke = false;
      } else if (currentCoke >= costCoke) {
        usedCoke = true;
      } else {
        throw new UserFriendlyError(
          `❌ Bạn không đủ tài nguyên! Cần **${costSouls} Linh Hồn** <:souls:1518749776538243082> hoặc **${costCoke.toLocaleString()} Coke** để quay ${pulls} lần.`
        );
      }
    }

    const featuredList = Array.isArray(gachaBanner.weapons) && gachaBanner.weapons.length > 0
      ? gachaBanner.weapons
      : (gachaBanner.weapon ? [gachaBanner.weapon] : []);

    if (featuredList.length === 0) {
      throw new UserFriendlyError("❌ Hiện không có banner gacha vũ khí đang diễn ra.");
    }

    const firstBanner = featuredList[0];
    const { DateTime } = require("luxon");
    const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
    const expireDate = DateTime.fromISO(firstBanner.expiresAt).setZone(timezone);
    const now = DateTime.now().setZone(timezone);
    if (expireDate < now) {
      throw new UserFriendlyError("❌ Banner gacha hiện tại đã kết thúc.");
    }

    if (usedCoke) {
      user.coke -= costCoke;
    } else {
      user.inventory.set("souls", currentSouls - costSouls);
      user.markModified("inventory");
    }

    const pityField = "gachaWpPity";
    const guaranteedField = "gachaWpGuaranteed";
    let pity = user.rpg[pityField] || 0;
    let guaranteed = user.rpg[guaranteedField] || false;
    let hasGold = false;
    const itemsGained = [];
    const rollsLog = [];

    for (let i = 0; i < pulls; i++) {
      pity += 1;
      let rate = 0.006;
      if (pity >= 74 && pity < 90) {
        rate = 0.006 + (pity - 73) * 0.06;
      } else if (pity >= 90) {
        rate = 1.0;
      }
      const roll = Math.random();
      if (roll < rate) {
        hasGold = true;
        pity = 0;
        let won5050 = false;
        if (guaranteed) {
          won5050 = true;
          guaranteed = false;
        } else {
          if (Math.random() < 0.5) {
            won5050 = true;
            guaranteed = false;
          } else {
            won5050 = false;
            guaranteed = true;
          }
        }
        let gear;
        if (won5050) {
          const chosenBanner = featuredList[Math.floor(Math.random() * featuredList.length)];
          gear = await generateRpgGearDrop(user, {
            forceDrop: true,
            slot: "weapon",
            subType: chosenBanner.weaponName,
            rarity: chosenBanner.rarity,
            emoji: chosenBanner.weaponEmoji,
            fromEvent: true,
          });
          if (gear) {
            addRpgGearToUser(user, gear);
            user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, gear.id);
            itemsGained.push(gear);
            rollsLog.push(`✨ **${getGearDisplayName(gear)}** (ID: \`${gear.id}\`) **[LIMITED]** 🎉`);
          }
        } else {
          const standardWeapons = [
            { name: "Longsword", emoji: "<:longsword:1514231939865903104>" },
            { name: "Staff", emoji: "<:staff:1514231936581898240>" },
            { name: "Dagger", emoji: "<:dagger:1514231934191009853>" },
          ];
          const chosenWp = standardWeapons[Math.floor(Math.random() * standardWeapons.length)];
          gear = await generateRpgGearDrop(user, {
            forceDrop: true,
            slot: "weapon",
            subType: chosenWp.name,
            rarity: "Ancient",
          });
          if (gear) {
            addRpgGearToUser(user, gear);
            user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, gear.id);
            itemsGained.push(gear);
            rollsLog.push(`🌟 **${getGearDisplayName(gear)}** (ID: \`${gear.id}\`) **[SPOIL]**`);
          }
        }
      } else {
        const gear = await generateRpgGearDrop(user, {
          forceDrop: true,
          slot: "weapon",
          allowedRarities: ["Common", "Rare", "Epic"],
        });
        if (gear) {
          addRpgGearToUser(user, gear);
          user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, gear.id);
          itemsGained.push(gear);
          rollsLog.push(`• ${getGearDisplayName(gear)} (ID: \`${gear.id}\`)`);
        }
      }
    }

    user.rpg[pityField] = pity;
    user.rpg[guaranteedField] = guaranteed;
    user.markModified("rpg");
    await user.save();

    const featuredNames = featuredList.map(b => b.weaponName);
    const gotSuccess = itemsGained.some(gear => {
      const isLimited = (featuredNames.includes(gear.subType) && gear.rarity === "Ancient");
      const isAncientPlus = (gear.rarity === "Ancient" || gear.rarity === "Divine");
      return isLimited || isAncientPlus;
    });

    const gifFileName = gotSuccess ? "Success.gif" : "Miss.gif";
    const gifPath = path.join(__dirname, "../../../assets/events", gifFileName);
    const displayName = message.member?.displayName || message.author.username;
    const currencyName = usedCoke ? "coke" : "souls";
    const textAbove = `**${displayName}** sử dụng ${currencyName} để thử vận may ! UwU`;

    const revealEmbed = new EmbedBuilder()
      .setColor(gotSuccess ? "#FFD700" : "#99AAB5")
      .setDescription(textAbove);

    const revealFiles = [];

    if (fs.existsSync(gifPath)) {
      const attachment = new AttachmentBuilder(gifPath, { name: "reveal.gif" });
      revealFiles.push(attachment);
      revealEmbed.setImage("attachment://reveal.gif");
    } else {
      const gifUrl = gotSuccess ? "https://files.catbox.moe/xxznmt.gif" : "https://files.catbox.moe/4ax8ij.gif";
      revealEmbed.setImage(gifUrl);
    }

    const revealPayload = { embeds: [revealEmbed] };
    if (revealFiles.length > 0) {
      revealPayload.files = revealFiles;
    }

    const revealMsg = await message.reply(revealPayload);

    setTimeout(async () => {
      await revealMsg.delete().catch(() => null);
      const resultEmbed = new EmbedBuilder()
        .setColor(gotSuccess ? "#FFD700" : "#99AAB5")
        .setTitle(gotSuccess ? "✨ KẾT QUẢ GACHA CỰC MAY MẮN! ✨" : " kết quả gacha vũ khí ")
        .setDescription(
          `👤 Người chơi: **${displayName}**\n` +
          `💰 Tiêu hao: **${pulls === 1 ? (usedCoke ? "100k" : "10 souls") : (usedCoke ? "1m coke" : "100 souls")}**\n\n` +
          rollsLog.join("\n")
        )
        .setTimestamp();

      const files = [];
      const rarityWeights = {
        Common: 1,
        Rare: 2,
        Epic: 3,
        Legendary: 4,
        Mythic: 5,
        Ancient: 6,
        Divine: 7,
      };
      const sortedGears = [...itemsGained].sort(
        (a, b) => (rarityWeights[b.rarity] || 0) - (rarityWeights[a.rarity] || 0)
      );
      const bestGear = sortedGears[0];
      if (bestGear) {
        const imgKey = bestGear.imageKey || getItemImageFile(bestGear);
        if (imgKey) {
          const itemImagePath = path.join(__dirname, "../../../assets/items", imgKey);
          if (fs.existsSync(itemImagePath)) {
            const itemAttachment = new AttachmentBuilder(itemImagePath, { name: "weapon.png" });
            files.push(itemAttachment);
            resultEmbed.setImage("attachment://weapon.png");
          }
        }
      }
      const payload = { embeds: [resultEmbed] };
      if (files.length > 0) {
        payload.files = files;
      }
      await message.reply(payload);
    }, 5500);
  }
}
module.exports = new GachaCommand();