const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../data/config");
const User = require("../../models/User");
const Event = require("../../models/Event");
const { requireRpgCharacter, generateRpgGearDrop, addRpgGearToUser } = require("../../utils/rpgUtil");
const { getUser } = require("../../utils/userUtil");
const { DateTime } = require("luxon");

const getRequirementLabel = (req) => {
  if (!req) return "";
  const labels = {
    boss_fight: "Tham gia hạ gục Boss Thế Giới",
    boss_last_hit: "Dứt điểm Boss Thế Giới",
    rpg_top_leaderboard: "Đứng đầu BXH Lực chiến RPG",
    dungeon_win: req.chapter ? `Chiến thắng Dungeon Chương ${req.chapter}` : "Chiến thắng Dungeon",
    pvp_battle: "Thi đấu PvP",
    hunt_loot: "Loot đồ từ Hunt",
    exp_gain: "Nhận Exp RPG",
  };
  return labels[req.type] || req.type;
};

module.exports = {
  name: "event",
  aliases: ["events", "suhien", "sựkiện"],
  description: "Xem danh sách sự kiện đang diễn ra và nhận phần thưởng.",
  usage: `${config.prefix}event`,
  async execute(message, args = []) {
    const dbUser = await getUser(message.author.id);
    const memberName = message.member?.displayName || message.author.username;

    // Fetch active unexpired events
    const activeEvents = await Event.find({
      expiresAt: { $gt: new Date() },
      active: true
    }).sort({ createdAt: 1 });

    const topUser = await User.findOne({ "rpg.classKey": { $ne: null }, vipLevel: { $lte: 0 } }).sort({ "rpg.power": -1 });

    if (activeEvents.length === 0) {
      const embed = new EmbedBuilder()
        .setColor("#FFCC00")
        .setTitle("🎉 SỰ KIỆN ĐANG DIỄN RA")
        .setThumbnail("https://i.imgur.com/PZcZpZg.png")
        .setDescription("Hiện tại không có sự kiện nào đang diễn ra. Hãy theo dõi các kênh thông báo để cập nhật sự kiện mới nhé!");

      return message.reply({ embeds: [embed] });
    }

    const claimedEvents = dbUser?.rpg?.claimedEvents || [];

    const buildEmbed = (userObj) => {
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎉 Danh Sách Sự Kiện Đang Diễn Ra")
        .setThumbnail("https://i.imgur.com/PZcZpZg.png")
        .setTimestamp();

      let description = "";
      activeEvents.forEach((ev, idx) => {
        const hasClaimed = claimedEvents.includes(String(ev._id));
        const statusEmoji = hasClaimed ? "✅ (Đã nhận)" : "🎁 (Chưa nhận)";

        const tz = "Asia/Ho_Chi_Minh";
        const nowVn = DateTime.now().setZone(tz);
        const expiresVn = DateTime.fromJSDate(ev.expiresAt).setZone(tz);
        const diff = expiresVn.diff(nowVn, ["days", "hours", "minutes"]).toObject();

        let timeLeftStr = "";
        if (diff.days > 0) timeLeftStr += `${Math.floor(diff.days)} ngày `;
        if (diff.hours > 0) timeLeftStr += `${Math.floor(diff.hours)} giờ `;
        timeLeftStr += `${Math.floor(diff.minutes || 0)} phút`;

        let reqStr = "";
        if (ev.requirement && ev.requirement.type) {
          let progress = userObj?.rpg?.eventProgress?.[String(ev._id)] || 0;
          if (ev.requirement.type === "rpg_top_leaderboard") {
            const isTop = topUser && topUser.userId === userObj.userId;
            progress = isTop ? 1 : 0;
          }
          const target = ev.requirement.target || 1;
          const isDone = progress >= target ? "✨ Hoàn thành!" : `[${progress}/${target}]`;
          reqStr = `  ▫ \`Yêu cầu:\` **${isDone}** ${getRequirementLabel(ev.requirement)}\n`;
        }

        let rewardsStr = `  ▫ **Coke:** +${ev.rewards.coke.toLocaleString()} Coke ${config.emoji.money}`;
        if (ev.rewards.gear && ev.rewards.gear.name) {
          rewardsStr += `\n  ▫ **Trang bị:** [${ev.rewards.gear.rank}] ${ev.rewards.gear.name} (${ev.rewards.gear.type})`;
        }
        if (ev.rewards.other && ev.rewards.other.name) {
          rewardsStr += `\n  ▫ **Khác:** ${ev.rewards.other.name} x${ev.rewards.other.quantity}`;
        }

        description += `**${idx + 1}. ${ev.name}**\n` +
                       `*${ev.description}*\n` +
                       `  ▫ \`Trạng thái:\` **${statusEmoji}**\n` +
                       reqStr +
                       `  ▫ \`Thời gian còn lại:\` \`${timeLeftStr}\`\n` +
                       `  ▫ \`Phần thưởng:\` \n${rewardsStr}\n\n`;
      });

      embed.setDescription(description);
      return embed;
    };

    const buildComponents = (userObj) => {
      const row = new ActionRowBuilder();
      activeEvents.forEach((ev, idx) => {
        const hasClaimed = claimedEvents.includes(String(ev._id));
        let progress = userObj?.rpg?.eventProgress?.[String(ev._id)] || 0;
        if (ev.requirement?.type === "rpg_top_leaderboard") {
          const isTop = topUser && topUser.userId === userObj.userId;
          progress = isTop ? 1 : 0;
        }
        const target = ev.requirement?.target || 0;
        const isLocked = ev.requirement?.type && (progress < target);

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg_event_claim_${ev._id}`)
            .setLabel(`Nhận quà ${idx + 1} 🎁`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(hasClaimed || isLocked)
        );
      });
      return [row];
    };

    const replyMsg = await message.reply({
      embeds: [buildEmbed(dbUser)],
      components: activeEvents.length <= 5 ? buildComponents(dbUser) : [] // Discord allows max 5 buttons per row
    });

    if (activeEvents.length > 5) return;

    const collector = replyMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000 // 1 minute
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.customId.startsWith("rpg_event_claim_")) return;

      const eventId = interaction.customId.replace("rpg_event_claim_", "");
      const event = activeEvents.find(e => String(e._id) === eventId);
      if (!event) {
        return interaction.reply({ content: "❌ Không tìm thấy sự kiện này hoặc sự kiện đã kết thúc.", flags: 64 });
      }

      const freshUser = await getUser(message.author.id);
      if (!freshUser.rpg || !freshUser.rpg.classKey) {
        return interaction.reply({ content: "❌ Bạn phải tạo nhân vật RPG trước bằng lệnh `xclass`!", flags: 64 });
      }

      const userClaimed = freshUser.rpg.claimedEvents || [];
      if (userClaimed.includes(eventId)) {
        return interaction.reply({ content: "❌ Bạn đã nhận phần thưởng của sự kiện này rồi!", flags: 64 });
      }

      if (event.requirement && event.requirement.type) {
        let progress = freshUser.rpg.eventProgress?.[eventId] || 0;
        if (event.requirement.type === "rpg_top_leaderboard") {
          const topUserNow = await User.findOne({ "rpg.classKey": { $ne: null }, vipLevel: { $lte: 0 } }).sort({ "rpg.power": -1 });
          const isTop = topUserNow && topUserNow.userId === freshUser.userId;
          progress = isTop ? 1 : 0;
        }
        if (progress < event.requirement.target) {
          return interaction.reply({ content: "❌ Bạn chưa hoàn thành mục tiêu yêu cầu của sự kiện này!", flags: 64 });
        }
      }

      await interaction.deferUpdate();

      // Coke reward
      freshUser.coke = (freshUser.coke || 0) + event.rewards.coke;

      let gearLog = "";
      // Gear reward
      if (event.rewards.gear && event.rewards.gear.name) {
        const gear = await generateRpgGearDrop(freshUser, {
          forceDrop: true,
          slot: event.rewards.gear.type,
          rarity: event.rewards.gear.rank,
          level: freshUser.rpg.level || 1,
          upgradeLevel: 0,
          subType: event.rewards.gear.name,
        });

        if (gear) {
          addRpgGearToUser(freshUser, gear);
          freshUser.rpg.lastItemId = Math.max(freshUser.rpg.lastItemId || 0, gear.id);
          gearLog = `\n🎁 **Trang bị:** \`${gear.name} (${gear.rarity})\` (Slot: ${gear.slot})`;
        }
      }

      let otherLog = "";
      // Other reward
      if (event.rewards.other && event.rewards.other.name) {
        if (!freshUser.inventory) {
          freshUser.inventory = new Map();
        }
        const qty = event.rewards.other.quantity || 1;
        const currentQty = freshUser.inventory.get(event.rewards.other.name) || 0;
        freshUser.inventory.set(event.rewards.other.name, currentQty + qty);
        freshUser.markModified("inventory");
        otherLog = `\n🎁 **Vật phẩm:** \`${event.rewards.other.name}\` x${qty}`;
      }

      // Add to claimed events list
      freshUser.rpg.claimedEvents = userClaimed;
      freshUser.rpg.claimedEvents.push(eventId);
      freshUser.markModified("rpg");
      await freshUser.save();

      // Refresh list
      claimedEvents.push(eventId);
      await replyMsg.edit({
        embeds: [buildEmbed(freshUser)],
        components: buildComponents(freshUser)
      }).catch(() => null);

      await interaction.followUp({
        content: `🎉 **Nhận thưởng thành công sự kiện: ${event.name}!**\n` +
                 `🎁 **Coke:** +${event.rewards.coke.toLocaleString()} Coke ${config.emoji.money}` +
                 `${gearLog}${otherLog}`,
        flags: 64
      });
    });

    collector.on("end", () => {
      replyMsg.edit({ components: [] }).catch(() => null);
    });
  }
};
