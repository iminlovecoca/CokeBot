const { EmbedBuilder } = require("discord.js");
const User = require("../../../models/User");
const config = require("../../../data/config");
const {
  addRpgGearToUser,
  generateRpgGearDrop,
  calculateRpgPower,
  selectRpgClass,
  hasRpgCharacter,
  getGearDisplayName,
  revokeRpgGodset,
} = require("../../../utils/rpgUtil");
const dungeonWeapons = [
  { name: "Shadow Dagger", key: "shadowdagger" },
  { name: "Poison Dagger", key: "poisondagger" },
  { name: "Fire Sword", key: "firesword" },
  { name: "Green Staff", key: "greenstaff" },
  { name: "Blue Staff", key: "bluestaff" },
  { name: "Crimson Dagger", key: "crimsondagger" },
  { name: "Holy Sword", key: "holysword" },
  { name: "Dark Sword", key: "darksword" },
  { name: "Dark Staff", key: "darkstaff" },
  { name: "Axesnake", key: "axesnake" },
  { name: "Sun Bow", key: "sunbow" },
  { name: "Clawhex", key: "clawhex" },
  { name: "Spearhex", key: "spearhex" },
  { name: "Shieldhex", key: "shieldhex" }
];
const normalWeapons = ["Longsword", "Staff", "Dagger"];
const BaseCommand = require("../../../core/BaseCommand");
class AddgodsetCommand extends BaseCommand {
  constructor() {
    super({
  name: "addgodset",
  aliases: ["givegodset", "godset", "maxrpg"],
  description: "Cấp full set trang bị Divine +10 mạnh nhất và nâng cấp độ nhân vật lên 120 cho người chơi (Chỉ Dev/Owner)",
  usage: `${config.prefix}addgodset @user [tên vũ khí riêng (ví dụ: Shadow Dagger hoặc Fire Sword)] [số phút]`,
        cooldown: 0
    });
  }
  async execute(message, args) {
    const { isDev } = require("../../../utils/userUtil");
    if (!isDev(message.author.id)) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }
    if (args.length === 0) {
      return message.reply(`❌ Cú pháp: \`${config.prefix}addgodset @user [tên vũ khí riêng] [số phút]\` hoặc \`${config.prefix}addgodset remove @user\``);
    }
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
    if (!hasRpgCharacter(dbUser)) {
      await selectRpgClass(mention.id, "warrior");
      dbUser = await User.findOne({ userId: mention.id });
    }
    let durationMinutes = null;
    let isGodMode = false;
    const remainingArgs = [];
    for (let i = 1; i < args.length; i++) {
      const arg = args[i].trim();
      const lowerArg = arg.toLowerCase();
      if (/^\d+$/.test(arg)) {
        durationMinutes = parseInt(arg, 10);
      } else if (["god", "godmode", "onehit"].includes(lowerArg)) {
        isGodMode = true;
      } else {
        remainingArgs.push(arg);
      }
    }
    let expiresAt = null;
    if (durationMinutes !== null) {
      expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    }
    if (dbUser.rpg.godsetBackup) {
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
    dbUser.rpg.isGodMode = isGodMode;
    const inputWeapon = remainingArgs.join(" ").trim();
    let weaponSubtype = isGodMode ? "God Sword" : "Holy Sword"; 
    if (inputWeapon) {
      const cleanInput = inputWeapon.toLowerCase().replace(/\s+/g, "");
      let matched = dungeonWeapons.find(dw => 
        dw.key === cleanInput || 
        dw.name.toLowerCase().replace(/\s+/g, "") === cleanInput
      );
      if (!matched) {
        matched = dungeonWeapons.find(dw => 
          dw.name.toLowerCase().includes(inputWeapon.toLowerCase())
        );
      }
      if (matched) {
        weaponSubtype = matched.name;
      } else {
        const matchedNormal = normalWeapons.find(nw => 
          nw.toLowerCase().replace(/\s+/g, "") === cleanInput ||
          nw.toLowerCase().includes(inputWeapon.toLowerCase())
        );
        if (matchedNormal) {
          weaponSubtype = matchedNormal;
        } else {
          weaponSubtype = inputWeapon.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
      }
    }
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
        upgradeLevel: isWeapon ? 10 : 0, 
        subType: isWeapon ? weaponSubtype : null,
        fromAdmin: true,
      });
      if (gear) {
        gear.isGodset = true; 
        addRpgGearToUser(dbUser, gear);
        dbUser.rpg.equipped[slot] = gear.id;
        addedGears.push(gear);
        dbUser.rpg.lastItemId = Math.max(dbUser.rpg.lastItemId || 0, gear.id);
      }
    }
    dbUser.rpg.power = calculateRpgPower(dbUser);
    dbUser.markModified("rpg");
    await dbUser.save();
    if (durationMinutes !== null) {
      setTimeout(async () => {
        await revokeRpgGodset(mention.id, message.client);
      }, durationMinutes * 60 * 1000);
    }
    const durationText = durationMinutes !== null ? `trong **${durationMinutes} phút**` : "vĩnh viễn";
    const embed = new EmbedBuilder()
      .setColor("#FFFFFF")
      .setTitle(isGodMode ? "🔱 Đã Cấp God Set & Kích Hoạt Sức Mạnh Tối Cao" : "🔱 Đã Cấp God Set & Đạt Cấp 120 Thành Công")
      .setDescription(
        `Đã nâng cấp dữ liệu nhân vật RPG của <@${mention.id}> ${durationText}:\n\n` +
        `• **Cấp độ (Level)**: \`Level 120 (Transcendent)\`\n` +
        `• **Chỉ số gốc**: \`Vigor/PR/MR/STR/DEX/INT/ARC đều đạt 99 (MAX)\`\n` +
        `• **Lực chiến tổng**: \`+${Math.floor(dbUser.rpg.power).toLocaleString()}\`\n` +
        (isGodMode ? `• **Sức mạnh tối cao (God Mode)**: \`Kích hoạt (1 đòn đánh bất kỳ boss nào cũng sẽ chết)\`\n\n` : `\n`) +
        `**Các trang bị đã thêm & tự động mặc:**\n` +
        addedGears.map(g => `• ${getGearDisplayName(g)} (Lực chiến: \`+${g.power.toLocaleString()}\`, ID: \`G${String(g.id).padStart(3, "0")}\`)`).join("\n")
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
    }
}
module.exports = new AddgodsetCommand();