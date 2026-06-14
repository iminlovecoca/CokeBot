const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const {
  requireRpgCharacter,
  calculateRpgPower,
  getRpgClass,
} = require("../../utils/rpgUtil");

module.exports = {
  name: "newgame",
  aliases: ["resetrpg"],
  description: "Bắt đầu lại cuộc hành trình RPG từ Cấp 1, giữ nguyên toàn bộ trang bị hiện có.",
  usage: `${config.prefix}newgame`,
  examples: [
    { intent: "Chơi lại từ đầu", command: `${config.prefix}newgame` },
  ],

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

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "newgame_confirm") {
        const u = await getUser(message.author.id);
        const rpgClass = getRpgClass(u.rpg.classKey);

        u.rpg.level = 1;
        u.rpg.exp = 0;
        u.rpg.rank = "Novice";
        u.rpg.stats = { ...rpgClass.stats }; // reset to base stats
        u.rpg.claimedBossWeapons = []; // reset claimed special boss weapons
        u.rpg.power = calculateRpgPower(u); // recalculate power based on current equipped gear and default stats
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
  },
};
