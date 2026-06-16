const { isDev } = require('../../utils/userUtil');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');
const { EmbedBuilder } = require('discord.js');
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

    message.reply(`⚙️ Bắt đầu khởi tạo phó bản giả lập **Chương ${chapter}** với tốc độ **${speed}x**...`);

    // Scale simulated players based on chapter difficulty (Highly buffed stats for rapid testing)
    const scale = 1.0 + (chapter - 1) * 0.45;
    const mockPlayers = [
      {
        id: "sim_warrior",
        name: "Warrior",
        level: 10 + chapter * 10,
        classKey: "warrior",
        maxHp: Math.floor(3000 * scale),
        hp: Math.floor(3000 * scale),
        potions: 3,
        stats: {
          vigor: Math.floor(100 * scale),
          str: Math.floor(250 * scale),
          dex: Math.floor(80 * scale),
          int: 10,
          arc: 10,
          pr: Math.floor(120 * scale),
        },
        power: Math.floor(5000 * scale),
        weapon: { name: "Thử Thách Kiếm", power: Math.floor(1500 * scale) },
        rpgClass: { name: "Warrior", emoji: "🛡️" },
        rage: 0,
        mana: 0,
      },
      {
        id: "sim_mage",
        name: "Mage",
        level: 10 + chapter * 10,
        classKey: "mage",
        maxHp: Math.floor(2500 * scale),
        hp: Math.floor(2500 * scale),
        potions: 3,
        stats: {
          vigor: Math.floor(80 * scale),
          str: 10,
          dex: Math.floor(60 * scale),
          int: Math.floor(300 * scale),
          arc: Math.floor(120 * scale),
          pr: Math.floor(80 * scale),
        },
        power: Math.floor(5500 * scale),
        weapon: { name: "Thử Thách Trượng", power: Math.floor(1800 * scale) },
        rpgClass: { name: "Mage", emoji: "🔮" },
        rage: 0,
        mana: 100,
      },
      {
        id: "sim_archer",
        name: "Archer",
        level: 10 + chapter * 10,
        classKey: "archer",
        maxHp: Math.floor(2700 * scale),
        hp: Math.floor(2700 * scale),
        potions: 3,
        stats: {
          vigor: Math.floor(90 * scale),
          str: Math.floor(50 * scale),
          dex: Math.floor(280 * scale),
          int: 10,
          arc: Math.floor(125 * scale),
          pr: Math.floor(90 * scale),
        },
        power: Math.floor(5200 * scale),
        weapon: { name: "Thử Thách Cung", power: Math.floor(1600 * scale) },
        rpgClass: { name: "Archer", emoji: "🏹" },
        rage: 0,
        mana: 0,
      }
    ];

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
      speed: speed, // Set speed multiplier!
    };

    client.rpgDungeons.set(channel.id, activeDungeon);

    // Start simulated dungeon
    dungeonCmd.setupRound(activeDungeon, channel);
  }
};
