const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../data/config");
const { getUser } = require("../../utils/userUtil");
const { getRpgClass, getCharacterAssetPath, requireRpgCharacter } = require("../../utils/rpgUtil");
const { getSkinPrice } = require("../../data/rpg/skins");

module.exports = {
  name: "skin",
  aliases: ["skins", "skinshop"],
  description: "Cửa hàng skin nhân vật RPG của bạn.",
  usage: `${config.prefix}skin`,

  async execute(message) {
    // Ensure the user has an RPG character
    await requireRpgCharacter(message.author.id);

    const user = await getUser(message.author.id);
    const rpgClass = getRpgClass(user.rpg.classKey);
    if (!rpgClass) {
      return message.reply("❌ Không tìm thấy thông tin class nhân vật của bạn!");
    }

    const className = rpgClass.name;
    const skinsDir = path.join(__dirname, "../../assets/skins", className);

    let skinFiles = [];
    if (fs.existsSync(skinsDir)) {
      skinFiles = fs.readdirSync(skinsDir).filter(file => file.endsWith(".png"));
    }

    if (skinFiles.length === 0) {
      return message.reply(`❌ Hiện tại class **${className}** chưa có skin nào trong cửa hàng!`);
    }

    // Function to generate the main shop embed and components
    const buildMainShop = (currentUser) => {
      const embed = new EmbedBuilder()
        .setColor(rpgClass.color || "#FFD700")
        .setTitle(`🛒 CỬA HÀNG SKIN - CLASS ${className.toUpperCase()} 🛒`)
        .setDescription(
          `Chào mừng bạn đến với cửa hàng skin!\n` +
          `Số Coke hiện tại: **${currentUser.coke.toLocaleString()} Coke**\n\n` +
          `**Danh sách skin:**\n` +
          skinFiles.map(file => {
            const skinName = file.replace(".png", "");
            const isUX = file.toLowerCase().includes("ux");
            const price = getSkinPrice(file);
            const isOwned = currentUser.ownedSkins && currentUser.ownedSkins.includes(file);

            let statusStr = "";
            if (isOwned) {
              statusStr = "✅ *Đã sở hữu*";
            } else if (isUX) {
              statusStr = "⭐ *Hữu hạn*";
            } else {
              statusStr = `💰 **${price.toLocaleString()} Coke**`;
            }

            return `• **${skinName}**: ${statusStr}`;
          }).join("\n") +
          `\n\n*Hãy chọn một skin dưới menu để xem preview và tiến hành mua.*`
        )
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("skin_shop_select")
        .setPlaceholder("Chọn một skin để xem chi tiết...");

      const options = skinFiles.map(file => {
        const skinName = file.replace(".png", "");
        const isUX = file.toLowerCase().includes("ux");
        const price = getSkinPrice(file);
        const isOwned = currentUser.ownedSkins && currentUser.ownedSkins.includes(file);

        let desc = "";
        if (isOwned) {
          desc = "Đã sở hữu skin này";
        } else if (isUX) {
          desc = "Skin Hữu hạn - Chỉ có từ Gacha";
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
      time: 180000, // 3 minutes
    });

    let selectedFile = null;

    collector.on("collect", async (interaction) => {
      const u = await getUser(message.author.id);

      if (interaction.customId === "skin_shop_select") {
        selectedFile = interaction.values[0];
        const skinName = selectedFile.replace(".png", "");
        const isUX = selectedFile.toLowerCase().includes("ux");
        const price = getSkinPrice(selectedFile);
        const isOwned = u.ownedSkins && u.ownedSkins.includes(selectedFile);

        const assetPath = getCharacterAssetPath(selectedFile);
        const attachment = new AttachmentBuilder(assetPath, { name: selectedFile });

        const embed = new EmbedBuilder()
          .setColor(rpgClass.color || "#FFD700")
          .setTitle(`✨ Chi Tiết Skin: ${skinName} ✨`)
          .setDescription(
            `• Class: **${className}**\n` +
            `• Trạng thái: ${isOwned ? "✅ Đã sở hữu" : (isUX ? "⭐ Hữu hạn" : "🛒 Đang bán")}\n` +
            (isUX ? `• **Chỉ có thể sở hữu từ Gacha (Hữu hạn)**\n` : `• Giá: **${price.toLocaleString()} Coke**\n`) +
            `• Số Coke bạn có: **${u.coke.toLocaleString()} Coke**`
          )
          .setImage(`attachment://${selectedFile}`)
          .setTimestamp();

        const btnRow = new ActionRowBuilder();

        const buyBtn = new ButtonBuilder()
          .setCustomId("skin_shop_buy")
          .setLabel(isOwned ? "Đã sở hữu" : (isUX ? "Hữu hạn (Gacha)" : `Mua Skin (${price.toLocaleString()} Coke)`))
          .setStyle(ButtonStyle.Success)
          .setDisabled(isOwned || isUX || u.coke < price);

        const backBtn = new ButtonBuilder()
          .setCustomId("skin_shop_back")
          .setLabel("Quay lại")
          .setStyle(ButtonStyle.Secondary);

        btnRow.addComponents(buyBtn, backBtn);

        await interaction.update({
          embeds: [embed],
          components: [btnRow],
          files: [attachment]
        });

      } else if (interaction.customId === "skin_shop_back") {
        const payload = buildMainShop(u);
        await interaction.update(payload);

      } else if (interaction.customId === "skin_shop_buy") {
        if (!selectedFile) {
          return interaction.reply({ content: "❌ Không tìm thấy thông tin skin đã chọn!", flags: 64 });
        }

        const price = getSkinPrice(selectedFile);
        const isUX = selectedFile.toLowerCase().includes("ux");
        const isOwned = u.ownedSkins && u.ownedSkins.includes(selectedFile);

        if (isOwned) {
          return interaction.reply({ content: "❌ Bạn đã sở hữu skin này rồi!", flags: 64 });
        }

        if (isUX) {
          return interaction.reply({ content: "❌ Skin này là skin Hữu hạn, chỉ có thể sở hữu từ Gacha!", flags: 64 });
        }

        if (u.coke < price) {
          return interaction.reply({ content: `❌ Bạn không đủ Coke! Cần thêm **${(price - u.coke).toLocaleString()} Coke** để mua.`, flags: 64 });
        }

        // Process transaction
        u.coke -= price;
        if (!u.ownedSkins) {
          u.ownedSkins = [];
        }
        u.ownedSkins.push(selectedFile);
        u.markModified("ownedSkins");
        await u.save();

        const skinName = selectedFile.replace(".png", "");
        const successEmbed = new EmbedBuilder()
          .setColor("#57F287")
          .setTitle("🎉 MUA SKIN THÀNH CÔNG! 🎉")
          .setDescription(
            `Chúc mừng bạn đã mua thành công skin **${skinName}**!\n` +
            `• Đã khấu trừ: **-${price.toLocaleString()} Coke**\n` +
            `• Số Coke còn lại: **${u.coke.toLocaleString()} Coke**\n\n` +
            `*Bạn có thể dùng lệnh \`class\` -> nhấn nút **Skins** để đổi sang skin mới.*`
          )
          .setTimestamp();

        // Update the button row to show disabled "Đã sở hữu"
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

        await interaction.update({
          embeds: [successEmbed],
          components: [btnRow],
          files: []
        });
      }
    });

    collector.on("end", async () => {
      // Disable select menu or components when time expires
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
};
