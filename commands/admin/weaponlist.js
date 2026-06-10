const { EmbedBuilder } = require("discord.js");
const config = require("../../data/config");
const { dungeonWeapons } = require("../../utils/rpgUtil");

module.exports = {
  name: "weaponlist",
  aliases: ["weapons", "wlist"],
  description: "Xem danh sách các loại vũ khí và thông tin phím phụ để dùng lệnh addgear (Chỉ Dev/Owner)",
  usage: `${config.prefix}weaponlist`,

  async execute(message, args) {
    if (!config.permissions.dev_ids.includes(message.author.id) && message.author.id !== process.env.OWNER_ID) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    const getDungeonWeaponLine = (dw) => {
      let desc = "";
      if (dw.key === "shadowdagger") desc = "Giảm 30% giáp vật lý của boss/đối thủ vĩnh viễn (Đồng đội cùng hưởng)";
      else if (dw.key === "poisondagger") desc = "Tăng 50% sát thương cho đòn tiếp theo";
      else if (dw.key === "firesword") desc = "Giảm 50% hồi máu của boss/đối thủ vĩnh viễn";
      else if (dw.key === "greenstaff") desc = "Hồi phục HP bằng 25% sát thương gây ra";
      else if (dw.key === "bluestaff") desc = "Đòn đánh xuyên 50% kháng phép";
      else if (dw.key === "crimsondagger") desc = "Đòn đánh xuyên 50% giáp vật lý";
      else if (dw.key === "holysword") desc = "Đòn đánh thứ 3 gây gấp đôi (2.0x) sát thương";
      else if (dw.key === "darksword") desc = "Giảm 30% sát thương gây ra của boss/đối thủ lượt đó";
      else if (dw.key === "darkstaff") desc = "Áp dụng ngẫu nhiên hiệu ứng burn/weakness/pierce";
      
      return `• **${dw.name}** (Mã: \`${dw.key}\`) ${dw.emoji}\n  *Nội tại (Tỉ lệ 45%): ${desc}*`;
    };

    const dungeonWeaponsPart1 = dungeonWeapons.slice(0, 5).map(getDungeonWeaponLine).join("\n");
    const dungeonWeaponsPart2 = dungeonWeapons.slice(5).map(getDungeonWeaponLine).join("\n");

    const embed = new EmbedBuilder()
      .setColor("#3498DB")
      .setTitle("🗡️ Danh Sách Các Loại Vũ Khí RPG")
      .setDescription("Sử dụng mã phím phụ (key) bên dưới làm tham số `[subtype]` cho lệnh `addgear`.")
      .addFields(
        {
          name: "1. Vũ Khí Thường (Normal Weapons)",
          value:
            `• **Longsword** (Mã: \`longsword\` hoặc \`w\`) - <:longsword:1514231939865903104>\n` +
            `• **Staff** (Mã: \`staff\`) - <:staff:1514231936581898240>\n` +
            `• **Dagger** (Mã: \`dagger\`) - <:dagger:1514231934191009853>`,
          inline: false,
        },
        {
          name: "2. Vũ Khí Phụ Bản (Dungeon Weapons) - Phần 1",
          value: dungeonWeaponsPart1,
          inline: false,
        },
        {
          name: "3. Vũ Khí Phụ Bản (Dungeon Weapons) - Phần 2",
          value: dungeonWeaponsPart2,
          inline: false,
        },
        {
          name: "💡 Hướng dẫn Lệnh Add Gear",
          value:
            `Cú pháp: \`${config.prefix}addgear @user <slot> <rarity> <level> [số lượng] [cấp cường hóa] [subtype]\`\n\n` +
            `**Ví dụ:**\n` +
            `• Cấp Shadow Dagger Epic lv50 (+0 cường hóa):\n` +
            `  \`${config.prefix}addgear @user weapon epic 50 1 0 shadowdagger\`\n` +
            `• Cấp Holy Sword Thần Thánh (+10 cường hóa):\n` +
            `  \`${config.prefix}addgear @user weapon divine 50 1 10 holysword\``,
          inline: false,
        }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
