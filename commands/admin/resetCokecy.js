const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const User = require("../../models/User");

const ALLOWED_IDS = [process.env.OWNER_ID];

const BaseCommand = require('../../core/BaseCommand');

class ResetCokecyCommand extends BaseCommand {
  constructor() {
    super({
  name: "resetcoke",
  description: "Reset coke về 0 cho 1 người hoặc tất cả",
        cooldown: 0
    });
  }

  async execute(message, args) {
    const authorId = message.author.id;
    if (!ALLOWED_IDS.includes(authorId)) {
      return message.reply("❌ Bạn không có quyền dùng lệnh này!");
    }

    if (!args[0]) {
      return message.reply(
        `❌ Cú pháp: \`${config.prefix}resetcoke all\` hoặc \`${config.prefix}resetcoke <@user|userId>\``,
      );
    }

    let targetUser = null;
    let resetAll = false;

    if (args[0].toLowerCase() === "all") {
      resetAll = true;
    } else {
      targetUser =
        message.mentions.users.first() ||
        (await message.client.users.fetch(args[0]).catch(() => null));

      if (!targetUser) {
        return message.reply("❌ Không tìm thấy user.");
      }
    }

    const embed = new EmbedBuilder()
      .setColor("#ffcc00")
      .setTitle("⚠️ Xác nhận reset coke")
      .setDescription(
        resetAll
          ? `Bạn sắp **reset toàn bộ coke của tất cả user về 0**.\n\n✅ Bấm **Xác nhận** để tiếp tục\n❎ Bấm **Hủy** để dừng lại`
          : `Bạn sắp **reset coke của ${targetUser} về 0**.\n\n✅ Bấm **Xác nhận** để tiếp tục\n❎ Bấm **Hủy** để dừng lại`,
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_resetcoke")
        .setLabel("✅ Xác nhận")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel_resetcoke")
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
      if (interaction.customId === "confirm_resetcoke") {
        if (resetAll) {
          await User.updateMany({}, { $set: { coke: 0 } });
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Thành công")
                .setDescription(
                  `Đã reset **toàn bộ coke của tất cả user** về 0.`,
                ),
            ],
            components: [],
          });
        } else {
          await User.updateOne(
            { userId: targetUser.id },
            { $set: { coke: 0 } },
            { upsert: true },
          );
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Thành công")
                .setDescription(`Đã reset coke của ${targetUser} về 0.`),
            ],
            components: [],
          });
        }
      } else if (interaction.customId === "cancel_resetcoke") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("❎ Đã hủy")
              .setDescription("Giao dịch reset coke đã bị hủy."),
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
    }
}

module.exports = new ResetCokecyCommand();
