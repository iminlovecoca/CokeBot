const { EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../data/config");
const {
  addRpgGearToUser,
  generateRpgGearDrop,
  calculateRpgPower,
  selectRpgClass,
  hasRpgCharacter,
  getGearDisplayName,
  revokeRpgGodset,
} = require("../../utils/rpgUtil");

// Define weapon list for robust matching
const dungeonWeapons = [
  { name: "Shadow Dagger", key: "shadowdagger" },
  { name: "Poison Dagger", key: "poisondagger" },
  { name: "Fire Sword", key: "firesword" },
  { name: "Green Staff", key: "greenstaff" },
  { name: "Blue Staff", key: "bluestaff" },
  { name: "Crimson Dagger", key: "crimsondagger" },
  { name: "Holy Sword", key: "holysword" },
  { name: "Dark Sword", key: "darksword" },
  { name: "Dark Staff", key: "darkstaff" }
];
const normalWeapons = ["Longsword", "Staff", "Dagger"];

module.exports = {
  name: "addgodset",
  aliases: ["givegodset", "godset", "maxrpg"],
  description: "Cấp full set trang bị Divine +10 mạnh nhất và nâng cấp độ nhân vật lên 120 cho người chơi (Chỉ Dev/Owner)",
  usage: `${config.prefix}addgodset @user [tên vũ khí riêng (ví dụ: Shadow Dagger hoặc Fire Sword)] [số phút]`,

  async execute(message, args) {
    const ownerId = "745950731638407210";
    if (message.author.id !== ownerId && !config.permissions.dev_ids.includes(message.author.id)) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    if (args.length === 0) {
      return message.reply(`❌ Cú pháp: \`${config.prefix}addgodset @user [tên vũ khí riêng] [số phút]\` hoặc \`${config.prefix}addgodset remove @user\``);
    }

    // Check if it's a revoke command
    const isRevoke = args.some(arg => ["remove", "revoke", "clear"].includes(arg.toLowerCase()));
    if (isRevoke) {
      const cleanArgs = args.filter(arg => !["remove", "revoke", "clear"].includes(arg.toLowerCase()));
      const targetArg = cleanArgs[0];
      if (!targetArg) {
        return message.reply(`❌ Cú pháp thu hồi: \`${config.prefix}addgodset remove @user\``);
      }
      const mention = message.mentions.users.first() || await message.client.users.fetch(targetArg).catch(() => null);
      if (!mention) {
        return message.reply("❌ Không tìm thấy người dùng.");
      }

      const revoked = await revokeRpgGodset(mention.id, message.client);
      if (revoked) {
        return message.reply(`✅ | Đã thu hồi God Set và khôi phục trạng thái nhân vật RPG cho **${mention.username}**.`);
      } else {
        return message.reply(`❌ | Người dùng **${mention.username}** hiện không sử dụng God Set.`);
      }
    }

    const targetArg = args[0];
    const mention = message.mentions.users.first() || await message.client.users.fetch(targetArg).catch(() => null);
    if (!mention) {
      return message.reply("❌ Không tìm thấy người dùng.");
    }

    let dbUser = await User.findOne({ userId: mention.id }) || await User.create({ userId: mention.id });

    // Auto initialize character as Warrior if they don't have one
    if (!hasRpgCharacter(dbUser)) {
      await selectRpgClass(mention.id, "warrior");
      dbUser = await User.findOne({ userId: mention.id });
    }

    // Check for duration (last arg)
    let durationMinutes = null;
    const lastArg = args[args.length - 1];
    if (args.length >= 2 && /^\d+$/.test(lastArg)) {
      const parsedDuration = parseInt(lastArg, 10);
      if (!isNaN(parsedDuration) && parsedDuration > 0) {
        durationMinutes = parsedDuration;
        args.pop(); // remove duration from weapon subtype parsing
      }
    }

    // Create or update godset backup
    let expiresAt = null;
    if (durationMinutes !== null) {
      expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    }

    if (dbUser.rpg.godsetBackup) {
      // Clean up previous godset items
      dbUser.rpg.items = dbUser.rpg.items.filter(item => !item.isGodset);
      dbUser.rpg.godsetBackup.expiresAt = expiresAt;
    } else {
      dbUser.rpg.godsetBackup = {
        level: dbUser.rpg.level || 1,
        exp: dbUser.rpg.exp || 0,
        rank: dbUser.rpg.rank || "Novice",
        stats: dbUser.rpg.stats ? { ...dbUser.rpg.stats } : {},
        equipped: dbUser.rpg.equipped ? { ...dbUser.rpg.equipped } : {},
        expiresAt: expiresAt,
        appliedAt: new Date()
      };
    }

    // 1. Upgrade player character level to 120 (Transcendent) and set all stats to 99 (Max base)
    dbUser.rpg.level = 120;
    dbUser.rpg.exp = 0;
    dbUser.rpg.rank = "Transcendent";
    dbUser.rpg.stats = {
      vigor: 99,
      pr: 99,
      mr: 99,
      str: 99,
      dex: 99,
      int: 99,
      arc: 99
    };

    // 2. Parse and match weapon subtype
    const inputWeapon = args.slice(1).join(" ").trim();
    let weaponSubtype = "Holy Sword"; // default

    if (inputWeapon) {
      const cleanInput = inputWeapon.toLowerCase().replace(/\s+/g, "");
      
      // Try exact match on key or name without spaces
      let matched = dungeonWeapons.find(dw => 
        dw.key === cleanInput || 
        dw.name.toLowerCase().replace(/\s+/g, "") === cleanInput
      );
      
      // If not matched, try partial match on dungeon weapons
      if (!matched) {
        matched = dungeonWeapons.find(dw => 
          dw.name.toLowerCase().includes(inputWeapon.toLowerCase())
        );
      }
      
      if (matched) {
        weaponSubtype = matched.name;
      } else {
        // Try matching normal weapons
        const matchedNormal = normalWeapons.find(nw => 
          nw.toLowerCase().replace(/\s+/g, "") === cleanInput ||
          nw.toLowerCase().includes(inputWeapon.toLowerCase())
        );
        if (matchedNormal) {
          weaponSubtype = matchedNormal;
        } else {
          // If still not matched, use capitalized input
          weaponSubtype = inputWeapon.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
      }
    }

    // 3. Generate and equip a full set of Divine gear (Weapon is +10)
    const slots = ["weapon", "armor", "helmet", "boots", "ring", "necklace"];
    const rarity = "Divine";
    const level = 120;

    const addedGears = [];
    dbUser.rpg.equipped = dbUser.rpg.equipped || {};

    for (const slot of slots) {
      const isWeapon = slot === "weapon";
      const gear = await generateRpgGearDrop(dbUser, {
        forceDrop: true,
        slot,
        rarity,
        level,
        upgradeLevel: isWeapon ? 10 : 0, // weapons get upgraded to +10
        subType: isWeapon ? weaponSubtype : null,
      });

      if (gear) {
        gear.isGodset = true; // MARK GEAR AS GODSET
        addRpgGearToUser(dbUser, gear);
        dbUser.rpg.equipped[slot] = gear.id;
        addedGears.push(gear);
        // Prevent duplicate IDs inside loop
        dbUser.rpg.lastItemId = Math.max(dbUser.rpg.lastItemId || 0, gear.id);
      }
    }

    // Recalculate power
    dbUser.rpg.power = calculateRpgPower(dbUser);
    dbUser.markModified("rpg");
    await dbUser.save();

    // If duration is specified, set a timer to automatically revoke
    if (durationMinutes !== null) {
      setTimeout(async () => {
        await revokeRpgGodset(mention.id, message.client);
      }, durationMinutes * 60 * 1000);
    }

    const durationText = durationMinutes !== null ? `trong **${durationMinutes} phút**` : "vĩnh viễn";

    const embed = new EmbedBuilder()
      .setColor("#FFFFFF")
      .setTitle("🔱 Đã Cấp God Set & Đạt Cấp 120 Thành Công")
      .setDescription(
        `Đã nâng cấp dữ liệu nhân vật RPG của <@${mention.id}> ${durationText}:\n\n` +
        `• **Cấp độ (Level)**: \`Level 120 (Transcendent)\`\n` +
        `• **Chỉ số gốc**: \`Vigor/PR/MR/STR/DEX/INT/ARC đều đạt 99 (MAX)\`\n` +
        `• **Lực chiến tổng**: \`+${Math.floor(dbUser.rpg.power).toLocaleString()}\`\n\n` +
        `**Các trang bị đã thêm & tự động mặc:**\n` +
        addedGears.map(g => `• ${getGearDisplayName(g)} (Lực chiến: \`+${g.power.toLocaleString()}\`, ID: \`G${String(g.id).padStart(3, "0")}\`)`).join("\n")
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
