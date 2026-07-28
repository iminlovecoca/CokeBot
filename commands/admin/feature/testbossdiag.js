const path = require("path");
const fs = require("fs");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { isDev } = require("../../../utils/userUtil");
const config = require("../../../data/config");
const BaseCommand = require("../../../core/BaseCommand");
class TestbossdiagCommand extends BaseCommand {
  constructor() {
    super({
  name: "testbossdiag",
  description: "Kiểm thử hiệu ứng hội thoại của Boss Chương 6",
  usage: `${config.prefix}testbossdiag`,
        cooldown: 0
    });
  }
  async execute(message, args) {
    if (!isDev(message.author.id)) {
      return message.reply("❌ Bạn không có quyền sử dụng lệnh này!");
    }
    const dialogues = [
      {
        title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
        description: "*Ngọn lửa đen bùng lên dữ dội, thiêu rụi hoàn toàn phong ấn của Mourngait...*",
        delay: 4500
      },
      {
        title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
        description: "🗣️ **Mourngait** gầm lên điên cuồng:\n*\"Lũ sinh vật thấp kém... Các ngươi tưởng lửa đen phong ấn ta sao? Không, nó là để kiềm hãm sức mạnh của ta!\"*",
        delay: 6000
      },
      {
        title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
        description: "*Từ đống tro tàn hắc hỏa, một hình dạng thực sự đầy kinh hoàng bước ra...*",
        delay: 4500
      },
      {
        title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
        description: "🗣️ **Veilreaper** lạnh lùng cất giọng:\n*\"Ta sẽ cho ngươi thấy bản thân của người thấp kém đến thế nào trước Tử Thần...\"*",
        delay: 6000
      },
      {
        title: "🔥 BẢN THỂ TỬ THẦN HIỆN THẾ 🔥",
        description: "🗣️ *\"Chuẩn bị dâng hiến linh hồn đi!\"*",
        delay: 4000
      }
    ];
    message.reply("🎬 Bắt đầu chạy thử nghiệm hội thoại boss Chương 6...");
    const playDialogue = async (index) => {
      if (index >= dialogues.length) {
        return message.channel.send("🏁 Kết thúc chạy thử nghiệm hội thoại boss!");
      }
      const diag = dialogues[index];
      const introEmbed = new EmbedBuilder()
        .setColor("#000000")
        .setTitle(diag.title)
        .setDescription(diag.description)
        .setTimestamp();
      const eyesPath = path.join(__dirname, "../../assets/backgrounds/eyes.png");
      const files = [];
      if (fs.existsSync(eyesPath)) {
        files.push(new AttachmentBuilder(eyesPath, { name: "eyes.png" }));
        introEmbed.setImage("attachment://eyes.png");
      }
      const msg = await message.channel.send({ embeds: [introEmbed], files }).catch(() => null);
      setTimeout(async () => {
        if (msg) {
          await msg.delete().catch(() => {});
        }
        playDialogue(index + 1);
      }, diag.delay);
    };
    setTimeout(() => {
      playDialogue(0);
    }, 1500);
    }
}
module.exports = new TestbossdiagCommand();