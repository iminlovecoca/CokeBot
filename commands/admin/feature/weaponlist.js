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
    const { isDev } = require("../../../utils/userUtil");
    if (!isDev(message.author.id)) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }
    const getDungeonWeaponLine = (dw) => {
      let desc = "";
      if (dw.key === "shadowdagger") desc = "Giảm 30% giáp vật lý của boss/đối thủ vĩnh viễn (Đồng đội cùng hưởng)";
      else if (dw.key === "poisondagger") desc = "Tiêm kịch độc ăn mòn: gây độc 3 lượt và giảm 15% phòng ngự đối thủ";
      else if (dw.key === "firesword") desc = "Giảm 30% hồi máu của boss/đối thủ trong 2 lượt (30 giây đối với World Boss)";
      else if (dw.key === "greenstaff") desc = "Hồi 10% HP đã mất khi dùng kỹ năng (PvP/World Boss: 45% hồi 10% HP đã mất khi chém thường)";
      else if (dw.key === "bluestaff") desc = "Đòn đánh xuyên 25% kháng phép";
      else if (dw.key === "crimsondagger") desc = "Đòn đánh xuyên 50% giáp vật lý";
      else if (dw.key === "holysword") desc = "Đòn đánh thứ 3 gây gấp đôi (2.0x) sát thương";
      else if (dw.key === "darksword") desc = "Hắc khí gây thêm 15% sát thương bóng tối và làm suy yếu mục tiêu (giảm 20% sát thương gây ra trong 2 lượt)";
      else if (dw.key === "darkstaff") desc = "Áp dụng ngẫu nhiên hiệu ứng burn/weakness/pierce";
      else if (dw.key === "gravitybow") desc = "Lực bắn cực mạnh với hệ số Scale vượt trội DEX (S) | ARC (B) | INT (A) (Không có nội tại kích hoạt)";
      else if (dw.key === "axesnake") desc = "Phá 10% giáp vật lý của đối thủ mỗi khi tấn công hoặc dùng kỹ năng (Cộng dồn)";
      else if (dw.key === "sunbow") desc = "Đòn đánh xuyên 10% giáp vật lý và 10% kháng phép của đối thủ";
      else if (dw.key === "clawhex") desc = "Gây chảy máu khiến đối thủ chịu sát thương bằng 50% Str + 50% Dex mỗi lượt trong 3 lượt";
      else if (dw.key === "spearhex") desc = "Xuyên giáp bỏ qua 10% PR (phòng ngự vật lý) của đối thủ";
      else if (dw.key === "shieldhex") desc = "Hấp thụ sát thương trong 3 round, phản lại 90% sát thương đã nhận ở round 4";
      else if (dw.key === "riverofblood") desc = "Đòn đánh hồi phục HP cho bản thân bằng 2% sát thương gây ra";
      else if (dw.key === "duskanddawn") desc = "Tấn công thường chém vật lý/phép xen kẽ, 30% cơ hội tấn công thêm 1 lần trong lượt";
      else if (dw.key === "lunashard") desc = "Tăng 15% Crit Rate & 25% Crit Damage, 20% cơ hội xuyên 15% phòng thủ đối thủ | Scale: DEX (S) | ARC (A) | STR (B)";
      else if (dw.key === "eclipsesoul") desc = "Thiêu đốt làm giảm 15% sát thương đối thủ trong 2 lượt và gây thêm sát thương phép | Scale: INT (S) | ARC (A) | DEX (B)";
      else if (dw.key === "bladesorrow") desc = "Đòn đánh gây chảy máu 3 lượt và giảm 15% giáp mỗi lần kích hoạt (tối đa 30%) | Scale: STR (S) | DEX (A) | ARC (B)";
      else if (dw.key === "frostgauntlet") desc = "Khi nội tại kích hoạt, 30% cơ hội đóng băng đối thủ trong 1 lượt | Scale: INT (S) | ARC (A) | DEX (B)";
      else if (dw.key === "demonbook") desc = "Giải phóng ngẫu nhiên Thiêu Đốt, Hủ Bại hoặc Choáng | Scale: INT (S) | ARC (A)";
      else if (dw.key === "thorshammer") desc = "Thiên lôi giáng thế: làm Choáng 1 lượt và tăng 35% sát thương lôi điện | Scale: STR (S) | ARC (A)";
      else if (dw.key === "odinhammer") desc = "Cổ ngữ khải huyền: đòn đánh thứ 3 gây 1.75x sát thương và xuyên 50% kháng phép | Scale: INT (S) | ARC (A)";
      else if (dw.key === "asmodeus") desc = "Cuồng vọng bùng nổ: tăng 30% sát thương và phá 15% giáp mục tiêu trong 2 lượt";
      else if (dw.key === "satan") desc = "Hỏa ngục tận thế: thiêu đốt mục tiêu 3 lượt (theo STR), cấm hồi máu 2 lượt và tăng 10% sát thương";
      else if (dw.key === "greeddagger") desc = "Hút máu 8% sát thương gây ra; gây thêm 25% sát thương chí mạng khi mục tiêu dưới 50% HP";
      else if (dw.key === "beelzebub") desc = "Đàn ruồi hoại tử: ăn mòn 20% giáp & 20% kháng phép mục tiêu trong 2 lượt và hồi 5% HP tối đa";
      else if (dw.key === "fallenangel") desc = "Cố định giảm 12% sát thương nhận vào; khi tấn công tăng 20% sát thương và hồi phục 6% máu đã mất";
      else if (dw.key === "soulreaper") desc = "Gặt Hái Linh Hồn: cấm hồi máu 2 lượt; gây thêm 40% sát thương kết liễu và hồi phục HP khi mục tiêu dưới 35% HP | Scale: DEX (S) | ARC (S) | STR (C)";
      else if (dw.key === "darkhold") desc = "Trói Buộc Hư Vô: phá 25% kháng phép mục tiêu và giảm 15% sát thương nhận vào trong 2 lượt | Scale: INT (S) | ARC (B) | DEX (B)";
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
            `• **Dagger** (Mã: \`dagger\`) - <:dagger:1514231934191009853>\n` +
            `• **Búa Rèn** (Mã: \`warhammer\`) - 🔨 (Tiến hóa ở +10)`,
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
            `  \`${config.prefix}addgear @user weapon divine 50 1 10 holysword\`\n\n` +
            `**Tiến hóa Búa Rèn:** \`${config.prefix}evolveweapon [ID búa]\` (cần +10, Coke và Somber 9).`,
          inline: false,
        }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
}
module.exports = new WeaponlistCommand();
