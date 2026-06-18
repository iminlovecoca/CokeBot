const { isDev } = require('../../utils/userUtil');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const dungeonCmd = require('../rpg/dungeon');

module.exports = {
  name: 'sim',
  aliases: ['simdungeon', 'simpb'],
  description: 'Mô phỏng tự động chơi thử phó bản Dungeon dành cho Admin',
  usage: `${config.prefix}sim [chapter c1-c6] [speed 1x-4x]`,
  async execute(message, args = []) {
    if (!isDev(message.author.id)) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không có quyền dùng lệnh này!`);
    }

    const client = message.client;
    const channel = message.channel;

    if (!client.rpgDungeons) {
      client.rpgDungeons = new Map();
    }

    if (client.rpgDungeons.has(channel.id)) {
      return message.reply("❌ Đang có một phó bản hoặc mô phỏng diễn ra tại kênh này. Vui lòng đợi kết thúc!");
    }

    // Parse arguments
    const argStr = args.join(' ').toLowerCase();

    // 1. Chapter parsing
    let chapter = 1;
    const chapterMatch = argStr.match(/(?:chapter\s+c?|c|ch)?([1-6])/);
    if (chapterMatch) {
      chapter = parseInt(chapterMatch[1]);
    } else {
      return message.reply(`💡 Hãy nhập chương cần mô phỏng (ví dụ: \`${config.prefix}sim chapter c4\` hoặc \`${config.prefix}sim c4\` hoặc \`${config.prefix}sim 4\`). Mặc định đang chọn chương 1.`);
    }

    // 2. Speed parsing (e.g. 2x, 0.5x, 4x, fast, slow)
    let speed = 1.0;
    const speedMatch = argStr.match(/(\d+(?:\.\d+)?)\s*x/);
    if (speedMatch) {
      speed = parseFloat(speedMatch[1]);
    } else if (argStr.includes('fast') || argStr.includes('nhanh')) {
      speed = 2.0;
    } else if (argStr.includes('superfast') || argStr.includes('cực nhanh')) {
      speed = 4.0;
    } else if (argStr.includes('slow') || argStr.includes('chậm')) {
      speed = 0.5;
    }

    // Limit speed to a reasonable range
    speed = Math.max(0.1, Math.min(10.0, speed));

    // Initialize mock players with default settings scaled by chapter
    const defaultLevel = 10 + chapter * 10;
    const simPlayers = [
      {
        name: "Warrior",
        classKey: "warrior",
        level: defaultLevel,
        weaponName: "Crimson Dagger",
        weaponRank: "Epic",
        enhance: 0,
      },
      {
        name: "Mage",
        classKey: "mage",
        level: defaultLevel,
        weaponName: "Blue Staff",
        weaponRank: "Epic",
        enhance: 0,
      },
      {
        name: "Archer",
        classKey: "archer",
        level: defaultLevel,
        weaponName: "Gravity Bow",
        weaponRank: "Epic",
        enhance: 0,
      },
    ];

    const generateSetupEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor("#3498DB")
        .setTitle("⚙️ CẤU HÌNH GIẢ LẬP DUNGEON")
        .setDescription(
          `**Chương:** \`Chương ${chapter}\` | **Tốc độ:** \`${speed}x\`\n\n` +
          `**Đội ngũ mô phỏng hiện tại:**`
        );

      simPlayers.forEach((p, idx) => {
        const classIcon = p.classKey === "warrior" ? "🛡️" : (p.classKey === "mage" ? "🔮" : (p.classKey === "archer" ? "🏹" : "👤"));
        embed.addFields({
          name: `${classIcon} Nhân vật ${idx + 1}: ${p.name}`,
          value: `▫️ **Class:** \`${p.classKey}\`\n▫️ **Level:** \`Lvl ${p.level}\`\n▫️ **Vũ khí:** \`${p.weaponName} (${p.weaponRank}) +${p.enhance}\``,
          inline: true
        });
      });

      return embed;
    };

    const generateSetupComponents = () => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("sim_select_player")
        .setPlaceholder("Chọn nhân vật để chỉnh sửa...")
        .addOptions(
          simPlayers.map((p, idx) => ({
            label: `Chỉnh sửa nhân vật ${idx + 1} (${p.classKey.toUpperCase()})`,
            value: String(idx),
            description: `Lvl ${p.level} | ${p.weaponName} +${p.enhance}`,
          }))
        );

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("sim_start")
          .setLabel("Bắt đầu Giả lập ▶️")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("sim_cancel")
          .setLabel("Hủy ❌")
          .setStyle(ButtonStyle.Secondary)
      );

      return [selectRow, btnRow];
    };

    const panelMsg = await message.reply({
      embeds: [generateSetupEmbed()],
      components: generateSetupComponents(),
    });

    const collector = panelMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000, // 5 minutes
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "sim_select_player") {
        const idx = parseInt(interaction.values[0]);
        const player = simPlayers[idx];

        const modal = new ModalBuilder()
          .setCustomId(`sim_edit_modal_${idx}`)
          .setTitle(`Chỉnh sửa nhân vật ${idx + 1}`);

        const classInput = new TextInputBuilder()
          .setCustomId("sim_class")
          .setLabel("Class (warrior/assassin/mage/archer/paladin)")
          .setStyle(TextInputStyle.Short)
          .setValue(player.classKey)
          .setMinLength(3)
          .setMaxLength(10)
          .setRequired(true);

        const levelInput = new TextInputBuilder()
          .setCustomId("sim_level")
          .setLabel("Cấp độ (1 - 120)")
          .setStyle(TextInputStyle.Short)
          .setValue(String(player.level))
          .setMaxLength(3)
          .setRequired(true);

        const weaponInput = new TextInputBuilder()
          .setCustomId("sim_weapon_name")
          .setLabel("Tên Vũ khí")
          .setStyle(TextInputStyle.Short)
          .setValue(player.weaponName)
          .setMaxLength(30)
          .setRequired(true);

        const rankInput = new TextInputBuilder()
          .setCustomId("sim_weapon_rank")
          .setLabel("Bậc (Common/Rare/Epic/Legendary/Mythic...)")
          .setStyle(TextInputStyle.Short)
          .setValue(player.weaponRank)
          .setMaxLength(15)
          .setRequired(true);

        const enhanceInput = new TextInputBuilder()
          .setCustomId("sim_enhance")
          .setLabel("Cường hóa (+0 đến +20)")
          .setStyle(TextInputStyle.Short)
          .setValue(String(player.enhance))
          .setMaxLength(2)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(classInput),
          new ActionRowBuilder().addComponents(levelInput),
          new ActionRowBuilder().addComponents(weaponInput),
          new ActionRowBuilder().addComponents(rankInput),
          new ActionRowBuilder().addComponents(enhanceInput)
        );

        await interaction.showModal(modal);

        // Await Modal submission
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i) => i.customId === `sim_edit_modal_${idx}` && i.user.id === message.author.id,
          time: 120000,
        }).catch(() => null);

        if (!modalSubmit) return;

        await modalSubmit.deferUpdate();

        // Parse & validate values
        const classKey = modalSubmit.fields.getTextInputValue("sim_class").trim().toLowerCase();
        const level = parseInt(modalSubmit.fields.getTextInputValue("sim_level").trim());
        const weaponName = modalSubmit.fields.getTextInputValue("sim_weapon_name").trim();
        const weaponRankRaw = modalSubmit.fields.getTextInputValue("sim_weapon_rank").trim();
        const enhance = parseInt(modalSubmit.fields.getTextInputValue("sim_enhance").trim());

        const validClasses = ["warrior", "assassin", "mage", "archer", "paladin", "wretch"];
        if (!validClasses.includes(classKey)) {
          return modalSubmit.followUp({ content: `❌ Class \`${classKey}\` không hợp lệ. Chỉ chấp nhận: ${validClasses.join(", ")}`, ephemeral: true });
        }

        if (isNaN(level) || level < 1 || level > 120) {
          return modalSubmit.followUp({ content: "❌ Cấp độ phải là số từ 1 đến 120.", ephemeral: true });
        }

        const validRanks = ["common", "rare", "epic", "legendary", "mythic", "ancient", "divine"];
        if (!validRanks.includes(weaponRankRaw.toLowerCase())) {
          return modalSubmit.followUp({ content: `❌ Bậc vũ khí \`${weaponRankRaw}\` không hợp lệ. Chấp nhận: Common, Rare, Epic, Legendary, Mythic, Ancient, Divine.`, ephemeral: true });
        }

        if (isNaN(enhance) || enhance < 0 || enhance > 20) {
          return modalSubmit.followUp({ content: "❌ Cấp độ cường hóa phải là số từ 0 đến 20.", ephemeral: true });
        }

        // Format weapon rank correctly
        const weaponRank = weaponRankRaw.charAt(0).toUpperCase() + weaponRankRaw.slice(1).toLowerCase();

        // Update player info
        simPlayers[idx] = {
          name: classKey.charAt(0).toUpperCase() + classKey.slice(1),
          classKey,
          level,
          weaponName,
          weaponRank,
          enhance,
        };

        // Update setup panel
        await panelMsg.edit({
          embeds: [generateSetupEmbed()],
          components: generateSetupComponents(),
        }).catch(() => null);

      } else if (interaction.customId === "sim_cancel") {
        collector.stop("cancelled");
      } else if (interaction.customId === "sim_start") {
        collector.stop("start");
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "cancelled") {
        await panelMsg.delete().catch(() => null);
        return;
      }

      if (reason !== "start") {
        await panelMsg.edit({ content: "⏳ Hết thời gian thiết lập giả lập phó bản.", embeds: [], components: [] }).catch(() => null);
        return;
      }

      await panelMsg.delete().catch(() => null);
      channel.send(`⚙️ Bắt đầu khởi tạo phó bản giả lập **Chương ${chapter}** với tốc độ **${speed}x**...`);

      // 3. Compute player effective stats and weapon properties
      const { getRpgClass } = require('../../utils/rpgUtil');

      const getClassBaseStats = (classKey) => {
        const bases = {
          warrior: { vigor: 25, str: 20, dex: 12, int: 8, arc: 8, pr: 15, mr: 8 },
          assassin: { vigor: 15, str: 18, dex: 25, int: 8, arc: 12, pr: 8, mr: 8 },
          mage: { vigor: 12, str: 8, dex: 10, int: 25, arc: 15, pr: 8, mr: 18 },
          archer: { vigor: 18, str: 12, dex: 22, int: 8, arc: 15, pr: 10, mr: 8 },
          paladin: { vigor: 28, str: 15, dex: 10, int: 10, arc: 8, pr: 20, mr: 12 },
          wretch: { vigor: 10, str: 10, dex: 10, int: 10, arc: 10, pr: 10, mr: 10 },
        };
        return bases[classKey] || bases.wretch;
      };

      const getWeaponBasePowerByRank = (rank) => {
        const powers = {
          common: 100,
          rare: 300,
          epic: 800,
          legendary: 1800,
          mythic: 3500,
          ancient: 6000,
          divine: 10000,
        };
        return powers[String(rank).toLowerCase()] || powers.epic;
      };

      const getEnhanceMult = (enhanceLevel) => {
        return 1 + (enhanceLevel || 0) * 0.10;
      };

      const mockPlayers = simPlayers.map((p, idx) => {
        const base = getClassBaseStats(p.classKey);
        const statsScale = 1.0 + (p.level - 1) * 0.08;
        const stats = {};
        for (const [k, v] of Object.entries(base)) {
          stats[k] = Math.floor(v * statsScale);
        }

        const baseWpPower = getWeaponBasePowerByRank(p.weaponRank);
        const weaponPower = Math.floor(baseWpPower * getEnhanceMult(p.enhance));
        const gearPower = Math.floor(weaponPower * 2.5 + p.level * 50);

        const maxHp = 150 + stats.vigor * 20 + p.level * 20;
        const rpgClass = getRpgClass(p.classKey) || { name: p.classKey, emoji: "👤" };

        return {
          id: `sim_${p.classKey}_${idx}`,
          name: `Sim ${rpgClass.name} ${idx + 1}`,
          level: p.level,
          classKey: p.classKey,
          maxHp: maxHp,
          hp: maxHp,
          potions: 3,
          stats: stats,
          power: gearPower,
          weapon: {
            name: p.weaponName,
            subType: p.weaponName.toLowerCase().replace(/\s+/g, ""),
            power: weaponPower,
          },
          rpgClass: rpgClass,
          rage: 0,
          mana: (p.classKey === "mage") ? 100 : 0,
        };
      });

      // Create simulated dungeon state
      const activeDungeon = {
        guildId: "simulation_guild",
        chapter: chapter,
        blessing: "active",
        round: 1,
        players: mockPlayers,
        currentActor: null,
        enemy: null,
        diceRolled: false,
        diceMultiplier: 1.0,
        coinFlipCount: 0,
        phase2Madness: 1.0,
        consecutiveCoinSuccess: 0,
        logs: ["🏁 Bắt đầu chế độ MÔ PHỎNG DUNGEON! Toàn bộ lượt đi phe ta sẽ được Bot tự động điều phối."],
        actionInProgress: false,
        gameMessage: null,
        roundEndTime: Date.now() + 5 * 60 * 1000,
        timeoutTimer: null,
        totalDamageTaken: 0,
        archerDoubleDmgNext: false,
        archerCasterId: null,
        isSimulation: true,
        speed: speed,
      };

      client.rpgDungeons.set(channel.id, activeDungeon);

      // Start simulated dungeon
      dungeonCmd.setupRound(activeDungeon, channel);
    });
  }
};
