const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const { requireRpgCharacter } = require("../../utils/rpgUtil");

module.exports = {
  name: "tradestone",
  aliases: ["ts", "trade-stone"],
  description: "Giao dịch đá cường hóa (Somber / Cristal) của bạn với người chơi khác.",
  usage: `${config.prefix}tradestone @mention <loại_đá> [số_lượng]`,
  examples: [
    { intent: "Tặng 5 viên Somber Smithing Stone [1] cho người khác", command: `${config.prefix}tradestone @Khang somber-1 5` },
    { intent: "Tặng 1 viên Somber Ancient Dragon Smithing Stone cho người khác", command: `${config.prefix}tradestone @Khang Cristal 10` },
  ],

  async execute(message, args = []) {
    const senderId = message.author.id;
    const targetUserMention = message.mentions.users.first();

    if (!targetUserMention) {
      return message.reply(
        `${config.emoji.warning} Vui lòng mention người chơi bạn muốn giao dịch cùng.\nSử dụng: \`${config.prefix}tradestone @mention <tên/loại_đá> [số_lượng]\``
      );
    }

    if (targetUserMention.id === senderId) {
      return message.reply(`${config.emoji.no} Bạn không thể tự giao dịch đá với chính mình!`);
    }

    // Filter args to remove user mention
    const cleanArgs = args.filter((arg) => !arg.startsWith("<@") && !arg.startsWith("<!@"));
    const argsStr = cleanArgs.join(" ").toLowerCase().trim();

    if (!argsStr) {
      return message.reply(
        `${config.emoji.warning} Vui lòng nhập loại đá rèn muốn giao dịch (ví dụ: \`somber-1\`, \`cristal-3\`).`
      );
    }

    // Parse stone ID
    let stoneId = "";
    const directMatch = argsStr.match(/(somber|cristal)-\d+/);
    if (directMatch) {
      stoneId = directMatch[0];
    } else {
      const isCristal = argsStr.includes("cristal") || argsStr.includes("crystal") || argsStr.includes("cr") || argsStr.includes("cs") || argsStr.includes("dungeon");
      const isSomber = argsStr.includes("somber") || argsStr.includes("sm") || argsStr.includes("sb") || argsStr.includes("thuong") || argsStr.includes("thường");
      
      const numbers = argsStr.match(/\d+/g) || [];
      const num = numbers.length > 0 ? parseInt(numbers[0], 10) : null;
      
      if (isCristal && num >= 1 && num <= 10) {
        stoneId = `cristal-${num}`;
      } else if (isSomber && num >= 1 && num <= 9) {
        stoneId = `somber-${num}`;
      }
    }

    if (!stoneId) {
      return message.reply(
        `${config.emoji.no} Không xác định được loại đá cường hóa bạn muốn giao dịch. Hãy nhập chính xác ví dụ: \`somber-1\` hoặc \`cristal-10\`.`
      );
    }

    // Parse quantity
    const numbers = argsStr.match(/\d+/g) || [];
    let qty = 1;
    const stoneNumStr = stoneId.split("-")[1];
    const otherNumbers = numbers.filter(n => n !== stoneNumStr);
    if (otherNumbers.length > 0) {
      qty = parseInt(otherNumbers[0], 10);
    }

    if (isNaN(qty) || qty <= 0) {
      return message.reply(`${config.emoji.no} Số lượng đá rèn giao dịch phải là số nguyên dương lớn hơn 0.`);
    }

    // Load sender details
    const { user: senderUser } = await requireRpgCharacter(senderId);

    // Verify sender's stone balance
    if (!senderUser.inventory) {
      senderUser.inventory = new Map();
    }
    const senderStoneQty = senderUser.inventory.get(stoneId) || 0;
    const stoneItem = message.client.allItems.find((i) => i.item_id === stoneId);
    const stoneName = stoneItem ? stoneItem.name : `Smithing Stone (${stoneId})`;
    const stoneEmoji = stoneItem ? stoneItem.emoji : "💎";

    if (senderStoneQty < qty) {
      return message.reply(
        `${config.emoji.no} Bạn không đủ nguyên liệu! Cần **${qty} x ${stoneEmoji} ${stoneName}** nhưng hiện tại chỉ có **${senderStoneQty}** viên trong túi đồ.`
      );
    }

    // Load receiver details
    const receiverId = targetUserMention.id;
    let receiverUser;
    try {
      const res = await requireRpgCharacter(receiverId);
      receiverUser = res.user;
    } catch {
      return message.reply(
        `${config.emoji.no} Đối phương chưa tạo nhân vật RPG. Họ cần dùng lệnh \`${config.prefix}class\` trước khi có thể nhận đá.`
      );
    }

    // Build confirm buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("trade_confirm")
        .setLabel("Xác nhận chuyển")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("trade_cancel")
        .setLabel("Hủy giao dịch")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor("#FFA500")
      .setTitle("💎 Xác Nhận Giao Dịch Đá Cường Hóa")
      .setDescription(
        `Bạn có chắc chắn muốn chuyển đá cường hóa sau cho <@${receiverId}> không?\n` +
          `**Chú ý:** Hành động này không thể hoàn tác.`
      )
      .addFields(
        {
          name: "Người gửi",
          value: `<@${senderId}>`,
          inline: true,
        },
        {
          name: "Người nhận",
          value: `<@${receiverId}>`,
          inline: true,
        },
        {
          name: "Đá rèn giao dịch",
          value:
            `Loại đá: **${stoneEmoji} ${stoneName}**\n` +
            `Số lượng: **x${qty}**\n` +
            `Mã ID: \`${stoneId}\``,
        }
      );

    const prompt = await message.reply({
      embeds: [embed],
      components: [row],
    });

    try {
      const interaction = await prompt.awaitMessageComponent({
        filter: (i) => i.user.id === senderId,
        time: 20000,
      });

      if (interaction.customId === "trade_confirm") {
        // Reload data to ensure consistency and avoid race conditions
        const freshSender = await getUser(senderId);
        const freshReceiver = await getUser(receiverId);

        if (!freshSender || !freshSender.rpg || !freshSender.rpg.classKey) {
          return interaction.update({
            content: "❌ Giao dịch thất bại: Không tìm thấy nhân vật RPG của người gửi.",
            embeds: [],
            components: [],
          });
        }

        if (!freshReceiver || !freshReceiver.rpg || !freshReceiver.rpg.classKey) {
          return interaction.update({
            content: "❌ Giao dịch thất bại: Không tìm thấy nhân vật RPG của người nhận.",
            embeds: [],
            components: [],
          });
        }

        // Re-verify quantity
        if (!freshSender.inventory) {
          freshSender.inventory = new Map();
        }
        const freshSenderQty = freshSender.inventory.get(stoneId) || 0;
        if (freshSenderQty < qty) {
          return interaction.update({
            content: `❌ Giao dịch thất bại: Người gửi không còn đủ **${qty} x ${stoneEmoji} ${stoneName}** (Hiện có: **${freshSenderQty}**).`,
            embeds: [],
            components: [],
          });
        }

        // Deduct from sender
        const newSenderQty = freshSenderQty - qty;
        if (newSenderQty <= 0) {
          freshSender.inventory.delete(stoneId);
        } else {
          freshSender.inventory.set(stoneId, newSenderQty);
        }
        freshSender.markModified("inventory");

        // Add to receiver
        if (!freshReceiver.inventory) {
          freshReceiver.inventory = new Map();
        }
        const freshReceiverQty = freshReceiver.inventory.get(stoneId) || 0;
        freshReceiver.inventory.set(stoneId, freshReceiverQty + qty);
        freshReceiver.markModified("inventory");

        // Save modifications
        await freshSender.save();
        await freshReceiver.save();

        const successEmbed = EmbedBuilder.from(embed)
          .setColor("#57F287")
          .setTitle("✅ Giao Dịch Đá Cường Hóa Thành Công")
          .setDescription(
            `Đá cường hóa **${stoneName}** (x${qty}) đã được chuyển thành công từ <@${senderId}> sang <@${receiverId}>!`
          );

        await interaction.update({
          embeds: [successEmbed],
          components: [],
        });
      } else {
        await interaction.update({
          content: "❌ Giao dịch đã bị hủy.",
          embeds: [],
          components: [],
        });
      }
    } catch (err) {
      await prompt.edit({
        content: "❌ Hết thời gian chờ, yêu cầu giao dịch đá đã tự động hủy.",
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  },
};
