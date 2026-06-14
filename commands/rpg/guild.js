const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const RpgGuild = require("../../models/RpgGuild");
const { hasRpgCharacter, requireRpgCharacter } = require("../../utils/rpgUtil");
const { getUser } = require("../../utils/userUtil");
const config = require("../../data/config");

module.exports = {
  name: "guild",
  description: "Quản lý tổ đội RPG (tối đa 3 người)",
  usage: `${config.prefix}guild [@mention | leave | info]`,
  examples: [
    { intent: "Mời bạn bè vào guild/tạo guild", command: `${config.prefix}guild @User` },
    { intent: "Xem thông tin guild hiện tại", command: `${config.prefix}guild info` },
    { intent: "Rời khỏi guild hiện tại", command: `${config.prefix}guild leave` },
  ],
  async execute(message, args) {
    const userId = message.author.id;
    const arg = (args[0] || "").toLowerCase();

    // Check if user has RPG character
    const userDoc = await getUser(userId);
    const userHasChar = hasRpgCharacter(userDoc);
    if (!userHasChar) {
      return message.reply(`❌ Bạn cần tạo nhân vật RPG trước bằng lệnh \`${config.prefix}class\`.`);
    }

    if (arg === "leave") {
      const guild = await RpgGuild.findOne({ members: userId });
      if (!guild) {
        return message.reply("❌ Bạn không ở trong bất kỳ guild nào.");
      }

      if (guild.leaderId === userId) {
        // Disband guild
        await RpgGuild.deleteOne({ _id: guild._id });
        return message.reply("📢 Guild đã được giải tán vì Chủ guild rời đi.");
      } else {
        // Leave guild
        guild.members = guild.members.filter((id) => id !== userId);
        await guild.save();
        return message.reply("📢 Bạn đã rời khỏi guild thành công.");
      }
    }

    // Invite flow if user mentions someone
    const targetUser = message.mentions.users.first();
    if (targetUser) {
      const isAdmin = config.permissions?.dev_ids?.includes(userId) || userId === "745950731638407210" || userId === process.env.OWNER_ID;
      if (!isAdmin) {
        return message.reply("❌ Chỉ Admin mới có quyền tạo guild và mời người chơi khác gia nhập trong giai đoạn thử nghiệm.");
      }

      const targetId = targetUser.id;
      if (targetId === userId) {
        return message.reply("❌ Bạn không thể tự mời chính mình.");
      }

      const targetUserDoc = await getUser(targetId);
      const targetHasChar = hasRpgCharacter(targetUserDoc);
      if (!targetHasChar) {
        return message.reply("❌ Người được mời chưa có nhân vật RPG.");
      }

      // Find or create sender's guild
      let guild = await RpgGuild.findOne({ members: userId });
      if (guild && guild.leaderId !== userId) {
        return message.reply("❌ Chỉ Chủ guild mới có quyền mời thành viên mới.");
      }

      if (!guild) {
        // Create new guild with sender as leader
        guild = new RpgGuild({
          leaderId: userId,
          members: [userId],
          chapterProgress: 0,
        });
        await guild.save();
      }

      if (guild.members.length >= 3) {
        return message.reply("❌ Guild của bạn đã đạt số lượng tối đa (3 thành viên).");
      }

      // Check if target is already in a guild
      const targetGuild = await RpgGuild.findOne({ members: targetId });
      if (targetGuild) {
        return message.reply("❌ Người này đã tham gia một guild khác rồi.");
      }

      // Send invite message with buttons
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

      const inviteMsg = await message.reply({
        content: `⚔️ **Lời Mời Gia Nhập Guild** ⚔️\n<@${targetId}>, bạn đã được <@${userId}> mời gia nhập guild. Đồng ý tham gia chứ?`,
        components: [row],
      });

      const filter = (i) => i.user.id === targetId && i.customId.startsWith("rpg_guild_");
      const collector = inviteMsg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on("collect", async (i) => {
        const isAccept = i.customId.startsWith("rpg_guild_accept_");
        await i.deferUpdate();

        if (isAccept) {
          // Re-fetch guild to ensure it's not full
          const freshGuild = await RpgGuild.findById(guild._id);
          if (!freshGuild) {
            return i.editReply({ content: "❌ Lỗi: Guild không còn tồn tại.", components: [] });
          }
          if (freshGuild.members.length >= 3) {
            return i.editReply({ content: "❌ Lỗi: Guild đã đầy.", components: [] });
          }
          const freshTargetGuild = await RpgGuild.findOne({ members: targetId });
          if (freshTargetGuild) {
            return i.editReply({ content: "❌ Bạn đã gia nhập một guild khác.", components: [] });
          }

          freshGuild.members.push(targetId);
          await freshGuild.save();

          collector.stop("accepted");
          return inviteMsg.edit({
            content: `✅ <@${targetId}> đã đồng ý gia nhập guild của <@${userId}>! (Thành viên: ${freshGuild.members.length}/3)`,
            components: [],
          });
        } else {
          collector.stop("declined");
          return inviteMsg.edit({
            content: `❌ <@${targetId}> đã từ chối lời mời gia nhập guild.`,
            components: [],
          });
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason !== "accepted" && reason !== "declined") {
          inviteMsg.edit({
            content: "⏳ Lời mời gia nhập guild đã hết hạn.",
            components: [],
          }).catch(() => {});
        }
      });
      return;
    }

    // Default to show guild info
    const guild = await RpgGuild.findOne({ members: userId });
    if (!guild) {
      return message.reply(`❌ Bạn chưa tham gia guild nào. Hãy dùng lệnh \`${config.prefix}guild @User\` để mời người chơi khác và thành lập tổ đội!`);
    }

    const memberLines = guild.members.map((id, index) => {
      const role = id === guild.leaderId ? "👑 Chủ guild" : "🛡️ Thành viên";
      return `${index + 1}. <@${id}> - **${role}**`;
    }).join("\n");

    const embed = new EmbedBuilder()
      .setColor("#3498DB")
      .setTitle("🛡️ Thông Tin Guild RPG")
      .addFields(
        { name: "Thành viên", value: memberLines },
        { name: "Tiến trình Dungeon", value: `Đã hoàn thành **${guild.chapterProgress}/6** chương của Chapter 1` }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
