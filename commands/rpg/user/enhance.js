const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const config = require("../../../data/config");
const { getItem } = require("../../../data/items");
const { getUser } = require("../../../utils/userUtil");
const {
  requireRpgCharacter,
  getGearDisplayName,
  calculateRpgPower,
  getItemImageFile,
  subTypes,
  dungeonWeapons,
} = require("../../../utils/rpgUtil");
const { getRpgColor, formatRpgFooter, formatRpgTitle, safeInteractionUpdate } = require("../../../utils/rpgUi");

const ENHANCE_CONFIG = {
  0: { stoneId: "cristal-1", stoneQty: 1, cokeCost: 15000, rate: 1.00 },
  1: { stoneId: "cristal-2", stoneQty: 1, cokeCost: 30000, rate: 0.90 },
  2: { stoneId: "cristal-3", stoneQty: 1, cokeCost: 60000, rate: 0.80 },
  3: { stoneId: "cristal-4", stoneQty: 1, cokeCost: 100000, rate: 0.68 },
  4: { stoneId: "cristal-5", stoneQty: 1, cokeCost: 160000, rate: 0.55 },
  5: { stoneId: "cristal-6", stoneQty: 1, cokeCost: 250000, rate: 0.42 },
  6: { stoneId: "cristal-7", stoneQty: 1, cokeCost: 380000, rate: 0.30 },
  7: { stoneId: "cristal-8", stoneQty: 1, cokeCost: 550000, rate: 0.22 },
  8: { stoneId: "cristal-8", stoneQty: 2, cokeCost: 800000, rate: 0.15 },
  9: { stoneId: "cristal-8", stoneQty: 3, cokeCost: 1200000, rate: 0.10 },
  10: { stoneId: "cristal-8", stoneQty: 4, cokeCost: 2000000, rate: 0.06 },
};

function getWeaponEmoji(item) {
  if (item?.emoji && item.emoji.includes(":")) return item.emoji;
  const clean = String(item?.subType || item?.subtype || item?.name || "").toLowerCase().replace(/\s+/g, "");
  const foundNormal = subTypes.weapon.find(w => w.name.toLowerCase().replace(/\s+/g, "") === clean);
  if (foundNormal?.emoji) return foundNormal.emoji;
  const foundDung = dungeonWeapons.find(w => w.key === clean || w.name.toLowerCase().replace(/\s+/g, "") === clean);
  if (foundDung?.emoji) return foundDung.emoji;
  if (config.emoji?.weapons?.[clean]) return config.emoji.weapons[clean];
  return "🗡️";
}

function getStoneInfo(stoneId) {
  const item = getItem(stoneId);
  if (item) {
    return {
      name: item.name,
      emoji: item.emoji || "💎",
    };
  }
  return {
    name: `Cristal Smithing Stone [${stoneId.split("-")[1] || 1}]`,
    emoji: "💎",
  };
}

function buildEnhanceRows(phase, { weaponEmoji, currentLvl, nextLvl, failLevel, ratePercent, stoneEmoji, stoneQty, isSuccess, canContinue }) {
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();
  const row3 = new ActionRowBuilder();

  if (phase === "initial") {
    // Row 1: 3 ô trên [Vũ khí cần nâng cấp] [Tỉ lệ thành công] [Viên đá nâng cấp]
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId("slot_source_weapon")
        .setEmoji(weaponEmoji)
        .setLabel(`+${currentLvl}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("slot_rate")
        .setEmoji("🎯")
        .setLabel(`${ratePercent}%`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("slot_stone")
        .setEmoji(stoneEmoji)
        .setLabel(`x${stoneQty}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    // Row 2: Chữ T - Bỏ 2 ô 2 bên, chỉ để ô ở giữa phía dưới hiện vũ khí sau khi nâng cấp
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId("spacer_left")
        .setLabel("\u2800")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("slot_target_weapon")
        .setEmoji(weaponEmoji)
        .setLabel(`+${nextLvl}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("spacer_right")
        .setLabel("\u2800")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    // Row 3: Button ở ngoài "Nâng cấp"
    row3.addComponents(
      new ButtonBuilder()
        .setCustomId("btn_do_enhance")
        .setLabel("Nâng cấp")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("btn_cancel_enhance")
        .setLabel("Hủy")
        .setStyle(ButtonStyle.Secondary)
    );
  } else if (phase === "processing") {
    // Hiệu ứng đang đập đồ
    row1.addComponents(
      new ButtonBuilder().setCustomId("slot_proc_1").setLabel("·").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("slot_proc_2").setLabel("🔨").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("slot_proc_3").setLabel("·").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    row2.addComponents(
      new ButtonBuilder().setCustomId("spacer_left").setLabel("\u2800").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder()
        .setCustomId("slot_target_weapon")
        .setLabel("⏳ Đang đập...")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder().setCustomId("spacer_right").setLabel("\u2800").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    row3.addComponents(
      new ButtonBuilder()
        .setCustomId("btn_processing")
        .setLabel("Đang nâng cấp...")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  } else if (phase === "result") {
    // Hiệu ứng kết quả: 3 ô trên TRỐNG, ô giữa phía dưới hiện vũ khí đã cộng (thành công: xanh lá, thất bại: đỏ)
    row1.addComponents(
      new ButtonBuilder().setCustomId("slot_empty_1").setLabel("\u2800").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("slot_empty_2").setLabel("\u2800").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("slot_empty_3").setLabel("\u2800").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    const resultLvl = isSuccess ? nextLvl : failLevel;
    row2.addComponents(
      new ButtonBuilder().setCustomId("spacer_left").setLabel("\u2800").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder()
        .setCustomId("slot_result_weapon")
        .setEmoji(weaponEmoji)
        .setLabel(`+${resultLvl}`)
        .setStyle(isSuccess ? ButtonStyle.Success : ButtonStyle.Danger)
        .setDisabled(true),
      new ButtonBuilder().setCustomId("spacer_right").setLabel("\u2800").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    if (canContinue) {
      row3.addComponents(
        new ButtonBuilder()
          .setCustomId("btn_enhance_again")
          .setLabel("Nâng cấp tiếp")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("btn_cancel_enhance")
          .setLabel("Đóng")
          .setStyle(ButtonStyle.Secondary)
      );
    } else {
      row3.addComponents(
        new ButtonBuilder()
          .setCustomId("btn_done")
          .setLabel("Hoàn tất")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    }
  }

  return [row1, row2, row3];
}

class EnhanceCommand extends BaseCommand {
  constructor() {
    super({
      name: "enhance",
      aliases: ["eh", "ch", "cuonghoa"],
      description: "Cường hóa vũ khí của bạn sử dụng 8 loại Đá Cristal và Coke (Tối đa +11, cơ chế FO4).",
      usage: `${config.prefix}enhance [ID vũ khí]`,
      examples: [
        { intent: "Cường hóa vũ khí đang trang bị", command: `${config.prefix}enhance` },
        { intent: "Cường hóa vũ khí có ID 15", command: `${config.prefix}enhance 15` },
      ],
      cooldown: 0,
    });
  }

  async execute(message, args) {
    const { user } = await requireRpgCharacter(message.author.id);
    const cleanArg = args[0] ? args[0].trim().replace(/^[gG]/, "") : "";
    let itemId = Number(cleanArg);
    const equipped = user.rpg.equipped || {};

    if (!cleanArg) {
      if (!equipped.weapon) {
        return message.reply(
          `${config.emoji.no} Bạn chưa trang bị vũ khí nào. Hãy trang bị vũ khí trước hoặc nhập ID vũ khí muốn cường hóa.`
        );
      }
      itemId = equipped.weapon;
    }

    const items = user.rpg.items || [];
    const itemIndex = items.findIndex((it) => it.id === Number(itemId));
    if (itemIndex === -1) {
      return message.reply(`${config.emoji.no} Không tìm thấy trang bị này trong túi đồ của bạn.`);
    }

    let item = items[itemIndex];
    if (item.slot !== "weapon") {
      return message.reply(`${config.emoji.no} Chỉ có thể cường hóa trang bị thuộc loại **Vũ khí**.`);
    }

    // Common weapons cannot be enhanced (dedicated for pets at level 0)
    if (item.rarity === "Common") {
      return message.reply(
        `${config.emoji.no} **Vũ khí phẩm chất Thường (Common)** mặc định là cấp 0 và không thể cường hóa!\n` +
          `Vũ khí thường dùng riêng để trang bị cho Linh Thú. Bạn có thể dùng lệnh: \`${config.prefix}equip pet <tên_pet> ${item.id}\`.`
      );
    }

    const maxLevel = 11;
    let currentLvl = item.upgradeLevel || 0;
    if (currentLvl >= maxLevel) {
      return message.reply(`${config.emoji.warning} Vũ khí này đã đạt cấp độ cường hóa tối đa (**+${maxLevel}**).`);
    }

    const buildStateData = (currentUser, currentItem) => {
      const cLvl = currentItem.upgradeLevel || 0;
      const nLvl = cLvl + 1;
      const rule = ENHANCE_CONFIG[cLvl];
      if (!rule) return null;

      const { stoneId, stoneQty, cokeCost, rate } = rule;
      const stoneInfo = getStoneInfo(stoneId);
      const ratePercent = Math.round(rate * 100);
      const failLevel = Math.max(0, cLvl - 1);
      const weaponEmoji = getWeaponEmoji(currentItem);

      let userStoneQty = 0;
      if (currentUser.inventory instanceof Map) {
        userStoneQty = currentUser.inventory.get(stoneId) || 0;
      } else if (currentUser.inventory && typeof currentUser.inventory === "object") {
        userStoneQty = currentUser.inventory[stoneId] || 0;
      }

      const hasCoke = (currentUser.coke || 0) >= cokeCost;
      const hasStone = userStoneQty >= stoneQty;
      const canAfford = hasCoke && hasStone;

      return {
        cLvl,
        nLvl,
        rule,
        stoneId,
        stoneQty,
        cokeCost,
        rate,
        ratePercent,
        failLevel,
        weaponEmoji,
        stoneInfo,
        userStoneQty,
        hasCoke,
        hasStone,
        canAfford,
      };
    };

    let stateData = buildStateData(user, item);
    if (!stateData) {
      return message.reply(`${config.emoji.no} Cấp độ cường hóa hiện tại không hợp lệ.`);
    }

    if (!stateData.hasCoke) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ Coke để cường hóa! Cần **${stateData.cokeCost.toLocaleString()}** ${config.emoji.money} nhưng bạn chỉ có **${(user.coke || 0).toLocaleString()}** ${config.emoji.money}.`
      );
    }

    if (!stateData.hasStone) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ nguyên liệu! Cần **${stateData.stoneQty} x ${stateData.stoneInfo.emoji} ${stateData.stoneInfo.name}** nhưng hiện tại chỉ có **${stateData.userStoneQty}** viên trong túi đồ.`
      );
    }

    const buildInitialEmbed = (sData, curItem) => {
      return new EmbedBuilder()
        .setColor(getRpgColor("premium") || 0xf39c12)
        .setTitle(formatRpgTitle("Lò Rèn Cường Hóa (Cơ chế FO4)", "🔨"))
        .setDescription(
          `🗡️ **Vũ khí**: ${getGearDisplayName(curItem)} (**+${sData.cLvl}** ➡️ **+${sData.nLvl}**)\n` +
            `🎯 **Tỉ lệ thành công**: **${sData.ratePercent}%**\n` +
            `${config.emoji.money} **Coke tiêu hao**: **${sData.cokeCost.toLocaleString()}**\n` +
            `💎 **Nguyên liệu**: **${sData.stoneQty} x ${sData.stoneInfo.emoji} ${sData.stoneInfo.name}**\n\n` +
            `⚠️ **Cảnh báo rủi ro (FO4):**\n` +
            (sData.cLvl === 0
              ? `• Thất bại: Mất đá & Coke (giữ nguyên cấp +0).`
              : `• Nếu thất bại: Mất đá & Coke, vũ khí sẽ **BỊ TỤT 1 CẤP** (**+${sData.cLvl}** ➡️ **+${sData.failLevel}**)!`)
        )
        .setFooter(formatRpgFooter("Nhấn 'Nâng cấp' để tiến hành rèn vũ khí • Hết hạn sau 60 giây"))
        .setTimestamp();
    };

    const initialRows = buildEnhanceRows("initial", {
      weaponEmoji: stateData.weaponEmoji,
      currentLvl: stateData.cLvl,
      nextLvl: stateData.nLvl,
      failLevel: stateData.failLevel,
      ratePercent: stateData.ratePercent,
      stoneEmoji: stateData.stoneInfo.emoji,
      stoneQty: stateData.stoneQty,
    });

    const enhanceMsg = await message.reply({
      embeds: [buildInitialEmbed(stateData, item)],
      components: initialRows,
    });

    const collector = enhanceMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000,
    });

    let isProcessing = false;

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "btn_cancel_enhance") {
        collector.stop("cancelled");
        return safeInteractionUpdate(interaction, {
          content: "❌ Đã hủy phiên cường hóa vũ khí.",
          embeds: [],
          components: [],
        });
      }

      if (interaction.customId === "btn_enhance_again") {
        if (isProcessing) return;
        const freshUser = await getUser(message.author.id);
        const freshItem = freshUser?.rpg?.items?.find((it) => it.id === Number(itemId));
        if (!freshUser || !freshItem) {
          collector.stop("not_found");
          return safeInteractionUpdate(interaction, {
            content: "❌ Không tìm thấy thông tin nhân vật hoặc vũ khí nữa.",
            embeds: [],
            components: [],
          });
        }

        if ((freshItem.upgradeLevel || 0) >= maxLevel) {
          collector.stop("max_level");
          return safeInteractionUpdate(interaction, {
            content: `🎉 Vũ khí đã đạt cấp tối đa (**+${maxLevel}**)!`,
            embeds: [],
            components: [],
          });
        }

        stateData = buildStateData(freshUser, freshItem);
        if (!stateData || !stateData.canAfford) {
          const reason = !stateData.hasCoke
            ? `Cần ${stateData.cokeCost.toLocaleString()} Coke nhưng chỉ có ${(freshUser.coke || 0).toLocaleString()} Coke`
            : `Cần ${stateData.stoneQty}x ${stateData.stoneInfo.name} nhưng chỉ có ${stateData.userStoneQty} viên`;
          collector.stop("out_of_resources");
          return safeInteractionUpdate(interaction, {
            content: `❌ Bạn không đủ tài nguyên để nâng cấp tiếp (${reason}).`,
            embeds: [],
            components: [],
          });
        }

        collector.resetTimer();
        item = freshItem;
        const reloadedRows = buildEnhanceRows("initial", {
          weaponEmoji: stateData.weaponEmoji,
          currentLvl: stateData.cLvl,
          nextLvl: stateData.nLvl,
          failLevel: stateData.failLevel,
          ratePercent: stateData.ratePercent,
          stoneEmoji: stateData.stoneInfo.emoji,
          stoneQty: stateData.stoneQty,
        });

        return safeInteractionUpdate(interaction, {
          embeds: [buildInitialEmbed(stateData, freshItem)],
          components: reloadedRows,
        });
      }

      if (interaction.customId === "btn_do_enhance") {
        if (isProcessing) return;
        isProcessing = true;

        const freshUser = await getUser(message.author.id);
        if (!freshUser || !freshUser.rpg || !freshUser.rpg.classKey) {
          isProcessing = false;
          return safeInteractionUpdate(interaction, {
            content: "❌ Không tìm thấy nhân vật RPG của bạn.",
            embeds: [],
            components: [],
          });
        }

        const freshItemIndex = (freshUser.rpg.items || []).findIndex((it) => it.id === Number(itemId));
        if (freshItemIndex === -1) {
          isProcessing = false;
          return safeInteractionUpdate(interaction, {
            content: "❌ Không tìm thấy vũ khí này trong túi đồ của bạn nữa.",
            embeds: [],
            components: [],
          });
        }

        const freshItem = freshUser.rpg.items[freshItemIndex];
        const freshCurrentLvl = freshItem.upgradeLevel || 0;
        if (freshCurrentLvl !== stateData.cLvl) {
          isProcessing = false;
          return safeInteractionUpdate(interaction, {
            content: "❌ Cấp độ vũ khí đã thay đổi trong một phiên khác.",
            embeds: [],
            components: [],
          });
        }

        const currentState = buildStateData(freshUser, freshItem);
        if (!currentState || !currentState.canAfford) {
          isProcessing = false;
          const reason = !currentState.hasCoke
            ? `Cần ${currentState.cokeCost.toLocaleString()} Coke nhưng chỉ có ${(freshUser.coke || 0).toLocaleString()} Coke`
            : `Cần ${currentState.stoneQty}x ${currentState.stoneInfo.name} nhưng chỉ có ${currentState.userStoneQty} viên`;
          return safeInteractionUpdate(interaction, {
            content: `❌ Không đủ tài nguyên để cường hóa (${reason}).`,
            embeds: [],
            components: [],
          });
        }

        // Bước 1: Hiệu ứng đang nâng cấp
        const processingRows = buildEnhanceRows("processing", {
          weaponEmoji: currentState.weaponEmoji,
          currentLvl: currentState.cLvl,
          nextLvl: currentState.nLvl,
        });

        const processingEmbed = new EmbedBuilder()
          .setColor(getRpgColor("premium") || 0xf39c12)
          .setTitle(formatRpgTitle("Đang Rèn Vũ Khí...", "🔨"))
          .setDescription(
            `🔥 Lò rèn đang rực lửa! Đang tiến hành cường hóa **${getGearDisplayName(freshItem)}**...\n\n` +
              `🎯 Tỉ lệ thành công: **${currentState.ratePercent}%**\n` +
              `💎 Tiêu hao: **${currentState.stoneQty} x ${currentState.stoneInfo.emoji} ${currentState.stoneInfo.name}** & **${currentState.cokeCost.toLocaleString()}** ${config.emoji.money}`
          )
          .setFooter(formatRpgFooter("Đang kiểm định kết quả..."));

        await safeInteractionUpdate(interaction, {
          embeds: [processingEmbed],
          components: processingRows,
        });

        // Delay 1.0 giây tạo hiệu ứng hồi hộp
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Khấu trừ tài nguyên
        freshUser.coke -= currentState.cokeCost;
        if (freshUser.inventory instanceof Map) {
          const currentQty = freshUser.inventory.get(currentState.stoneId) || 0;
          const nextQty = currentQty - currentState.stoneQty;
          if (nextQty <= 0) freshUser.inventory.delete(currentState.stoneId);
          else freshUser.inventory.set(currentState.stoneId, nextQty);
        } else if (freshUser.inventory && typeof freshUser.inventory === "object") {
          const currentQty = freshUser.inventory[currentState.stoneId] || 0;
          const nextQty = currentQty - currentState.stoneQty;
          if (nextQty <= 0) delete freshUser.inventory[currentState.stoneId];
          else freshUser.inventory[currentState.stoneId] = nextQty;
        }
        freshUser.markModified("inventory");

        // Quay tỉ lệ
        const isSuccess = Math.random() < currentState.rate;
        let finalLvl;
        let resultEmbed;

        if (isSuccess) {
          finalLvl = currentState.nLvl;
          freshItem.upgradeLevel = finalLvl;
          freshItem.name = getGearDisplayName(freshItem);
          freshUser.rpg.power = calculateRpgPower(freshUser);
          freshUser.markModified("rpg");
          await freshUser.save();

          resultEmbed = new EmbedBuilder()
            .setColor(getRpgColor("reward") || 0x2ecc71)
            .setTitle(formatRpgTitle("CƯỜNG HÓA THÀNH CÔNG!", "✨"))
            .setDescription(
              `🎉 Chúc mừng bạn đã nâng cấp thành công vũ khí lên **+${finalLvl}**!\n\n` +
                `🗡️ **Vũ khí**: ${getGearDisplayName(freshItem)}\n` +
                `🎯 **Tỉ lệ thành công**: **${currentState.ratePercent}%**\n` +
                `${config.emoji.money} Coke tiêu hao: **-${currentState.cokeCost.toLocaleString()}**\n` +
                `💎 Nguyên liệu tiêu hao: **-${currentState.stoneQty} x ${currentState.stoneInfo.emoji} ${currentState.stoneInfo.name}**\n\n` +
                `💪 Lực chiến tổng hiện tại: **${freshUser.rpg.power.toLocaleString()}**`
            )
            .setFooter(formatRpgFooter("Cấp cường hóa và lực chiến đã được lưu"))
            .setTimestamp();
        } else {
          finalLvl = currentState.failLevel;
          freshItem.upgradeLevel = finalLvl;
          freshItem.name = getGearDisplayName(freshItem);
          freshUser.rpg.power = calculateRpgPower(freshUser);
          freshUser.markModified("rpg");
          await freshUser.save();

          resultEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(formatRpgTitle("CƯỜNG HÓA THẤT BẠI!", "💥"))
            .setDescription(
              `💀 **Rất tiếc! Đập đồ thất bại** (Tỉ lệ thành công: **${currentState.ratePercent}%**).\n\n` +
                `🗡️ **Vũ khí**: ${getGearDisplayName(freshItem)}\n` +
                `📉 Cấp độ: **+${currentState.cLvl}** ➡️ **+${finalLvl}** *(Tụt 1 cấp theo cơ chế FO4)*\n` +
                `${config.emoji.money} Coke đã mất: **-${currentState.cokeCost.toLocaleString()}**\n` +
                `💎 Nguyên liệu đã mất: **-${currentState.stoneQty} x ${currentState.stoneInfo.emoji} ${currentState.stoneInfo.name}**\n\n` +
                `💪 Lực chiến hiện tại: **${freshUser.rpg.power.toLocaleString()}**\n\n` +
                `*Đừng nản lòng! Hãy tiếp tục rèn giũa để chinh phục mốc cao hơn.*`
            )
            .setFooter(formatRpgFooter("Cơ chế đập đồ FO4 • Đã hạ 1 cấp"))
            .setTimestamp();
        }

        let itemAttachment = null;
        const imgKey = freshItem.imageKey || getItemImageFile(freshItem);
        if (imgKey) {
          const itemImagePath = path.join(__dirname, "../../../assets/items", imgKey);
          if (fs.existsSync(itemImagePath)) {
            itemAttachment = new AttachmentBuilder(itemImagePath, { name: "item.png" });
            resultEmbed.setThumbnail("attachment://item.png");
          }
        }

        // Kiểm tra xem có thể nâng cấp tiếp không
        const nextState = buildStateData(freshUser, freshItem);
        const canContinue = finalLvl < maxLevel && nextState && nextState.canAfford;

        const resultRows = buildEnhanceRows("result", {
          weaponEmoji: currentState.weaponEmoji,
          currentLvl: currentState.cLvl,
          nextLvl: currentState.nLvl,
          failLevel: currentState.failLevel,
          isSuccess,
          canContinue,
        });

        const payload = { embeds: [resultEmbed], components: resultRows };
        if (itemAttachment) {
          payload.files = [itemAttachment];
        }

        await enhanceMsg.edit(payload).catch(() => {});
        isProcessing = false;
        collector.resetTimer();
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (reason === "cancelled") return;
      // Vô hiệu hóa nút sau khi hết hạn
      const disabledRows = buildEnhanceRows("result", {
        weaponEmoji: stateData.weaponEmoji,
        currentLvl: stateData.cLvl,
        nextLvl: stateData.nLvl,
        failLevel: stateData.failLevel,
        isSuccess: true,
        canContinue: false,
      });
      await enhanceMsg.edit({ components: disabledRows }).catch(() => {});
    });
  }
}

module.exports = new EnhanceCommand();
