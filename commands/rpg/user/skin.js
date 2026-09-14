const BaseCommand = require("../../../core/BaseCommand");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../../data/config");
const { getUser, isDev } = require("../../../utils/userUtil");
const { getRpgClass, getCharacterAssetPath, requireRpgCharacter } = require("../../../utils/rpgUtil");
const {
  getSkinPrice,
  getHonorSkinInfo,
  getGenderFromCharacterAsset,
  isSkinForGender,
  getHonorSkinOwnershipKeys,
} = require("../../../data/rpg/skins");
const { getClassEmoji, getRpgColor, formatRpgFooter, formatRpgTitle, safeInteractionReply, safeInteractionUpdate } = require("../../../utils/rpgUi");

const isSkinOwned = (user, skinFile) => {
  const ownedSkins = Array.isArray(user?.rpg?.ownedSkins) ? user.rpg.ownedSkins : [];
  return getHonorSkinOwnershipKeys(skinFile).some((key) => ownedSkins.includes(key));
};
class SkinCommand extends BaseCommand {
  constructor() {
    super({
      name: "skin",
      aliases: ["skins", "skinshop"],
      description: "Cửa hàng skin nhân vật RPG của bạn.",
      usage: `${config.prefix}skin`,
      cooldown: 0
    });
  }
  async execute(message) {
    await requireRpgCharacter(message.author.id);
    const user = await getUser(message.author.id);
    const rpgClass = getRpgClass(user.rpg.classKey);
    if (!rpgClass) {
      return message.reply("❌ Không tìm thấy thông tin class nhân vật của bạn!");
    }
    const className = rpgClass.name;
    const skinsDir = path.join(__dirname, "../../../assets/skins", className);
    const currentGender = getGenderFromCharacterAsset(user.rpg.characterAsset || rpgClass.asset);
    let skinFiles = [];
    if (fs.existsSync(skinsDir)) {
      skinFiles = fs.readdirSync(skinsDir)
        .filter(file => (file.endsWith(".png") || file.endsWith(".gif")) && isSkinForGender(file, currentGender));
    }
    if (skinFiles.length === 0) {
      return message.reply(`❌ Hiện tại class **${className}** chưa có skin nào trong cửa hàng!`);
    }
    const buildMainShop = (currentUser) => {
      const embed = new EmbedBuilder()
        .setColor(rpgClass.color || getRpgColor("reward"))
        .setTitle(formatRpgTitle(`Cửa hàng skin • ${className}`, getClassEmoji(currentUser.rpg.classKey)))
        .setDescription(
          `Chọn một skin bên dưới để xem preview và giá mở khóa.\n` +
          `Số dư: **${currentUser.coke.toLocaleString()} Coke**\n\n` +
          `**Danh sách skin:**\n` +
          skinFiles.map(file => {
            const skinName = file.replace(/\.(png|gif)$/i, "");
            const isUX = file.toLowerCase().includes("ux");
            const honorInfo = getHonorSkinInfo(file);
            const price = getSkinPrice(file);
            const isOwned = isSkinOwned(currentUser, file);
            let statusStr = "";
            if (isOwned) {
              statusStr = "✅ *Đã sở hữu*";
            } else if (honorInfo) {
              statusStr = `🏆 *Phần thưởng cuối mùa • ${honorInfo.rank}*`;
            } else if (isUX) {
              statusStr = "⭐ *Hữu hạn*";
            } else if (typeof price === "object" && price !== null) {
              statusStr = `💰 **${price.coke.toLocaleString()} Coke** + **${price.souls} L.Hồn**`;
            } else {
              statusStr = `💰 **${price.toLocaleString()} Coke**`;
            }
            return `• **${skinName}**: ${statusStr}`;
          }).join("\n") +
          `\n\n*Skin vinh danh Legendary+ chỉ được trao khi chốt mùa.*`
        )
        .setFooter(formatRpgFooter("Skin hữu hạn chỉ nhận từ Gacha"));
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("skin_shop_select")
        .setPlaceholder("Chọn một skin để xem chi tiết...");
      const options = skinFiles.map(file => {
        const skinName = file.replace(/\.(png|gif)$/i, "");
        const isUX = file.toLowerCase().includes("ux");
        const honorInfo = getHonorSkinInfo(file);
        const price = getSkinPrice(file);
        const isOwned = isSkinOwned(currentUser, file);
        let desc = "";
        if (isOwned) {
          desc = "Đã sở hữu skin này";
        } else if (honorInfo) {
          desc = `Phần thưởng cuối mùa ở rank ${honorInfo.rank}`;
        } else if (isUX) {
          desc = "Skin Hữu hạn - Chỉ có từ Gacha";
        } else if (typeof price === "object" && price !== null) {
          desc = `Giá: ${(price.coke / 1000000).toFixed(1)}M Coke + ${price.souls} Linh Hồn`;
        } else {
          desc = `Giá: ${price.toLocaleString()} Coke`;
        }
        return {
          label: skinName + (isOwned ? " (Đã sở hữu)" : (isUX ? " (Hữu hạn)" : "")),
          value: file,
          description: desc,
        };
      });
      selectMenu.addOptions(options);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      return { embeds: [embed], components: [row], files: [] };
    };
    const mainPayload = buildMainShop(user);
    const shopMsg = await message.reply(mainPayload);
    const collector = shopMsg.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 180000, 
    });
    let selectedFile = null;
    collector.on("collect", async (interaction) => {
      const u = await getUser(message.author.id);
      if (interaction.customId === "skin_shop_select") {
        selectedFile = interaction.values[0];
        const skinName = selectedFile.replace(/\.(png|gif)$/i, "");
        const isUX = selectedFile.toLowerCase().includes("ux");
        const honorInfo = getHonorSkinInfo(selectedFile);
        const price = getSkinPrice(selectedFile);
        const isOwned = isSkinOwned(u, selectedFile);
        const assetPath = getCharacterAssetPath(selectedFile);
        const attachment = new AttachmentBuilder(assetPath, { name: selectedFile });
        const currentSouls = u.inventory.get("souls") || 0;
        const isAuthorDev = isDev(message.author.id);
        let priceText = "";
        let hasEnoughFunds = false;
        let btnLabel = "";
        if (honorInfo) {
          priceText = `• 🏆 Phần thưởng cuối mùa ở rank **${honorInfo.rank}** (không bán)\n`;
          btnLabel = "Phần thưởng mùa";
          hasEnoughFunds = false;
        } else if (isUX) {
          priceText = `• **Chỉ có thể sở hữu từ Gacha (Hữu hạn)**\n`;
          btnLabel = "Hữu hạn (Gacha)";
          hasEnoughFunds = false;
        } else if (typeof price === "object" && price !== null) {
          priceText = `• Giá: **${price.coke.toLocaleString()} Coke** + **${price.souls} Linh Hồn** <:souls:1518749776538243082>\n`;
          btnLabel = `Mua skin (${(price.coke / 1000000).toFixed(1)}M Coke + ${price.souls} LH)`;
          hasEnoughFunds = isAuthorDev || (u.coke >= price.coke && currentSouls >= price.souls);
        } else {
          priceText = `• Giá: **${price.toLocaleString()} Coke**\n`;
          btnLabel = `Mua skin (${price.toLocaleString()} Coke)`;
          hasEnoughFunds = isAuthorDev || (u.coke >= price);
        }
        const embed = new EmbedBuilder()
          .setColor(rpgClass.color || getRpgColor("reward"))
          .setTitle(formatRpgTitle(`Chi tiết skin • ${skinName}`, "✨"))
          .setDescription(
            `• Class: **${className}**\n` +
            `• Trạng thái: ${isOwned ? "✅ Đã sở hữu" : (honorInfo ? "🏆 Vinh danh" : (isUX ? "⭐ Hữu hạn" : "🛒 Đang bán"))}\n` +
            priceText +
            `• Số Coke bạn có: **${u.coke.toLocaleString()} Coke**\n` +
            `• Số Linh Hồn bạn có: **${currentSouls}** <:souls:1518749776538243082>`
          )
          .setImage(`attachment://${selectedFile}`)
          .setFooter(formatRpgFooter("Preview skin • kiểm tra giá trước khi mua"))
          .setTimestamp();
        const btnRow = new ActionRowBuilder();
        const buyBtn = new ButtonBuilder()
          .setCustomId("skin_shop_buy")
          .setLabel(isOwned ? "Đã sở hữu" : btnLabel)
          .setStyle(ButtonStyle.Success)
          .setDisabled(isOwned || isUX || Boolean(honorInfo) || !hasEnoughFunds);
        const backBtn = new ButtonBuilder()
          .setCustomId("skin_shop_back")
          .setLabel("Quay lại")
          .setStyle(ButtonStyle.Secondary);
        btnRow.addComponents(buyBtn, backBtn);
        await safeInteractionUpdate(interaction, {
          embeds: [embed],
          components: [btnRow],
          files: [attachment]
        });
      } else if (interaction.customId === "skin_shop_back") {
        const payload = buildMainShop(u);
        await safeInteractionUpdate(interaction, payload);
      } else if (interaction.customId === "skin_shop_buy") {
        if (!selectedFile) {
          return safeInteractionReply(interaction, { content: "❌ Không tìm thấy thông tin skin đã chọn!", flags: 64 });
        }
        const price = getSkinPrice(selectedFile);
        const isUX = selectedFile.toLowerCase().includes("ux");
        const honorInfo = getHonorSkinInfo(selectedFile);
        const isOwned = isSkinOwned(u, selectedFile);
        if (isOwned) {
          return safeInteractionReply(interaction, { content: "❌ Bạn đã sở hữu skin này rồi!", flags: 64 });
        }
        if (honorInfo) {
          return safeInteractionReply(interaction, { content: `❌ Skin ${honorInfo.rank} là phần thưởng vinh danh cuối mùa, không thể mua.`, flags: 64 });
        }
        if (isUX) {
          return safeInteractionReply(interaction, { content: "❌ Skin này là skin Hữu hạn, chỉ có thể sở hữu từ Gacha!", flags: 64 });
        }
        const currentSouls = u.inventory.get("souls") || 0;
        const isAuthorDev = isDev(message.author.id);
        let deductedText = "";
        if (isAuthorDev) {
          if (typeof price === "object" && price !== null) {
            deductedText = `• Đã khấu trừ: **-${price.coke.toLocaleString()} Coke** và **-${price.souls} Linh Hồn** <:souls:1518749776538243082>\n` +
                           `• Số Linh Hồn còn lại: **${currentSouls.toLocaleString()}** <:souls:1518749776538243082>\n`;
          } else {
            deductedText = `• Đã khấu trừ: **-${price.toLocaleString()} Coke**\n`;
          }
        } else if (typeof price === "object" && price !== null) {
          if (u.coke < price.coke) {
            return safeInteractionReply(interaction, { content: `❌ Bạn không đủ Coke! Cần thêm **${(price.coke - u.coke).toLocaleString()} Coke** để mua.`, flags: 64 });
          }
          if (currentSouls < price.souls) {
            return safeInteractionReply(interaction, { content: `❌ Bạn không đủ Linh Hồn! Cần thêm **${price.souls - currentSouls} Linh Hồn** <:souls:1518749776538243082> để mua.`, flags: 64 });
          }
          u.coke -= price.coke;
          u.inventory.set("souls", currentSouls - price.souls);
          u.markModified("inventory");
          deductedText = `• Đã khấu trừ: **-${price.coke.toLocaleString()} Coke** và **-${price.souls} Linh Hồn** <:souls:1518749776538243082>\n` +
                         `• Số Linh Hồn còn lại: **${(currentSouls - price.souls).toLocaleString()}** <:souls:1518749776538243082>\n`;
        } else {
          if (u.coke < price) {
            return safeInteractionReply(interaction, { content: `❌ Bạn không đủ Coke! Cần thêm **${(price - u.coke).toLocaleString()} Coke** để mua.`, flags: 64 });
          }
          u.coke -= price;
          deductedText = `• Đã khấu trừ: **-${price.toLocaleString()} Coke**\n`;
        }
        if (!u.rpg.ownedSkins) {
          u.rpg.ownedSkins = [];
        }
        u.rpg.ownedSkins.push(selectedFile);
        u.markModified("rpg");
        await u.save();
        const skinName = selectedFile.replace(/\.(png|gif)$/i, "");
        const successEmbed = new EmbedBuilder()
          .setColor(getRpgColor("success"))
          .setTitle(formatRpgTitle("Mua skin thành công", "🎉"))
          .setDescription(
            `Chúc mừng bạn đã mua thành công skin **${skinName}**!\n` +
            deductedText +
            `• Số Coke còn lại: **${u.coke.toLocaleString()} Coke**\n\n` +
            `*Bạn có thể dùng lệnh \`class\` → nhấn nút **Skin** để đổi sang skin mới.*`
          )
          .setFooter(formatRpgFooter("Dùng class → Skin để áp dụng skin mới"))
          .setTimestamp();
        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("skin_shop_buy")
            .setLabel("Đã sở hữu")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("skin_shop_back")
            .setLabel("Quay lại cửa hàng")
            .setStyle(ButtonStyle.Secondary)
        );
        await safeInteractionUpdate(interaction, {
          embeds: [successEmbed],
          components: [btnRow],
          files: []
        });
      }
    });
    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("skin_shop_disabled")
          .setPlaceholder("Cửa hàng đã hết hạn tương tác.")
          .setDisabled(true)
          .addOptions({ label: "Hết hạn", value: "expired" })
      );
      await shopMsg.edit({ components: [disabledRow] }).catch(() => null);
    });
  }
}
module.exports = new SkinCommand();
