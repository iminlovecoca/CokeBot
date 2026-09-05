const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const RpgGuild = require("../../../models/RpgGuild");
const { hasRpgCharacter, requireRpgCharacter } = require("../../../utils/rpgUtil");
const { getUser } = require("../../../utils/userUtil");
const config = require("../../../data/config");
const { getRpgColor, formatRpgFooter, formatRpgTitle, safeDeferUpdate, safeInteractionEditReply } = require("../../../utils/rpgUi");
class PartyCommand extends BaseCommand {
  constructor() {
    super({
      name: "party",
      aliases: ["pt", "guild", "g", "todoi", "tổđội"],
      description: "Quản lý tổ đội RPG (tối đa 3 người)",
      usage: `${config.prefix}party [@mention | leave | info]`,
      examples: [
        { intent: "Mời bạn bè vào party/tạo party", command: `${config.prefix}party @User` },
        { intent: "Xem thông tin party hiện tại", command: `${config.prefix}party info` },
        { intent: "Rời khỏi party hiện tại", command: `${config.prefix}party leave` },
      ],
      cooldown: 0
    });
  }
  async execute(message, args) {
    const userId = message.author.id;
    const arg = (args[0] || "").toLowerCase();
    const userDoc = await getUser(userId);
    const userHasChar = hasRpgCharacter(userDoc);
    if (!userHasChar) {
      return message.reply(`❌ Bạn cần tạo nhân vật RPG trước bằng lệnh \`${config.prefix}class\`.`);
    }
    if (arg === "leave") {
      const guild = await RpgGuild.findOne({ members: userId });
      if (!guild) {
        return message.reply("❌ Bạn không ở trong bất kỳ party nào.");
      }
      if (guild.leaderId === userId) {
        await RpgGuild.deleteOne({ _id: guild._id });
        return message.reply("📢 Party đã được giải tán vì Trưởng nhóm rời đi.");
      } else {
        guild.members = guild.members.filter((id) => id !== userId);
        await guild.save();
        return message.reply("📢 Bạn đã rời khỏi party thành công.");
      }
    }
    const targetUser = message.mentions.users.first();
    if (targetUser) {
      const targetId = targetUser.id;
      if (targetId === userId) {
        return message.reply("❌ Bạn không thể tự mời chính mình.");
      }
      const targetUserDoc = await getUser(targetId);
      const targetHasChar = hasRpgCharacter(targetUserDoc);
      if (!targetHasChar) {
        return message.reply("❌ Người được mời chưa có nhân vật RPG.");
      }
      let guild = await RpgGuild.findOne({ members: userId });
      if (guild && guild.leaderId !== userId) {
        return message.reply("❌ Chỉ Trưởng nhóm mới có quyền mời thành viên mới.");
      }
      if (!guild) {
        guild = new RpgGuild({
          leaderId: userId,
          members: [userId],
          chapterProgress: 0,
        });
        await guild.save();
      }
      if (guild.members.length >= 3) {
        return message.reply("❌ Party của bạn đã đạt số lượng tối đa (3 thành viên).");
      }
      const targetGuild = await RpgGuild.findOne({ members: targetId });
      if (targetGuild) {
        return message.reply("❌ Người này đã tham gia một party khác rồi.");
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg_guild_accept_${guild._id}_${targetId}`)
          .setLabel("Đồng ý")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`rpg_guild_decline_${guild._id}_${targetId}`)
          .setLabel("Từ chối")
          .setStyle(ButtonStyle.Danger)
      );
      const inviteEmbed = new EmbedBuilder()
        .setColor(getRpgColor("info"))
        .setTitle(formatRpgTitle("Lời mời gia nhập tổ đội", "👥"))
        .setDescription(`<@${targetId}>, bạn được <@${userId}> mời tham gia tổ đội Dungeon.`)
        .addFields(
          { name: "👑 Trưởng nhóm", value: `<@${userId}>`, inline: true },
          { name: "Quy mô", value: `${guild.members.length}/3 thành viên`, inline: true },
        )
        .setFooter(formatRpgFooter("Lời mời có hiệu lực trong 60 giây"));
      const inviteMsg = await message.reply({
        content: `<@${targetId}>`,
        embeds: [inviteEmbed],
        components: [row],
      });
      const filter = (i) => i.user.id === targetId && i.customId.startsWith("rpg_guild_");
      const collector = inviteMsg.createMessageComponentCollector({ filter, time: 60000 });
      collector.on("collect", async (i) => {
        const isAccept = i.customId.startsWith("rpg_guild_accept_");
        if (!(await safeDeferUpdate(i))) return;
        if (isAccept) {
          const freshGuild = await RpgGuild.findById(guild._id);
          if (!freshGuild) {
            return safeInteractionEditReply(i, { content: "❌ Lỗi: Party không còn tồn tại.", components: [] });
          }
          if (freshGuild.members.length >= 3) {
            return safeInteractionEditReply(i, { content: "❌ Lỗi: Party đã đầy.", components: [] });
          }
          const freshTargetGuild = await RpgGuild.findOne({ members: targetId });
          if (freshTargetGuild) {
            return safeInteractionEditReply(i, { content: "❌ Bạn đã gia nhập một party khác.", components: [] });
          }
          freshGuild.members.push(targetId);
          await freshGuild.save();
          collector.stop("accepted");
          return inviteMsg.edit({
            content: `✅ <@${targetId}> đã đồng ý gia nhập party của <@${userId}>! (Thành viên: ${freshGuild.members.length}/3)`,
            components: [],
          }).catch(() => null);
        } else {
          collector.stop("declined");
          return inviteMsg.edit({
            content: `❌ <@${targetId}> đã từ chối lời mời gia nhập party.`,
            components: [],
          }).catch(() => null);
        }
      });
      collector.on("end", (collected, reason) => {
        if (reason !== "accepted" && reason !== "declined") {
          inviteMsg.edit({
            content: "⏳ Lời mời gia nhập party đã hết hạn.",
            components: [],
          }).catch(() => {});
        }
      });
      return;
    }
    const guild = await RpgGuild.findOne({ members: userId });
    if (!guild) {
      return message.reply(`❌ Bạn chưa tham gia party nào. Hãy dùng lệnh \`${config.prefix}party @User\` để mời người chơi khác và thành lập tổ đội!`);
    }
    const memberLines = guild.members.map((id, index) => {
      const role = id === guild.leaderId ? "👑 Trưởng nhóm" : "🛡️ Thành viên";
      return `${index + 1}. <@${id}> - **${role}**`;
    }).join("\n");
    const embed = new EmbedBuilder()
      .setColor(getRpgColor("info"))
      .setTitle(formatRpgTitle("Thông tin tổ đội RPG", "👥"))
      .setDescription("Tổ đội phối hợp để vượt qua Dungeon và mở khóa chương tiếp theo.")
      .addFields(
        { name: `Thành viên • ${guild.members.length}/3`, value: memberLines },
        { name: "Tiến trình Dungeon", value: `Đã hoàn thành **${guild.chapterProgress}/14** chương` }
      )
      .setFooter(formatRpgFooter(`Trưởng nhóm: <@${guild.leaderId}>`));
    return message.reply({ embeds: [embed] });
  }
}
module.exports = new PartyCommand();
