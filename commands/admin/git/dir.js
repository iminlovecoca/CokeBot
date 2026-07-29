const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const path = require("path");
const config = require("../../../data/config");
const { isDev, isAdmin } = require("../../../utils/userUtil");
const { initPage } = require("../../../utils/pageUtil");
const entries = [
  {
    type: "boss",
    name: "Skulgod (Chương 1)",
    image: "Skulgod.png",
    origin: "Từng là một hoàng đế vĩ đại thời viễn cổ, sau khi bị nguyền rủa bởi tà thuật hắc ám đã biến thành bộ xương khổng lồ canh giữ vùng biên giới hoang tàn.",
    power: "⚔️ **HP:** 150,000 (Phase 1) / 75,000 (Phase 2)\n⚔️ **ATK:** 250 (Phase 1) / 250 * 1.5 (Phase 2)\n🛡️ **Lời Nguyền Xương (Passive):** Có 40% cơ hội cấm dùng bình hồi máu trong 2 lượt (ở Phase 2).",
    tips: "Hãy mang theo **Paladin** để thanh tẩy hiệu ứng Cấm Hồi Máu đúng lúc hoặc chủ động sử dụng bình hồi máu trước khi Boss dùng kỹ năng."
  },
  {
    type: "boss",
    name: "Vaelmor (Chương 2)",
    image: "Vaelmor.png",
    origin: "Cổ thần tà ác ngủ say hàng vạn năm sâu dưới lòng đại dương độc hại, hơi thở của hắn có thể ăn mòn cả kim loại thần kỳ.",
    power: "⚔️ **HP:** 200,000 (Phase 1) / 100,000 (Phase 2)\n⚔️ **ATK:** 250 (Phase 1) / 250 * 1.8 (Phase 2)\n☣️ **Hơi Thở Kịch Độc (Passive):** Có 35% cơ hội phun độc diện rộng lên cả đội, rút máu 8% HP tối đa mỗi hiệp.",
    tips: "Đội hình cần **Paladin** thanh tẩy độc liên tục, dồn sát thương chí mạng thật nhanh trước khi độc rút sạch HP của toàn đội."
  },
  {
    type: "boss",
    name: "Mourngait (Chương 3)",
    image: "Mourngait.png",
    origin: "Hỏa thú cổ đại thoát ra từ dòng dung nham sâu nhất Trái Đất. Toàn thân bao bọc bởi ngọn lửa địa ngục hủy diệt vạn vật.",
    power: "⚔️ **HP:** 280,000 (Phase 1) / 140,000 (Phase 2)\n⚔️ **ATK:** 220 (Phase 1) / 220 * 1.6 (Phase 2)\n🔥 **Hắc Hỏa Phá Lệ:** Gây sát thương lửa bùng nổ diện rộng cực mạnh khi bước vào Phase 2.",
    tips: "Hãy tích lũy Nộ để **Paladin** hồi máu liên tục khi Boss chuẩn bị đổi sang Phase 2 nhằm giảm thiểu nguy cơ bị quét sạch."
  },
  {
    type: "boss",
    name: "Eldric (Chương 4)",
    image: "Eldric.png",
    origin: "Kẻ canh giữ lâu đài trọng lực lơ lửng giữa không trung. Hắn kiểm soát và bẻ cong không gian xung quanh để triệt tiêu mọi đòn tấn công.",
    power: "⚔️ **HP:** 360,000 (Phase 1) / 180,000 (Phase 2)\n⚔️ **ATK:** 380 (Phase 1) / 380 * 1.7 (Phase 2)\n🌀 **Trọng Lực Trị Trường:** Có 40% cơ hội né hoàn toàn các đòn tấn công tầm xa/phép thuật của người chơi.",
    tips: "Các class cận chiến (**Warrior**, **Assassin**) có tỷ lệ trúng cao hơn. Hãy tập trung dồn sát thương lớn nhất ngay khi Boss bị **Vỡ Poise**."
  },
  {
    type: "boss",
    name: "Boss TF (Chương 5)",
    image: "TF.png",
    origin: "Kẻ thao túng vận mệnh và là chúa tể của những trò chơi may rủi. Hắn thích đùa giỡn với sinh mạng của những kẻ xâm nhập bằng xúc sắc và đồng xu.",
    power: "⚔️ **HP:** 440,000 (Phase 1) / 220,000 (Phase 2)\n⚔️ **ATK:** 460 (Phase 1) / 460 * 1.5 (Phase 2)\n🎲 **Đổ Xúc Sắc:** Tự động kích hoạt ở hiệp 5 Phase 1.\n🪙 **Tung Đồng Xu:** Ở hiệp 3 Phase 2, bắt buộc đoán mặt đồng xu. Đoán sai cả đội sẽ bị quét sạch lập tức.",
    tips: "Thảo luận kỹ với đồng đội trước khi đưa ra quyết định chọn mặt đồng xu ở Phase 2."
  },
  {
    type: "boss",
    name: "Veilreaper (Chương 6)",
    image: "Veilreaper.png",
    origin: "Tử thần thực sự canh giữ ranh giới giữa sự sống và cái chết. Lưỡi hái của hắn gặt hái linh hồn của bất kỳ sinh vật nào dám đối đầu.",
    power: "⚔️ **HP:** 500,000 (Phase 1) / 250,000 (Phase 2)\n⚔️ **ATK:** 580 (Phase 1) / 580 * 2.0 (Phase 2)\n💀 **Màn Sương Hắc Hỏa:** Miễn giảm 40% sát thương từ các class tầm xa (**Archer**, **Mage**).\n☠️ **Khí Chất Tử Thần:** Tấn công AOE cực mạnh ở Phase 2.",
    tips: "Ưu tiên sử dụng các class cận chiến để gây sát thương tối đa. Cố gắng phá vỡ Poise thật nhanh để ngắt lượt và dồn sát thương x2."
  },
  {
    type: "weapon",
    name: "Hỏa Long Thần Kiếm",
    emoji: "<:firesword:1514232156279406682>",
    image: "firesword.png",
    origin: "Thanh thần kiếm được rèn từ vảy và hơi thở của Hỏa Long Thần cổ đại, mang sức mạnh rực cháy thiêu rụi mọi lớp phòng ngự.",
    power: "📈 **Tỷ lệ Scale:** STR (Chính), DEX (Phụ)\n🔥 **Đặc tính:** Tấn công vật lý cận chiến mạnh mẽ, phù hợp nhất với hệ Chiến Binh.",
    acquisition: "Nhận được từ phần thưởng vượt phó bản (First Clear) khi đánh bại Boss Skulgod ở Chương 1."
  },
  {
    type: "weapon",
    name: "Mộc Diệp Pháp Trượng",
    emoji: "<:greenstaff:1514232158502518945>",
    image: "greenstaff.png",
    origin: "Cây pháp trượng chế tác từ nhánh cây thế giới Yggdrasil cổ thụ, kết tinh của tinh hoa thiên nhiên và nguồn mana thuần khiết.",
    power: "📈 **Tỷ lệ Scale:** INT (Chính), ARC (Phụ)\n🌿 **Đặc tính:** Tăng mạnh sát thương phép thuật, bổ trợ Pháp Sư tối đa hóa lượng mana sử dụng.",
    acquisition: "Nhận được từ phần thưởng vượt phó bản (First Clear) khi đánh bại Boss Vaelmor ở Chương 2."
  },
  {
    type: "weapon",
    name: "Lam Tinh Thần Trượng",
    emoji: "<:bluestaff:1514232160897339442>",
    image: "bluestaff.png",
    origin: "Pháp trượng nạm tinh thể lam ngọc lấy từ sâu trong hang động băng vĩnh cửu, tỏa ra luồng hàn khí pháp thuật mạnh mẽ.",
    power: "📈 **Tỷ lệ Scale:** INT (Chính), ARC (Phụ)\n❄️ **Đặc tính:** Gia tăng mạnh sát thương ma thuật diện rộng, phù hợp hệ Pháp Sư.",
    acquisition: "Nhận được từ phần thưởng vượt phó bản (First Clear) khi đánh bại Boss Mourngait ở Chương 3."
  },
  {
    type: "weapon",
    name: "Cung Trọng Lực GravityBow",
    emoji: "<:GravityBow:1516389241347641415>",
    image: "GravityBow.png",
    origin: "Vũ khí thần bí được chế tạo từ mảnh vỡ lõi sao chổi trọng trường, có khả năng bóp méo không gian xung quanh mũi tên bắn ra.",
    power: "📈 **Tỷ lệ Scale:** DEX (S), ARC (S), INT (A)\n🌀 **Đặc tính:** Sát thương chí mạng siêu cao, bỏ qua một phần giáp của Boss, phù hợp Xạ Thủ/Sát Thủ.",
    acquisition: "Nhận được từ phần thưởng vượt phó bản (First Clear) khi đánh bại Boss Eldric ở Chương 4."
  },
  {
    type: "weapon",
    name: "Huyết Nguyệt Đoản Đao",
    emoji: "<:crimsondagger:1514232163158065252>",
    image: "crimsondagger.png",
    origin: "Cặp đoản đao rèn dưới ánh trăng máu của tế đàn cổ xưa, chứa đựng linh hồn khát máu đòi hỏi sự hi sinh của chủ nhân.",
    power: "📈 **Tỷ lệ Scale:** DEX (Chính), ARC (Phụ)\n🩸 **Nội tại [Huyết Sát]:** Hy sinh 15% HP bản thân để tăng thêm **1.36x** sát thương cho đòn đánh. Nếu tiêu diệt thành công Boss hoặc Quái, lượng HP hy sinh sẽ được hồi phục lại toàn bộ.",
    acquisition: "Nhận được từ phần thưởng vượt phó bản (First Clear) khi đánh bại Boss TF ở Chương 5."
  },
  {
    type: "weapon",
    name: "Ảnh Hồn Đoản Đao",
    emoji: "<:shadowdagger:1514232151766339635>",
    image: "shadowdagger.png",
    origin: "Đoản đao ẩn chứa sức mạnh bóng tối vô hình, được đồn đại là rèn từ chính cái bóng của thần chết Veilreaper.",
    power: "📈 **Tỷ lệ Scale:** DEX (Chính), ARC (Phụ)\n👁️ **Đặc tính:** Sát thương chí mạng cao, đòn đánh bỏ qua một lượng phòng thủ vật lý đáng kể, phù hợp hệ Sát Thủ.",
    acquisition: "Nhận được từ phần thưởng vượt phó bản (First Clear) khi đánh bại Boss Veilreaper ở Chương 6."
  },
  {
    type: "weapon",
    name: "Dusk and Dawn",
    emoji: "<:DuskandDawn:1517552769270153277>",
    image: "DuskandDawn.png",
    origin: "Cặp song kiếm song hành đại diện cho sự giao hòa giữa hoàng hôn và bình minh, ánh sáng và bóng tối.",
    power: "📈 **Tỷ lệ Scale:** INT (Chính), DEX (Phụ)\n✨ **Đặc tính:** Dung hợp hài hòa giữa ma pháp và khéo léo, phù hợp cho Pháp Sư hoặc Sát Thủ lai ma pháp.",
    acquisition: "Có tỷ lệ rơi ra cực kỳ hiếm từ các Rương báu phó bản (Dungeon Crate) từ Chương 5 trở lên."
  },
  {
    type: "weapon",
    name: "River of Blood",
    emoji: "<:RiverofBlood:1517552771824615424>",
    image: "RiverofBlood.png",
    origin: "Thanh katana bị nguyền rủa, hấp thụ máu của hàng ngàn kẻ bại trận khiến lưỡi kiếm nhuộm một màu đỏ thẫm kinh hoàng.",
    power: "📈 **Tỷ lệ Scale:** ARC (Chính), DEX (Phụ)\n🩸 **Đặc tính:** Đòn đánh cận chiến cực kỳ sắc bén, tăng mạnh khả năng gây chảy máu sâu (Bleed) cho mục tiêu.",
    acquisition: "Đánh bại Thế giới Boss (World Boss) cấp Thần trở lên để có cơ hội sở hữu."
  }
];
const BaseCommand = require("../../../core/BaseCommand");
class DirCommand extends BaseCommand {
  constructor() {
    super({
  name: "dir",
  aliases: ["tudien", "wiki", "dictionary"],
  description: "Tra cứu từ điển về Boss Dungeon và các Vũ khí Đặc biệt (Chỉ dành cho Admin).",
  usage: `${config.prefix}dir`,
  examples: [
    { intent: "Tra cứu từ điển", command: `${config.prefix}dir` }
  ],
        cooldown: 0
    });
  }
  async execute(message, args) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      return message.reply("❌ Lệnh này chỉ dành cho Admin / Developer!");
    }
    const totalPages = entries.length;
    const generateDisplay = (page) => {
      const entry = entries[page];
      const isBoss = entry.type === "boss";
      const embed = new EmbedBuilder()
        .setColor(isBoss ? "#e74c3c" : "#3498db")
        .setTitle(isBoss ? `👹 Từ Điển Boss - ${entry.name}` : `⚔️ Vũ Khí Đặc Biệt - ${entry.name}`)
        .setFooter({ text: `Trang ${page + 1}/${totalPages} | xdir` });
      let filePath = "";
      if (isBoss) {
        embed.addFields(
          { name: "📖 Nguồn gốc", value: entry.origin },
          { name: "⚡ Sức mạnh & Kỹ năng", value: entry.power },
          { name: "💡 Mẹo chiến đấu", value: entry.tips }
        );
        filePath = path.join(__dirname, "../../../assets/dungeons", entry.image);
      } else {
        embed.addFields(
          { name: "📖 Nguồn gốc", value: entry.origin },
          { name: "⚡ Sức mạnh & Nội tại", value: entry.power },
          { name: "🔑 Cách sở hữu", value: entry.acquisition }
        );
        filePath = path.join(__dirname, "../../../assets/items/Weapon", entry.image);
      }
      const attachment = new AttachmentBuilder(filePath, { name: entry.image });
      embed.setImage(`attachment://${entry.image}`);
      return { embeds: [embed], files: [attachment] };
    };
    await initPage(message, generateDisplay, totalPages, `${config.prefix}dir`);
    }
}
module.exports = new DirCommand();