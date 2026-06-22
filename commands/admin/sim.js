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

    if (args[0]?.toLowerCase() === 'boss') {
      const bossKey = args[1];
      let playerCount = parseInt(args[2]);
      if (isNaN(playerCount) || playerCount <= 0) {
        playerCount = 20; // Default to 20
      }
      playerCount = Math.min(100, Math.max(1, playerCount));

      if (!bossKey) {
        throw new UserFriendlyError(
          `${config.emoji.no} Bạn cần nhập key boss để mô phỏng. Ví dụ: \`${config.prefix}sim boss boss_XI 30\` hoặc \`hexia\`, \`godhexa\`.`
        );
      }

      const bossTiers = config.rpg.boss?.tiers || [];
      const boss = bossTiers.find(t => t.key.toLowerCase() === bossKey.toLowerCase());
      if (!boss) {
        const availableKeys = bossTiers.map(t => `\`${t.key}\``).join(", ");
        throw new UserFriendlyError(
          `${config.emoji.no} Không tìm thấy boss với key \`${bossKey}\`.\nDanh sách boss khả dụng: ${availableKeys}`
        );
      }

      await message.reply(`⚙️ Đang tải dữ liệu người chơi RPG và khởi tạo mô phỏng trận chiến với **${boss.name}**...`);

      const User = require('../../models/User');
      const { getRpgClass, getEffectiveRpgStats, calculateRpgPower, getEquippedItems, dungeonKeys } = require('../../utils/rpgUtil');

      // Fetch active RPG characters
      const realUsers = await User.find({ "rpg.classKey": { $ne: null } }).limit(playerCount).exec();
      
      const CLASS_ATTACK_TYPES = {
        warrior: "physical",
        assassin: "physical",
        archer: "physical",
        mage: "magical",
        paladin: "physical",
        wretch: "physical",
      };

      const classes = ["warrior", "assassin", "mage", "archer", "paladin"];

      const mockPlayers = [];
      
      // Map real players
      for (const u of realUsers) {
        const stats = getEffectiveRpgStats(u);
        const power = calculateRpgPower(u);
        const equipped = getEquippedItems(u);
        const weapon = equipped.weapon;
        const maxHp = 150 + stats.vigor * 20 + u.rpg.level * 20;
        
        mockPlayers.push({
          id: u.userId,
          name: u.rpg.name || `Người chơi ${u.userId.slice(-4)}`,
          level: u.rpg.level,
          classKey: u.rpg.classKey,
          stats: stats,
          power: power,
          weapon: weapon,
          maxHp: maxHp,
          hp: maxHp,
          isMock: false,
          coke: u.coke || 0,
          attacks: 0,
          damageDealt: 0,
          koCount: 0,
          shieldhexAbsorbed: 0,
          shieldhexRounds: 0,
        });
      }

      // Fill with mock players if needed
      while (mockPlayers.length < playerCount) {
        const randClass = classes[Math.floor(Math.random() * classes.length)];
        const level = Math.floor(Math.random() * 50) + 30; // Level 30 - 80
        
        const bases = {
          warrior: { vigor: 25, str: 20, dex: 12, int: 8, arc: 8, pr: 15, mr: 8 },
          assassin: { vigor: 15, str: 18, dex: 25, int: 8, arc: 12, pr: 8, mr: 8 },
          mage: { vigor: 12, str: 8, dex: 10, int: 25, arc: 15, pr: 8, mr: 18 },
          archer: { vigor: 18, str: 12, dex: 22, int: 8, arc: 15, pr: 10, mr: 8 },
          paladin: { vigor: 28, str: 15, dex: 10, int: 10, arc: 8, pr: 20, mr: 12 },
        };
        
        const base = bases[randClass];
        const statsScale = 1.0 + (level - 1) * 0.08;
        const stats = {};
        for (const [k, v] of Object.entries(base)) {
          stats[k] = Math.floor(v * statsScale);
        }
        
        const weaponPower = 800 + level * 20; // Epic-like weapon
        const power = weaponPower * 2.5 + level * 50;
        const maxHp = 150 + stats.vigor * 20 + level * 20;

        mockPlayers.push({
          id: `mock_${randClass}_${mockPlayers.length}`,
          name: `Mock ${randClass.toUpperCase()} ${mockPlayers.length + 1}`,
          level: level,
          classKey: randClass,
          stats: stats,
          power: power,
          weapon: {
            name: "Giả Lập Kiếm",
            subType: "longsword",
            power: weaponPower
          },
          maxHp: maxHp,
          hp: maxHp,
          isMock: true,
          coke: 50000,
          attacks: 0,
          damageDealt: 0,
          koCount: 0,
          shieldhexAbsorbed: 0,
          shieldhexRounds: 0,
        });
      }

      // Simulate the boss fight
      let bossHp = boss.hp;
      const bossMaxHp = boss.hp;
      let activeBossEffects = {
        armorReduced: 0,
        healReduced: false,
        clawhexBleed: false,
        bleedRounds: 0,
        bleedDamage: 0
      };

      let totalAttacks = 0;
      let totalKOs = 0;
      let lastHitUser = null;

      // 3 rounds of attacks per player
      for (let round = 1; round <= 3; round++) {
        if (bossHp <= 0) break;

        for (const p of mockPlayers) {
          if (bossHp <= 0) break;

          // Bleed tick check
          if (activeBossEffects.bleedRounds > 0) {
            const bleedDmg = activeBossEffects.bleedDamage;
            bossHp = Math.max(0, bossHp - bleedDmg);
            activeBossEffects.bleedRounds -= 1;
            if (bossHp <= 0) {
              lastHitUser = p;
              break;
            }
          }

          if (p.hp <= 0) {
            if (Math.random() < 0.40 && p.coke >= 1000) {
              p.hp = p.maxHp;
              p.coke -= 1000;
            } else {
              continue;
            }
          }

          p.attacks += 1;
          totalAttacks += 1;

          // Damage calculation
          const isMagical = CLASS_ATTACK_TYPES[p.classKey] === "magical";
          const baseAttack = isMagical
            ? p.stats.int * 3.5 + p.stats.arc * 1.5
            : p.stats.str * 2.5 + p.stats.dex * 1.5;

          const weaponPower = p.weapon?.power || 0;
          let rawDamage = (baseAttack + weaponPower);

          // Apply event weapon passives
          const subType = p.weapon?.subType ? p.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
          if (subType === "sunbow" && isMagical) {
            rawDamage *= 1.036;
          }
          if (subType === "clawhex") {
            activeBossEffects.bleedRounds = 3;
            activeBossEffects.clawhexBleed = true;
            activeBossEffects.bleedDamage = Math.floor(p.stats.str * 0.5 + p.stats.dex * 0.5);
            rawDamage *= 1.15;
          } else if (activeBossEffects.bleedRounds > 0 && activeBossEffects.clawhexBleed) {
            rawDamage *= 1.15;
          }

          rawDamage *= 0.85 + Math.random() * 0.3; // variance

          const critRate = Math.min(0.5, (p.stats.arc * 0.2 + p.stats.dex * 0.1) / 100);
          const isCrit = Math.random() < critRate;
          if (isCrit) {
            rawDamage *= (1.5 + p.stats.dex * 0.002);
          }

          // Mitigation
          let mrOrArmor = isMagical ? boss.magicResist : boss.armor;
          
          if (subType === "axesnake") {
            activeBossEffects.armorReduced = Math.min(0.9, (activeBossEffects.armorReduced || 0) + 0.10);
          }
          if (activeBossEffects.armorReduced) {
            mrOrArmor *= (1 - activeBossEffects.armorReduced);
          }

          if (!isMagical && subType === "spearhex") {
            mrOrArmor *= 0.90;
          }

          const mitigation = mrOrArmor / (mrOrArmor + 1000);
          let damage = Math.max(10, Math.floor(rawDamage * (1 - mitigation)));

          bossHp = Math.max(0, bossHp - damage);
          p.damageDealt += damage;

          if (bossHp <= 0) {
            lastHitUser = p;
            break;
          }

          // Boss counterattack
          let bossDmg = boss.attackPower * (0.85 + Math.random() * 0.3);
          const playerRes = isMagical ? p.stats.mr : p.stats.pr;
          const playerMitigation = (playerRes * 3.0 + p.power * 0.10) / (playerRes * 3.0 + p.power * 0.10 + 1000);
          let counterDmg = Math.max(10, Math.floor(bossDmg * (1 - playerMitigation)));

          if (subType.includes("shieldhex")) {
            counterDmg = Math.floor(counterDmg * 0.80);
            p.shieldhexAbsorbed = (p.shieldhexAbsorbed || 0) + counterDmg;
            p.shieldhexRounds = (p.shieldhexRounds || 0) + 1;
            
            const reflectDmg = Math.floor(counterDmg * 0.90);
            bossHp = Math.max(0, bossHp - reflectDmg);
            p.damageDealt += reflectDmg;
            p.shieldhexAbsorbed = 0;
            p.shieldhexRounds = 0;
            
            if (bossHp <= 0) {
              lastHitUser = p;
              break;
            }
          }

          p.hp = Math.max(0, p.hp - counterDmg);
          if (p.hp <= 0) {
            p.koCount += 1;
            totalKOs += 1;

            if (boss.key === "boss_XI") {
              const healAmt = Math.floor((bossMaxHp - bossHp) * 0.20);
              bossHp = Math.min(bossMaxHp, bossHp + healAmt);
            }
          }
        }
      }

      // Build Result Embed
      const victory = bossHp <= 0;
      const embed = new EmbedBuilder()
        .setColor(victory ? "#2ECC71" : "#E74C3C")
        .setTitle(`📊 GIẢ LẬP WORLD BOSS: ${boss.name}`)
        .setDescription(
          `• Kết quả: ${victory ? "🏆 **CHIẾN THẮNG**" : "💀 **THẤT BẠI**"}\n` +
          `• HP của Boss: **${bossHp.toLocaleString()} / ${bossMaxHp.toLocaleString()}** (${((bossHp / bossMaxHp) * 100).toFixed(2)}% còn lại)\n` +
          `• Tổng số lượt đánh: **${totalAttacks}** | Số mạng ngã xuống: **${totalKOs}**\n` +
          `${victory && lastHitUser ? `• Đòn kết liễu (Last Hit): **${lastHitUser.name}**\n` : ""}`
        )
        .setTimestamp();

      const top5 = [...mockPlayers].sort((a, b) => b.damageDealt - a.damageDealt).slice(0, 5);
      let topField = "";
      top5.forEach((p, idx) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `\`#${idx + 1}\``;
        const pct = ((p.damageDealt / bossMaxHp) * 100).toFixed(2);
        topField += `${medal} **${p.name}** (${p.classKey.toUpperCase()} Lvl ${p.level})\n` +
                   `└ Sát thương: **${p.damageDealt.toLocaleString()}** (${pct}% HP Boss) | Chết: **${p.koCount}** lần\n`;
      });
      
      embed.addFields({
        name: "🏆 Top 5 Sát Thương Gây Ra",
        value: topField || "*Không có ai gây sát thương.*",
        inline: false
      });

      let rewardText = `• **Last Hit:** ${victory && lastHitUser ? `Nhận thưởng Last Hit theo rank ${boss.rank}` : "Không có"}\n`;
      if (boss.key === "hexia") {
        rewardText += `• **Thưởng thêm (Hexia First Clear):** Vũ khí Mythic Axesnake + 80 Linh Hồn\n`;
      } else if (boss.key === "godhexa") {
        rewardText += `• **Thưởng thêm (Godhexa):** 360 Linh Hồn + 1 Mảnh Vũ Khí Hex\n`;
      } else {
        rewardText += `• **Thưởng theo Rank Boss:** ${boss.rank.toUpperCase()} (Coke, EXP, Gear drops)\n`;
      }

      embed.addFields({
        name: "🎁 Phân Phối Phần Thưởng Dự Kiến",
        value: rewardText,
        inline: false
      });

      return message.reply({ embeds: [embed] });
    }

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
