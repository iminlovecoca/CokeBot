const { EmbedBuilder } = require("discord.js");
const config = require("../../../data/config");
const { dungeonWeapons } = require("../../../utils/rpgUtil");
const BaseCommand = require("../../../core/BaseCommand");
class WeaponlistCommand extends BaseCommand {
  constructor() {
    super({
      name: "weaponlist",
      aliases: ["wplist", "weapons"],
      description: "Xem danh sách và thông số các loại vũ khí.",
      usage: `${config.prefix}weaponlist`,
      cooldown: 0
    });
  }
  async execute(message, args) {
    const ownerId = "745950731638407210";
    if (message.author.id !== ownerId && !config.permissions.dev_ids.includes(message.author.id) && message.author.id !== process.env.OWNER_ID) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }
    const getDungeonWeaponLine = (dw) => {
      let desc = "";
      if (dw.key === "shadowdagger") desc = "Giảm 30% giáp vật lý của boss/đối thủ vĩnh viễn (Đồng đội cùng hưởng)";
      else if (dw.key === "poisondagger") desc = "Tăng 50% sát thương cho đòn tiếp theo";
      else if (dw.key === "firesword") desc = "Giảm 30% hồi máu của boss/đối thủ trong 2 lượt (30 giây đối với World Boss)";
      else if (dw.key === "greenstaff") desc = "Hồi 10% HP đã mất khi dùng kỹ năng (PvP/World Boss: 45% hồi 10% HP đã mất khi chém thường)";
      else if (dw.key === "bluestaff") desc = "Đòn đánh xuyên 25% kháng phép";
      else if (dw.key === "crimsondagger") desc = "Đòn đánh xuyên 50% giáp vật lý";
      else if (dw.key === "holysword") desc = "Đòn đánh thứ 3 gây gấp đôi (2.0x) sát thương";
      else if (dw.key === "darksword") desc = "Giảm 30% sát thương gây ra của boss/đối thủ lượt đó";
      else if (dw.key === "darkstaff") desc = "Áp dụng ngẫu nhiên hiệu ứng burn/weakness/pierce";
      else if (dw.key === "gravitybow") desc = "Lực bắn cực mạnh với hệ số Scale vượt trội DEX (S) | ARC (B) | INT (A) (Không có nội tại kích hoạt)";
      else if (dw.key === "axesnake") desc = "Phá 10% giáp vật lý của đối thủ mỗi khi tấn công hoặc dùng kỹ năng (Cộng dồn)";
      else if (dw.key === "sunbow") desc = "Đòn đánh xuyên 10% giáp vật lý và 10% kháng phép của đối thủ";
      else if (dw.key === "clawhex") desc = "Gây chảy máu khiến đối thủ chịu sát thương bằng 50% Str + 50% Dex mỗi lượt trong 3 lượt";
      else if (dw.key === "spearhex") desc = "Xuyên giáp bỏ qua 10% PR (phòng ngự vật lý) của đối thủ";
      else if (dw.key === "shieldhex") desc = "Hấp thụ sát thương trong 3 round, phản lại 90% sát thương đã nhận ở round 4";
      else if (dw.key === "riverofblood") desc = "Đòn đánh hồi phục HP cho bản thân bằng 2% sát thương gây ra";
      else if (dw.key === "duskanddawn") desc = "Tấn công thường chém vật lý/phép xen kẽ, 30% cơ hội tấn công thêm 1 lần trong lượt";
      return `• **${dw.name}** (Mã: \`${dw.key}\`) ${dw.emoji}\n  *Nội tại: ${desc}*`;
    };
    const dungeonWeaponsPart1 = dungeonWeapons.slice(0, 6).map(getDungeonWeaponLine).join("\n");
    const dungeonWeaponsPart2 = dungeonWeapons.slice(6, 12).map(getDungeonWeaponLine).join("\n");
    const eventWeaponsPart = dungeonWeapons.slice(12).map(getDungeonWeaponLine).join("\n");
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
          name: "4. Vũ Khí Sự Kiện Đặc Biệt (Event Weapons)",
          value: eventWeaponsPart,
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
}
module.exports = new WeaponlistCommand();