const BaseCommand = require('../../core/BaseCommand');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../data/config");
const {
  requireRpgCharacter,
  calculateRpgPower,
  getRpgClass,
} = require("../../utils/rpgUtil");

class NewGameCommand extends BaseCommand {
  constructor() {
    super({
      name: "newgame",
      aliases: ["resetrpg"],
      description: "Bắt đầu lại cuộc hành trình RPG từ Cấp 1, giữ nguyên toàn bộ trang bị hiện có.",
      usage: `${config.prefix}newgame`,
      examples: [
        { intent: "Chơi lại từ đầu", command: `${config.prefix}newgame` },
      ],
      cooldown: 5
    });
  }

  async execute(message, args = []) {
    let { user } = await requireRpgCharacter(message.author.id);

    const embed = new EmbedBuilder()
      .setColor("#E74C3C")
      .setTitle("⚠️ Xác Nhận Chơi Lại (New Game)")
      .setDescription(
        `Bạn có chắc chắn muốn bắt đầu lại hành trình RPG không?\n\n` +
        `• Cấp độ của bạn sẽ bị reset về **Level 1**.\n` +
        `• Chỉ số cộng thêm của bạn sẽ bị reset về **Chỉ số mặc định** của class.\n` +
        `• Điểm kinh nghiệm (EXP) reset về **0**.\n` +
        `• **GIỮ NGUYÊN** toàn bộ trang bị trong rương đồ và trang bị đang mặc trên người.\n\n` +
        `*Hành động này không thể hoàn tác!*`
      )
      .setFooter({ text: "Xác nhận trong vòng 30 giây." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("newgame_confirm")
        .setLabel("Xác nhận Reset")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("newgame_cancel")
        .setLabel("Hủy")
        .setStyle(ButtonStyle.Secondary)
    );

    const prompt = await message.reply({
      embeds: [embed],
      components: [row]
    });

    const collector = prompt.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 30000,
      max: 1
    });

    const userRepository = message.client.services.get('userRepository');

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "newgame_confirm") {
        const u = await userRepository.getOrCreate(message.author.id);
        const rpgClass = getRpgClass(u.rpg.classKey);

        u.rpg.level = 1;
        u.rpg.exp = 0;
        u.rpg.rank = "Novice";
        u.rpg.stats = { ...rpgClass.stats }; 
        u.rpg.claimedBossWeapons = []; 
        u.rpg.power = calculateRpgPower(u); 
        u.markModified("rpg");
        await u.save();

        await interaction.update({
          content: `🎉 Bạn đã reset nhân vật thành công! Cấp độ hiện tại: **Level 1**. Chúc bạn có một hành trình mới vui vẻ!`,
          embeds: [],
          components: []
        });
      } else {
        await interaction.update({
          content: `❌ Đã hủy yêu cầu reset nhân vật.`,
          embeds: [],
          components: []
        });
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await prompt.edit({
          content: `⌛ Yêu cầu reset nhân vật đã hết hạn.`,
          embeds: [],
          components: []
        }).catch(() => {});
      }
    });
  }
}

module.exports = new NewGameCommand();
