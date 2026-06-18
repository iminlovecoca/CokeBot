const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Event = require("../../models/Event");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");

module.exports = {
  name: "delevent",
  aliases: ["deleteevent", "xoachuhien", "xóasựkiện"],
  description: "Xóa sự kiện đang diễn ra bằng giao diện nút bấm (Chỉ Admin)",
  usage: `${config.prefix}delevent`,
  async execute(message, args = []) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      return message.reply("❌ Bạn không có quyền sử dụng lệnh này!");
    }

    // Fetch active unexpired events
    const activeEvents = await Event.find({
      expiresAt: { $gt: new Date() },
      active: true
    }).sort({ createdAt: 1 });

    if (activeEvents.length === 0) {
      return message.reply("💡 Hiện không có sự kiện nào đang hoạt động để xóa.");
    }

    const buildEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor("#FF3333")
        .setTitle("🗑️ XÓA SỰ KIỆN ĐANG DIỄN RA")
        .setDescription("Chọn sự kiện dưới đây để xóa lập tức khỏi hệ thống.");

      let desc = "";
      activeEvents.forEach((ev, idx) => {
        desc += `**${idx + 1}. ${ev.name}**\n` +
                `▫️ ID: \`${ev._id}\`\n` +
                `▫️ Mô tả: *${ev.description}*\n\n`;
      });
      embed.setDescription(desc);
      return embed;
    };

    const buildComponents = () => {
      const row = new ActionRowBuilder();
      activeEvents.forEach((ev, idx) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`setevent_delete_${ev._id}`)
            .setLabel(`Xóa ${idx + 1} 🗑️`)
            .setStyle(ButtonStyle.Danger)
        );
      });
      return [row];
    };

    const replyMsg = await message.reply({
      embeds: [buildEmbed()],
      components: activeEvents.length <= 5 ? buildComponents() : []
    });

    if (activeEvents.length > 5) return;

    const collector = replyMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000 // 1 minute
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.customId.startsWith("setevent_delete_")) return;

      const eventId = interaction.customId.replace("setevent_delete_", "");
      const event = activeEvents.find(e => String(e._id) === eventId);
      if (!event) {
        return interaction.reply({ content: "❌ Không tìm thấy sự kiện này hoặc đã bị xóa trước đó.", flags: 64 });
      }

      await interaction.deferUpdate();

      // Delete from DB
      await Event.deleteOne({ _id: eventId });

      // Remove from memory list
      const index = activeEvents.indexOf(event);
      if (index > -1) {
        activeEvents.splice(index, 1);
      }

      // Re-render
      if (activeEvents.length === 0) {
        await replyMsg.edit({
          content: "❌ Tất cả sự kiện đã bị xóa.",
          embeds: [],
          components: []
        }).catch(() => null);
      } else {
        await replyMsg.edit({
          embeds: [buildEmbed()],
          components: buildComponents()
        }).catch(() => null);
      }

      await interaction.followUp({
        content: `🗑️ **Đã xóa thành công sự kiện:** \`${event.name}\``,
        flags: 64
      });
    });

    collector.on("end", () => {
      replyMsg.edit({ components: [] }).catch(() => null);
    });
  }
};
