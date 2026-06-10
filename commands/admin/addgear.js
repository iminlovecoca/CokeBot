const { EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../data/config");
const { addRpgGearToUser, generateRpgGearDrop } = require("../../utils/rpgUtil");

// Define mapping tables for English and Vietnamese inputs
const slotMap = {
  // English
  "weapon": "weapon", "w": "weapon",
  "armor": "armor", "a": "armor",
  "helmet": "helmet", "h": "helmet",
  "boots": "boots", "b": "boots",
  "ring": "ring", "r": "ring",
  "necklace": "necklace", "n": "necklace",
  // Vietnamese
  "vukhi": "weapon", "vũ khí": "weapon",
  "giap": "armor", "giáp": "armor",
  "mu": "helmet", "mũ": "helmet",
  "giay": "boots", "giày": "boots",
  "nhan": "ring", "nhẫn": "ring",
  "daychuyen": "necklace", "dây chuyền": "necklace",
};

const rarityMap = {
  // English
  "common": "Common", "c": "Common",
  "rare": "Rare", "r": "Rare",
  "epic": "Epic", "e": "Epic",
  "legendary": "Legendary", "l": "Legendary",
  "mythic": "Mythic", "m": "Mythic",
  "ancient": "Ancient", "a": "Ancient",
  "divine": "Divine", "d": "Divine",
  // Vietnamese
  "thuong": "Common", "thường": "Common",
  "hiem": "Rare", "hiếm": "Rare",
  "suthi": "Epic", "sử thi": "Epic",
  "huyenthoai": "Legendary", "huyền thoại": "Legendary",
  "thanthoai": "Mythic", "thần thoại": "Mythic",
  "coai": "Ancient", "cổ đại": "Ancient",
  "thanthanh": "Divine", "thần thánh": "Divine",
};

const rarityEmoji = {
  Common: "<:Common:1390024590347997245>",
  Rare: "<:Rare:1390024624380706916>",
  Epic: "<:Epic:1390024749517770832>",
  Legendary: "<:Legendary:1390024772200567026>",
  Mythic: "<:Mythic:1390024789279772833>",
  Ancient: "<:Ancient:1390024806535004333>",
  Divine: "<:Divine:1512512382507683880>",
};

const rarityColor = {
  Common: "#95A5A6",
  Rare: "#3498DB",
  Epic: "#9B59B6",
  Legendary: "#F1C40F",
  Mythic: "#E67E22",
  Ancient: "#E74C3C",
  Divine: "#FFFFFF",
};

module.exports = {
  name: "addgear",
  aliases: ["givegear"],
  description: "Thêm trang bị RPG với slot, cấp bậc (rarity) và cấp độ (level) tùy chọn cho người chơi (Chỉ Dev/Owner)",
  usage: `${config.prefix}addgear @user <slot> <rarity> <level> [số lượng] [cấp cường hóa] [subtype]`,

  async execute(message, args) {
    if (!config.permissions.dev_ids.includes(message.author.id) && message.author.id !== process.env.OWNER_ID) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    const targetArg = args[0];
    if (!targetArg) {
      return message.reply(`❌ Cú pháp: \`${config.prefix}addgear @user <slot> <rarity> <level> [số lượng] [cấp cường hóa] [subtype]\``);
    }

    const mention = message.mentions.users.first() || await message.client.users.fetch(targetArg).catch(() => null);
    if (!mention) {
      return message.reply("❌ Không tìm thấy người dùng.");
    }

    const slotInput = args[1]?.toLowerCase();
    const slotKey = slotMap[slotInput];
    if (!slotKey) {
      return message.reply(
        `❌ Slot không hợp lệ. Các slot được hỗ trợ:\n` +
        `• Vũ khí: \`weapon\` (\`vukhi\`, \`w\`)\n` +
        `• Giáp: \`armor\` (\`giap\`, \`a\`)\n` +
        `• Mũ: \`helmet\` (\`mu\`, \`h\`)\n` +
        `• Giày: \`boots\` (\`giay\`, \`b\`)\n` +
        `• Nhẫn: \`ring\` (\`nhan\`, \`r\`)\n` +
        `• Dây chuyền: \`necklace\` (\`daychuyen\`, \`n\`)`
      );
    }

    const rarityInput = args[2]?.toLowerCase();
    const rarityKey = rarityMap[rarityInput];
    if (!rarityKey) {
      return message.reply(
        `❌ Độ hiếm (cấp bậc) không hợp lệ. Các độ hiếm hỗ trợ:\n` +
        `• \`Common\` (\`thuong\`, \`c\`)\n` +
        `• \`Rare\` (\`hiem\`, \`r\`)\n` +
        `• \`Epic\` (\`suthi\`, \`e\`)\n` +
        `• \`Legendary\` (\`huyenthoai\`, \`l\`)\n` +
        `• \`Mythic\` (\`thanthoai\`, \`m\`)\n` +
        `• \`Ancient\` (\`coai\`, \`a\`)\n` +
        `• \`Divine\` (\`thanthanh\`, \`d\`)`
      );
    }

    const levelInput = parseInt(args[3]);
    if (isNaN(levelInput) || levelInput <= 0) {
      return message.reply("❌ Cấp độ (level) phải là số nguyên dương.");
    }

    const quantity = parseInt(args[4]) || 1;
    if (quantity <= 0 || quantity > 20) {
      return message.reply("❌ Số lượng phải từ 1 đến 20.");
    }

    const upgradeLevelInput = args[5] ? parseInt(args[5]) : 0;
    if (isNaN(upgradeLevelInput) || upgradeLevelInput < 0 || upgradeLevelInput > 10) {
      return message.reply("❌ Cấp cường hóa (upgrade level) phải từ 0 đến 10.");
    }

    const subtypeInput = args[6] ? args.slice(6).join(" ") : null;

    const dbUser = await User.findOne({ userId: mention.id }) || await User.create({ userId: mention.id });

    // Check if target user has chosen an RPG class
    if (!dbUser.rpg || !dbUser.rpg.classKey) {
      return message.reply(`❌ Người dùng <@${mention.id}> chưa chọn Class RPG (chưa tạo nhân vật).`);
    }

    const addedGears = [];
    for (let i = 0; i < quantity; i++) {
      const gear = await generateRpgGearDrop(dbUser, {
        forceDrop: true,
        slot: slotKey,
        rarity: rarityKey,
        level: levelInput,
        upgradeLevel: upgradeLevelInput,
        subType: subtypeInput,
      });

      if (gear) {
        addRpgGearToUser(dbUser, gear);
        addedGears.push(gear);
        // Prevent duplicate IDs inside loop
        dbUser.rpg.lastItemId = Math.max(dbUser.rpg.lastItemId || 0, gear.id);
      }
    }

    await dbUser.save();

    const bracket = rarityEmoji[rarityKey] || "";
    const color = rarityColor[rarityKey] || "#3498db";
    const slotNames = config.rpg.gear_slot_names[slotKey] || slotKey;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎁 Đã thêm trang bị thành công`)
      .setDescription(
        `Đã thêm **${quantity}x** trang bị sau cho người chơi <@${mention.id}>:\n\n` +
        `• **Loại**: \`${slotNames}\`\n` +
        `• **Cấp bậc**: ${bracket} \`${rarityKey}\`\n` +
        `• **Cấp độ (Level)**: \`Lvl ${levelInput}\`\n` +
        `• **Lực chiến trung bình**: \`+${Math.floor(addedGears.reduce((acc, g) => acc + g.power, 0) / quantity).toLocaleString()}\`\n` +
        `• **ID Trang bị**: ${addedGears.map(g => `\`G${String(g.id).padStart(3, "0")}\``).join(", ")}`
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
