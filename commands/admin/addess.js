const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../data/config");
const User = require("../../models/User");

module.exports = {
  name: "addess",
  aliases: ["addessence"],
  description: "Thêm Essence cho người dùng hoặc tất cả (chỉ admin/owner)",

  async execute(message, args) {
    const authorId = message.author.id;
    const isDev = config.permissions?.dev_ids?.includes(authorId) || authorId === "745950731638407210";
    const isAdmin = message.member?.permissions?.has("Administrator");
    if (!isDev && !isAdmin) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    const target = args[0];
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply(
        `❌ Cú pháp:\n\`${config.prefix}addess @user <số lượng>\` hoặc \`${config.prefix}addess all <số lượng>\``,
      );
    }

    let isAll = target.toLowerCase() === "all";
    let mention = null;
    if (!isAll) {
      mention =
        message.mentions.users.first() ||
        (await message.client.users.fetch(target).catch(() => null));
      if (!mention) return message.reply("❌ Không tìm thấy user.");
    }

    const embed = new EmbedBuilder()
      .setColor("#3498db")
      .setTitle("🌌 Xác nhận cộng Essence")
      .setDescription(
        isAll
          ? `${message.author}, bạn sắp cộng thêm **${amount.toLocaleString()} Essence** cho **toàn bộ user**.\n\n` +
              `✅ Bấm **Xác nhận** để tiếp tục\n❎ Bấm **Hủy** để dừng lại`
          : `${message.author}, bạn sắp cộng thêm **${amount.toLocaleString()} Essence** cho ${mention}.\n\n` +
              `✅ Bấm **Xác nhận** để tiếp tục\n❎ Bấm **Hủy** để dừng lại`,
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_add")
        .setLabel("✅ Xác nhận")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel_add")
        .setLabel("❎ Hủy")
        .setStyle(ButtonStyle.Danger),
    );

    const msg = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 15000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "confirm_add") {
        if (isAll) {
          // Update Mongoose records
          await User.updateMany(
            { "rpg.classKey": { $ne: null } },
            { 
              $inc: { 
                "rpg.autohunt.essence": amount,
                "rpg.autohunt.totalEssence": amount
              } 
            }
          );
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Thành công")
                .setDescription(
                  `Đã cộng thêm **${amount.toLocaleString()} Essence** cho toàn bộ user đã chọn class RPG.`,
                ),
            ],
            components: [],
          });
        } else {
          let user = await User.findOne({ userId: mention.id });
          if (!user) {
            return interaction.update({
              embeds: [
                new EmbedBuilder()
                  .setColor("Red")
                  .setTitle("❌ Thất bại")
                  .setDescription(`User ${mention} chưa có dữ liệu nhân vật RPG.`),
              ],
              components: [],
            });
          }

          if (!user.rpg.autohunt) {
            user.rpg.autohunt = {
              isActive: false,
              startTime: null,
              durationHours: 0,
              essence: 0,
              totalEssence: 0,
              captchaCode: null,
              pendingDuration: 0,
              levels: { efficiency: 1, duration: 1, cost: 1, gain: 1, experience: 1, radar: 1 },
              xp: { efficiency: 0, duration: 0, cost: 0, gain: 0, experience: 0, radar: 0 }
            };
          }

          user.rpg.autohunt.essence = (user.rpg.autohunt.essence || 0) + amount;
          user.rpg.autohunt.totalEssence = (user.rpg.autohunt.totalEssence || 0) + amount;
          user.markModified("rpg");
          await user.save();

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Thành công")
                .setDescription(
                  `Đã cộng **${amount.toLocaleString()} Essence** cho ${mention}.\n` +
                    `Số dư mới: **${user.rpg.autohunt.essence.toLocaleString()} Essence**`,
                ),
            ],
            components: [],
          });
        }
      } else if (interaction.customId === "cancel_add") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("❎ Đã hủy")
              .setDescription("Giao dịch cộng Essence đã bị hủy."),
          ],
          components: [],
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("Grey")
              .setTitle("⌛ Hết hạn")
              .setDescription("Không có phản hồi, giao dịch đã bị hủy."),
          ],
          components: [],
        });
      }
    });
  },
};
