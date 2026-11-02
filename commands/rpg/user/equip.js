const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const config = require("../../../data/config");
const {
  equipRpgItem,
  requireRpgCharacter,
  getGearDisplayName,
  getItemImageFile,
  getPetWeaponCompatibility,
} = require("../../../utils/rpgUtil");
const { getRarityEmoji, getSlotLabel, getRpgColor, formatRpgTitle, formatRpgFooter } = require("../../../utils/rpgUi");

module.exports = {
  name: "equip",
  aliases: ["eq"],
  description: "Mặc một trang bị RPG theo ID hoặc trang bị vũ khí thường cho Linh Thú.",
  usage: `${config.prefix}equip <itemId> hoặc ${config.prefix}equip pet <tên_pet> <ID_vũ_khí/unequip>`,
  examples: [
    { intent: "Mặc trang bị RPG ID 3", command: `${config.prefix}equip 3` },
    { intent: "Trang bị vũ khí thường ID 15 cho pet Jacko", command: `${config.prefix}equip pet jacko 15` },
    { intent: "Tháo vũ khí khỏi pet Jacko", command: `${config.prefix}equip pet jacko unequip` },
  ],
  async execute(message, args) {
    const { user } = await requireRpgCharacter(message.author.id);

    // Subcommand: equip pet
    if (args[0]?.toLowerCase() === "pet") {
      if (args.length < 2) {
        return message.reply(
          `${config.emoji.no} Cú pháp: \`${config.prefix}equip pet <tên_pet> <ID_vũ_khí>\` hoặc \`${config.prefix}equip pet <tên_pet> unequip\``
        );
      }

      const lastArg = args[args.length - 1].toLowerCase();
      const isUnequip = lastArg === "unequip" || lastArg === "thao" || lastArg === "remove" || lastArg === "off";
      const weaponIdArg = isUnequip ? null : lastArg.replace(/^[gG]/, "");
      const petQuery = (isUnequip || args.length > 2)
        ? args.slice(1, args.length - 1).join(" ").trim()
        : args[1].trim();

      if (!isUnequip && args.length === 2) {
        return message.reply(
          `${config.emoji.no} Vui lòng nhập ID vũ khí muốn trang bị cho pet: \`${config.prefix}equip pet ${petQuery} <ID_vũ_khí>\``
        );
      }

      const removeTones = (str) =>
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D") : "";
      const cleanQuery = removeTones(petQuery).toLowerCase();
      const { findPetSpecies } = require("../../../data/pets");
      const species = findPetSpecies(petQuery);

      const petIndex = (user.rpg.pets || []).findIndex((p) => {
        if (species && p.key === species.key) return true;
        if (p.key && p.key.toLowerCase() === petQuery.toLowerCase()) return true;
        if (p.name && removeTones(p.name).toLowerCase().includes(cleanQuery)) return true;
        if (p.nickname && removeTones(p.nickname).toLowerCase().includes(cleanQuery)) return true;
        return false;
      });

      if (petIndex === -1) {
        return message.reply(
          `${config.emoji.no} Bạn chưa sở hữu linh thú có tên hoặc alias **"${petQuery}"** trong sở thú/RPG!`
        );
      }
      const targetPet = user.rpg.pets[petIndex];

      if (isUnequip) {
        if (!targetPet.equippedWeapon) {
          return message.reply(
            `${config.emoji.warning} Linh thú **${targetPet.nickname || targetPet.name}** hiện chưa trang bị vũ khí nào.`
          );
        }
        const oldW = targetPet.equippedWeapon;
        delete targetPet.equippedWeapon;
        user.markModified("rpg");
        await user.save();
        return message.reply(
          `${config.emoji.yes || "✅"} Đã tháo vũ khí **${oldW.name || oldW.subType}** khỏi linh thú **${targetPet.nickname || targetPet.name}**.`
        );
      }

      const weaponId = Number(weaponIdArg);
      if (!Number.isInteger(weaponId) || weaponId <= 0) {
        return message.reply(`${config.emoji.no} ID vũ khí không hợp lệ. Vui lòng nhập số ID vũ khí (ví dụ: \`15\`).`);
      }

      const items = user.rpg.items || [];
      const weapon = items.find((it) => it.id === weaponId);
      if (!weapon) {
        return message.reply(
          `${config.emoji.no} Không tìm thấy trang bị ID \`G${String(weaponId).padStart(3, "0")}\` trong túi đồ của bạn.`
        );
      }

      if (weapon.slot !== "weapon") {
        return message.reply(`${config.emoji.no} Trang bị này không phải là **Vũ khí**!`);
      }

      // Must be Common rarity
      if (weapon.rarity !== "Common") {
        return message.reply(
          `${config.emoji.no} Chỉ có thể trang bị **Vũ khí phẩm chất Thường (Common)** cho Linh Thú theo chuẩn hệ thống OwO!\n` +
            `Các vũ khí từ Rare trở lên dùng riêng cho nhân vật chính để chiến đấu và vượt phó bản.`
        );
      }

      // Check if weapon is currently equipped on the player
      if (user.rpg.equipped?.weapon === weapon.id) {
        user.rpg.equipped.weapon = null;
      }

      // Check if weapon is currently equipped on another pet
      for (const otherPet of user.rpg.pets) {
        if (otherPet && otherPet.equippedWeapon && otherPet.equippedWeapon.id === weapon.id && otherPet.id !== targetPet.id) {
          delete otherPet.equippedWeapon;
        }
      }

      // Calculate compatibility
      const compat = getPetWeaponCompatibility(targetPet, weapon);

      targetPet.equippedWeapon = {
        id: weapon.id,
        name: weapon.name,
        subType: weapon.subType,
        emoji: weapon.emoji || "🗡️",
        power: weapon.power || 0,
        stats: weapon.stats || {},
        efficiency: compat.efficiency,
        isMatch: compat.isMatch,
        weaponRole: compat.weaponRole,
        petRole: compat.petRole,
      };

      user.markModified("rpg");
      await user.save();

      const embed = new EmbedBuilder()
        .setColor(compat.isMatch ? 0x2ecc71 : 0xf39c12)
        .setTitle(formatRpgTitle("Trang bị vũ khí cho Linh Thú", targetPet.emoji || "🐾"))
        .setDescription(
          `Đã trang bị thành công **${weapon.name || weapon.subType}** cho Linh Thú **${targetPet.nickname || targetPet.name}**!\n\n` +
            `🐾 **Linh Thú**: ${targetPet.emoji} **${targetPet.nickname || targetPet.name}** (Lv.${targetPet.level || 1})\n` +
            `🗡️ **Vũ khí**: ${weapon.emoji || "🗡️"} **${weapon.name || weapon.subType}** (Mã: \`G${String(weapon.id).padStart(3, "0")}\`)\n` +
            `⚡ **Hiệu quả phát huy**: **${Math.round(compat.efficiency * 100)}%**\n` +
            `💡 **Đánh giá hệ**: ${compat.reason}\n\n` +
            `💪 **Lực chiến bổ trợ cho Pet**: **+${Math.floor((weapon.power || 0) * compat.efficiency)}**`
        )
        .setFooter(formatRpgFooter("Vũ khí Common tăng sức mạnh cho Pet trong mọi trận đấu"))
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Default: player equipping gear
    const cleanArg = args[0] ? args[0].trim().replace(/^[gG]/, "") : "";
    const itemId = Number(cleanArg);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return message.reply(`${config.emoji.no} Dùng đúng dạng: \`${this.usage}\``);
    }

    // Check if user tries to equip Common weapon on player character
    const targetItem = (user.rpg.items || []).find((it) => it.id === itemId);
    if (targetItem && targetItem.slot === "weapon" && targetItem.rarity === "Common") {
      return message.reply(
        `${config.emoji.warning} **Vũ khí phẩm chất Thường (Common)** được dành riêng để trang bị cho Linh Thú theo chuẩn hệ thống OwO!\n` +
          `Hãy sử dụng lệnh: \`${config.prefix}equip pet <tên_pet> ${itemId}\` để trang bị cho linh thú của bạn.`
      );
    }

    const { user: updatedUser, item } = await equipRpgItem(message.author.id, itemId);
    const embed = new EmbedBuilder()
      .setColor(getRpgColor("success"))
      .setTitle(formatRpgTitle("Trang bị thành công", item.emoji || getRarityEmoji(item.rarity)))
      .setDescription(
        `**${getGearDisplayName(item)}** đã được trang bị vào ô **${getSlotLabel(item.slot)}**.`,
      )
      .addFields(
        {
          name: "Trang bị",
          value:
            `Mã: \`G${String(item.id).padStart(3, "0")}\`\n` +
            `Độ hiếm: ${getRarityEmoji(item.rarity)} **${item.rarity}**\n` +
            `Lực chiến: **+${item.power.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "Lực chiến hiện tại",
          value: `**${updatedUser.rpg.power.toLocaleString()}**`,
          inline: true,
        },
      );

    let itemAttachment = null;
    const imgKey = item.imageKey || getItemImageFile(item);
    if (imgKey) {
      const itemImagePath = path.join(__dirname, "../../../assets/items", imgKey);
      if (fs.existsSync(itemImagePath)) {
        itemAttachment = new AttachmentBuilder(itemImagePath, { name: "item.png" });
        embed.setThumbnail("attachment://item.png");
      }
    }
    const payload = { embeds: [embed] };
    if (itemAttachment) {
      payload.files = [itemAttachment];
    }
    return message.reply(payload);
  },
};
