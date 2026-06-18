const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Event = require("../../models/Event");
const { isDev, isAdmin } = require("../../utils/userUtil");
const config = require("../../data/config");
const { DateTime } = require("luxon");

module.exports = {
  name: "setevent",
  description: "Thiết lập một sự kiện RPG mới bằng giao diện Dialog/Modal (Chỉ Admin)",
  usage: `${config.prefix}setevent`,
  async execute(message, args = []) {
    if (!isDev(message.author.id) && !isAdmin(message.author.id)) {
      return message.reply("❌ Bạn không có quyền sử dụng lệnh này!");
    }

    let selectedWeapon = "none";
    let selectedRank = "Epic";
    let eventInfo = null;

    const generatePanelEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor("#3498DB")
        .setTitle("⚙️ THIẾT LẬP SỰ KIỆN RPG")
        .setDescription(
          "Hãy sử dụng menu chọn vũ khí bên dưới và nút **Nhập Thông Tin** để cấu hình sự kiện."
        )
        .addFields(
          {
            name: "🗡️ Vũ khí phần thưởng:",
            value: selectedWeapon === "none" ? "*Không thưởng vũ khí*" : `\`[${selectedRank.toUpperCase()}] ${selectedWeapon.toUpperCase()}\``,
            inline: true,
          }
        );

      if (eventInfo) {
        let reqDisplay = "Không yêu cầu (Nhận ngay)";
        if (eventInfo.requirementType) {
          const reqLabels = {
            boss_fight: "Tham gia đánh Boss Thế Giới",
            boss_last_hit: "Dứt điểm Boss Thế Giới",
            rpg_top_leaderboard: "Đứng đầu BXH Lực chiến RPG",
            dungeon_win: `Chiến thắng Dungeon Chương ${eventInfo.requirementChapter || ""}`,
          };
          reqDisplay = `Đạt **${eventInfo.requirementTarget}** lần **${reqLabels[eventInfo.requirementType] || eventInfo.requirementType}**`;
        }

        embed.addFields(
          { name: "📝 Tên sự kiện", value: eventInfo.name, inline: false },
          { name: "📖 Mô tả", value: eventInfo.description, inline: false },
          { name: "⏰ Hết hạn lúc", value: `<t:${Math.floor(eventInfo.expiresAt.getTime() / 1000)}:F>`, inline: false },
          { name: "🎯 Yêu cầu", value: reqDisplay, inline: true },
          {
            name: "🎁 Phần thưởng khác",
            value: `▫️ Coke: +${eventInfo.coke.toLocaleString()} Coke\n` +
                   (eventInfo.otherItem ? `▫️ Vật phẩm: \`${eventInfo.otherItem}\` x${eventInfo.otherQty}\n` : "") +
                   (selectedWeapon !== "none" ? `▫️ Bậc vũ khí: \`${eventInfo.weaponRank || selectedRank}\`` : ""),
            inline: false
          }
        );
      } else {
        embed.addFields({ name: "📝 Thông tin sự kiện", value: "*Chưa nhập*", inline: false });
      }

      return embed;
    };

    const generatePanelComponents = () => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("setevent_select_weapon")
        .setPlaceholder("Chọn vũ khí thưởng (Không bắt buộc)...")
        .addOptions([
          { label: "Không thưởng vũ khí", value: "none", description: "Bỏ chọn vũ khí phần thưởng." },
          { label: "Longsword", value: "longsword", description: "Vũ khí thường (Chiến binh)" },
          { label: "Staff", value: "staff", description: "Pháp trượng thường (Pháp sư)" },
          { label: "Dagger", value: "dagger", description: "Đoản đao thường (Sát thủ)" },
          { label: "Shadow Dagger", value: "shadowdagger", description: "Ảnh Hồn Đoản Đao (Ancient)" },
          { label: "Poison Dagger", value: "poisondagger", description: "Kịch Độc Đoản Đao" },
          { label: "Firesword", value: "firesword", description: "Hỏa Long Thần Kiếm (Ancient)" },
          { label: "Green Staff", value: "greenstaff", description: "Mộc Diệp Pháp Trượng (Ancient)" },
          { label: "Blue Staff", value: "bluestaff", description: "Lam Tinh Thần Trượng (Ancient)" },
          { label: "Crimson Dagger", value: "crimsondagger", description: "Huyết Nguyệt Đoản Đao (Ancient)" },
          { label: "Holy Sword", value: "holysword", description: "Thánh Kiếm Hoàng Kim" },
          { label: "Dark Sword", value: "darksword", description: "Hắc Diệu Ma Kiếm" },
          { label: "Dark Staff", value: "darkstaff", description: "Hắc Diệu Ma Trượng" },
          { label: "Gravity Bow", value: "gravitybow", description: "Cung Trọng Lực (Ancient)" }
        ]);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const rankSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("setevent_select_rank")
        .setPlaceholder(`Chọn bậc vũ khí (Hiện tại: ${selectedRank})...`)
        .addOptions([
          { label: "Common", value: "Common", description: "Bậc Thường" },
          { label: "Rare", value: "Rare", description: "Bậc Hiếm" },
          { label: "Epic", value: "Epic", description: "Bậc Sử Thi" },
          { label: "Legendary", value: "Legendary", description: "Bậc Truyền Thuyết" },
          { label: "Mythic", value: "Mythic", description: "Bậc Thần Thoại" },
          { label: "Ancient", value: "Ancient", description: "Bậc Cổ Đại" },
          { label: "Divine", value: "Divine", description: "Bậc Thần Thánh" }
        ]);

      const rankRow = new ActionRowBuilder().addComponents(rankSelectMenu);

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("setevent_btn_open_modal")
          .setLabel("Nhập Thông Tin 📝")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("setevent_btn_create")
          .setLabel("Tạo Sự Kiện 🎉")
          .setStyle(ButtonStyle.Success)
          .setDisabled(!eventInfo),
        new ButtonBuilder()
          .setCustomId("setevent_btn_cancel")
          .setLabel("Hủy ❌")
          .setStyle(ButtonStyle.Secondary)
      );

      return [selectRow, rankRow, btnRow];
    };

    const panelMsg = await message.reply({
      embeds: [generatePanelEmbed()],
      components: generatePanelComponents()
    });

    const collector = panelMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000 // 5 minutes
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "setevent_select_weapon") {
        selectedWeapon = interaction.values[0];
        await interaction.update({
          embeds: [generatePanelEmbed()],
          components: generatePanelComponents()
        }).catch(() => null);

      } else if (interaction.customId === "setevent_select_rank") {
        selectedRank = interaction.values[0];
        if (eventInfo) {
          eventInfo.weaponRank = selectedRank;
        }
        await interaction.update({
          embeds: [generatePanelEmbed()],
          components: generatePanelComponents()
        }).catch(() => null);

      } else if (interaction.customId === "setevent_btn_open_modal") {
        const modal = new ModalBuilder()
          .setCustomId("setevent_input_modal")
          .setTitle("Cấu hình Sự Kiện RPG");

        const nameInput = new TextInputBuilder()
          .setCustomId("event_name")
          .setLabel("Tên sự kiện:")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ví dụ: Sự Kiện Sát Thần")
          .setMaxLength(100)
          .setRequired(true);

        const descInput = new TextInputBuilder()
          .setCustomId("event_desc")
          .setLabel("Nội dung/Mô tả sự kiện:")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Mô tả cách thức hoặc nội dung sự kiện...")
          .setMaxLength(200)
          .setRequired(true);

        const dateInput = new TextInputBuilder()
          .setCustomId("event_expire")
          .setLabel("Hết hạn lúc (DD/MM/YYYY HH:mm):")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ví dụ: 25/06/2026 18:00")
          .setMaxLength(30)
          .setRequired(true);

        const reqInput = new TextInputBuilder()
          .setCustomId("event_req")
          .setLabel("Yêu cầu (Format: loai,target):")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ví dụ: boss_fight,3 (Để trống nếu nhận ngay)")
          .setMaxLength(50)
          .setRequired(false);

        const rewardsInput = new TextInputBuilder()
          .setCustomId("event_rewards")
          .setLabel("Phần thưởng (Format: coke,item,qty,rank):")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ví dụ: 50000,dungeonkey,2,Legendary")
          .setMaxLength(100)
          .setRequired(true);

        if (eventInfo) {
          nameInput.setValue(eventInfo.name);
          descInput.setValue(eventInfo.description);
          dateInput.setValue(eventInfo.expireRaw);
          if (eventInfo.reqRaw) reqInput.setValue(eventInfo.reqRaw);
          rewardsInput.setValue(eventInfo.rewardsRaw);
        }

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(descInput),
          new ActionRowBuilder().addComponents(dateInput),
          new ActionRowBuilder().addComponents(reqInput),
          new ActionRowBuilder().addComponents(rewardsInput)
        );

        await interaction.showModal(modal);

        // Await modal submission
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i) => i.customId === "setevent_input_modal" && i.user.id === message.author.id,
          time: 120000
        }).catch(() => null);

        if (!modalSubmit) return;

        await modalSubmit.deferUpdate();

        const name = modalSubmit.fields.getTextInputValue("event_name").trim();
        const description = modalSubmit.fields.getTextInputValue("event_desc").trim();
        const expireRaw = modalSubmit.fields.getTextInputValue("event_expire").trim();
        const reqRaw = modalSubmit.fields.getTextInputValue("event_req").trim();
        const rewardsRaw = modalSubmit.fields.getTextInputValue("event_rewards").trim();

        // Validate Expiration Date
        let expiresAt = DateTime.fromFormat(expireRaw, "dd/MM/yyyy HH:mm", { zone: "Asia/Ho_Chi_Minh" }).toJSDate();
        if (isNaN(expiresAt.getTime())) {
          // Fallback to end of day format
          const fallbackDate = DateTime.fromFormat(expireRaw, "dd/MM/yyyy", { zone: "Asia/Ho_Chi_Minh" });
          if (fallbackDate.isValid) {
            expiresAt = fallbackDate.endOf("day").toJSDate();
          } else {
            return modalSubmit.followUp({ content: "❌ Định dạng thời gian không hợp lệ. Vui lòng nhập đúng `DD/MM/YYYY HH:mm` hoặc `DD/MM/YYYY`.", ephemeral: true });
          }
        }

        if (expiresAt.getTime() <= Date.now()) {
          return modalSubmit.followUp({ content: "❌ Thời gian hết hạn phải ở tương lai.", ephemeral: true });
        }

        // Validate Requirement
        let requirementType = null;
        let requirementTarget = 0;
        let requirementChapter = null;
        if (reqRaw) {
          const reqParts = reqRaw.split(",").map(s => s.trim());
          const type = reqParts[0].toLowerCase();
          const target = parseInt(reqParts[1]);

          const validTypes = ["boss_fight", "boss_last_hit", "rpg_top_leaderboard", "dungeon_win"];
          if (!validTypes.includes(type) || isNaN(target) || target <= 0) {
            return modalSubmit.followUp({ content: `❌ Yêu cầu không hợp lệ. Loại yêu cầu chỉ được: ${validTypes.join(", ")} và số lượng mục tiêu phải là số nguyên dương.`, ephemeral: true });
          }

          requirementType = type;
          requirementTarget = target;

          if (type === "dungeon_win") {
            const ch = parseInt(reqParts[2]);
            if (isNaN(ch) || ch < 1 || ch > 6) {
              return modalSubmit.followUp({ content: "❌ Đối với yêu cầu `dungeon_win`, vui lòng nhập thêm chương từ 1 đến 6. Ví dụ: `dungeon_win,1,6`.", ephemeral: true });
            }
            requirementChapter = ch;
          }
        }

        // Validate Rewards
        const rewardsParts = rewardsRaw.split(",").map(s => s.trim());
        const coke = parseInt(rewardsParts[0]) || 0;
        const otherItem = rewardsParts[1] || null;
        const otherQty = parseInt(rewardsParts[2]) || 0;
        const weaponRank = rewardsParts[3] || selectedRank || null;

        if (coke < 0) {
          return modalSubmit.followUp({ content: "❌ Số Coke không thể là số âm.", ephemeral: true });
        }

        // Update active eventInfo settings
        eventInfo = {
          name,
          description,
          expireRaw,
          expiresAt,
          reqRaw,
          requirementType,
          requirementTarget,
          requirementChapter,
          rewardsRaw,
          coke,
          otherItem,
          otherQty,
          weaponRank
        };

        // Re-render setup panel
        await panelMsg.edit({
          embeds: [generatePanelEmbed()],
          components: generatePanelComponents()
        }).catch(() => null);

      } else if (interaction.customId === "setevent_btn_cancel") {
        collector.stop("cancelled");

      } else if (interaction.customId === "setevent_btn_create") {
        collector.stop("create");
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "cancelled") {
        await panelMsg.delete().catch(() => null);
        return;
      }

      if (reason !== "create") {
        await panelMsg.edit({ content: "⏳ Đã hết thời gian thiết lập sự kiện.", embeds: [], components: [] }).catch(() => null);
        return;
      }

      await panelMsg.delete().catch(() => null);

      // Create event in database
      const event = await Event.create({
        name: eventInfo.name,
        description: eventInfo.description,
        expiresAt: eventInfo.expiresAt,
        requirement: eventInfo.requirementType ? {
          type: eventInfo.requirementType,
          target: eventInfo.requirementTarget,
          chapter: eventInfo.requirementChapter
        } : null,
        rewards: {
          coke: eventInfo.coke,
          gear: selectedWeapon !== "none" ? {
            rank: eventInfo.weaponRank || selectedRank || "Epic",
            type: "weapon",
            name: selectedWeapon
          } : null,
          other: eventInfo.otherItem ? {
            name: eventInfo.otherItem,
            quantity: eventInfo.otherQty
          } : null
        }
      });

      const getRequirementLabel = (ev) => {
        const labels = {
          boss_fight: "Tham gia đánh Boss Thế Giới",
          boss_last_hit: "Dứt điểm Boss Thế Giới",
          rpg_top_leaderboard: "Đứng đầu BXH Lực chiến RPG",
          dungeon_win: `Chiến thắng Dungeon Chương ${ev.requirement?.chapter || ""}`,
        };
        return labels[ev.requirement?.type] || ev.requirement?.type;
      };

      const reqDisplay = event.requirement && event.requirement.type
        ? `Đạt **${event.requirement.target}** lần **${getRequirementLabel(event)}**`
        : "Không yêu cầu (Nhận ngay)";

      const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle("✅ Thiết Lập Sự Kiện Thành Công!")
        .setDescription(`Đã khởi tạo sự kiện mới thành công. Người chơi có thể sử dụng lệnh \`${config.prefix}event\` để nhận phần thưởng sau khi hoàn thành yêu cầu.`)
        .addFields(
          { name: "Tên sự kiện", value: event.name },
          { name: "Nội dung", value: event.description },
          { name: "Yêu cầu hoàn thành", value: reqDisplay },
          { name: "Thời gian hết hạn", value: `<t:${Math.floor(event.expiresAt.getTime() / 1000)}:F>` },
          {
            name: "Phần thưởng",
            value: `• Coke: **+${event.rewards.coke.toLocaleString()}**\n` +
                   (event.rewards.gear ? `• Trang bị: **[${event.rewards.gear.rank}] ${event.rewards.gear.name} (${event.rewards.gear.type})**\n` : "") +
                   (event.rewards.other ? `• Khác: **${event.rewards.other.name}** x${event.rewards.other.quantity}` : "")
          }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    });
  }
};
