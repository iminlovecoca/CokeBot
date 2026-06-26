const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../data/config");
const gachaBanner = require("../../data/gachaBanner");
const {
  requireRpgCharacter,
  generateRpgGearDrop,
  addRpgGearToUser,
  getGearDisplayName,
  getItemImageFile,
} = require("../../utils/rpgUtil");
const { UserFriendlyError } = require("../../utils/errors");

module.exports = {
  name: "gacha",
  aliases: ["qc"],
  description: "Hệ thống Gacha vũ khí RPG với bảo hiểm.",
  usage: `${config.prefix}gacha wp <1 hoặc 10> [coke/souls]`,

  async execute(message, args) {
    const { isDev, isAdmin } = require("../../utils/userUtil");
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      return message.reply("❌ Tính năng Gacha hiện đang được bảo trì / khóa tạm thời và chỉ dành cho Admin.");
    }

    const subcommand = args[0]?.toLowerCase();

    // Route subcommand 'banner'
    if (subcommand === "banner") {
      const bannerCmd = require("./banner");
      return bannerCmd.execute(message, args.slice(1));
    }

    // Must be 'wp'
    if (subcommand !== "wp") {
      throw new UserFriendlyError(
        `❌ Lệnh hợp lệ:\n• \`${config.prefix}gacha wp <1 hoặc 10> [coke/souls]\` để quay gacha.\n• \`${config.prefix}gacha banner\` để xem thông tin banner.`
      );
    }

    const pullsInput = args[1];
    if (!pullsInput || (pullsInput !== "1" && pullsInput !== "10")) {
      throw new UserFriendlyError(`❌ Vui lòng chọn số lượt quay hợp lệ (1 hoặc 10).`);
    }
    const pulls = parseInt(pullsInput);

    // Require RPG Character
    const { user } = await requireRpgCharacter(message.author.id);

    // Ensure inventory is initialized
    if (!user.inventory) {
      user.inventory = new Map();
    }

    const currentSouls = user.inventory.get("souls") || 0;
    const currentCoke = user.coke || 0;

    let usedCoke = false;
    const costSouls = pulls === 1 ? 10 : 100;
    const costCoke = 1000000;

    // Check payment method input
    const currencyPref = args[2]?.toLowerCase();
    if (currencyPref === "coke") {
      if (pulls !== 10) {
        throw new UserFriendlyError("❌ Bạn chỉ có thể quay 10 lần bằng Coke!");
      }
      if (currentCoke < costCoke) {
        throw new UserFriendlyError(
          `❌ Bạn không đủ Coke! Cần **${costCoke.toLocaleString()} Coke** để quay 10 lần (bạn hiện có **${currentCoke.toLocaleString()}**).`
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
      // Auto-detect
      if (pulls === 1) {
        if (currentSouls < 10) {
          throw new UserFriendlyError(
            `❌ Bạn không đủ Linh Hồn <:souls:1518749776538243082>! Cần **10 Linh Hồn** để quay 1 lần (bạn hiện có **${currentSouls}**).`
          );
        }
        usedCoke = false;
      } else {
        // pulls === 10
        if (currentSouls >= 100) {
          usedCoke = false; // prioritize souls
        } else if (currentCoke >= costCoke) {
          usedCoke = true;
        } else {
          throw new UserFriendlyError(
            `❌ Bạn không đủ tài nguyên! Cần **100 Linh Hồn** <:souls:1518749776538243082> hoặc **1,000,000 Coke** để quay 10 lần.`
          );
        }
      }
    }

    // Load active banner
    const banner = gachaBanner;
    if (!banner || !banner.bannerName) {
      throw new UserFriendlyError("❌ Hiện không có banner gacha nào đang diễn ra.");
    }

    // Check banner expiration
    const { DateTime } = require("luxon");
    const timezone = config.rpg.boss?.spawn_timezone || "Asia/Ho_Chi_Minh";
    const expireDate = DateTime.fromISO(banner.expiresAt).setZone(timezone);
    const now = DateTime.now().setZone(timezone);
    if (expireDate < now) {
      throw new UserFriendlyError("❌ Banner gacha hiện tại đã kết thúc.");
    }

    // Deduct currency
    if (usedCoke) {
      user.coke -= costCoke;
    } else {
      user.inventory.set("souls", currentSouls - costSouls);
      user.markModified("inventory");
    }

    // Run Gacha Pull logic
    let pity = user.rpg.gachaWpPity || 0;
    let guaranteed = user.rpg.gachaWpGuaranteed || false;
    let hasGold = false;
    const itemsGained = [];
    const rollsLog = [];

    for (let i = 0; i < pulls; i++) {
      pity += 1;

      // Probability calculations
      let rate = 0.006; // 0.6% base
      if (pity >= 74 && pity < 90) {
        rate = 0.006 + (pity - 73) * 0.06;
      } else if (pity >= 90) {
        rate = 1.0; // Hard pity at 90
      }

      const roll = Math.random();
      if (roll < rate) {
        // GOLD DROP (Ô VÀNG)
        hasGold = true;
        pity = 0; // reset pity

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
          // Get featured banner weapon
          gear = await generateRpgGearDrop(user, {
            forceDrop: true,
            slot: "weapon",
            subType: banner.weaponName,
            rarity: banner.rarity,
            fromEvent: true,
          });

          if (gear) {
            addRpgGearToUser(user, gear);
            user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, gear.id);
            itemsGained.push(gear);
            rollsLog.push(`✨ **${getGearDisplayName(gear)}** (ID: \`${gear.id}\`) **[LIMITED]** 🎉`);
          }
        } else {
          // Lose 50/50: get standard Legendary or Mythic weapon
          const standardWeapons = [
            { name: "Longsword", emoji: "<:longsword:1514231939865903104>" },
            { name: "Staff", emoji: "<:staff:1514231936581898240>" },
            { name: "Dagger", emoji: "<:dagger:1514231934191009853>" },
          ];
          const chosenWp = standardWeapons[Math.floor(Math.random() * standardWeapons.length)];
          const chosenRarity = Math.random() < 0.5 ? "Legendary" : "Mythic";

          gear = await generateRpgGearDrop(user, {
            forceDrop: true,
            slot: "weapon",
            subType: chosenWp.name,
            rarity: chosenRarity,
          });

          if (gear) {
            addRpgGearToUser(user, gear);
            user.rpg.lastItemId = Math.max(user.rpg.lastItemId || 0, gear.id);
            itemsGained.push(gear);
            rollsLog.push(`🌟 **${getGearDisplayName(gear)}** (ID: \`${gear.id}\`) **[SPOIL]**`);
          }
        }
      } else {
        // STANDARD DROP (Common/Rare/Epic)
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

    // Save final stats to DB
    user.rpg.gachaWpPity = pity;
    user.rpg.gachaWpGuaranteed = guaranteed;
    user.markModified("rpg");
    await user.save();

    // Check if we won the limited weapon or any Ancient+ rarity weapon
    const gotSuccess = itemsGained.some(gear => {
      const isLimited = (gear.subType === banner.weaponName && gear.rarity === banner.rarity);
      const isAncientPlus = (gear.rarity === "Ancient" || gear.rarity === "Divine");
      return isLimited || isAncientPlus;
    });

    // Prepare Animation GIF URLs directly from Tenor
    const successGifUrl = "https://media1.tenor.com/m/GekirnE73xEAAAAC/gacha-pass.gif";
    const missGifUrl = "https://media1.tenor.com/m/6L7dsi-kFzAAAAAC/gacha-miss.gif";
    const gifUrl = gotSuccess ? successGifUrl : missGifUrl;

    const displayName = message.member?.displayName || message.author.username;
    const currencyName = usedCoke ? "coke" : "souls";
    const textAbove = `**${displayName}** sử dụng ${currencyName} để thử vận may ! UwU`;

    // Create reveal embed
    const revealEmbed = new EmbedBuilder()
      .setColor(gotSuccess ? "#FFD700" : "#99AAB5")
      .setDescription(textAbove)
      .setImage(gifUrl);

    // Send the GIF message
    const revealMsg = await message.reply({
      embeds: [revealEmbed],
    });

    // Wait 8 seconds for animation to complete
    setTimeout(async () => {
      // Delete the reveal GIF message
      await revealMsg.delete().catch(() => null);

      // Build the final result embed
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

      // Find the best weapon pulled to display its image
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
          const itemImagePath = path.join(__dirname, "../../assets/items", imgKey);
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
    }, 8000);
  },
};
