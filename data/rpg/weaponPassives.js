const config = require("../config");

const WEAPON_PASSIVE_TRIGGER_RATE = 0.45;

const PASSIVE_TYPES = {
  NONE: "none",
  BLEED: "bleed",
  BURN: "burn",
  FREEZE: "freeze",
  STUN: "stun",
  HEAL_BAN: "heal_ban",
  LIFESTEAL: "lifesteal",
  DAMAGE_MULT: "damage_mult",
  ARMOR_PIERCE: "armor_pierce",
  MR_PIERCE: "mr_pierce",
  ARMOR_SHRED: "armor_shred",
  MR_SHRED: "mr_shred",
  DOUBLE_HIT: "double_hit",
  DEFLECT: "deflect",
  REFLECT: "reflect",
  HEAL_ON_SKILL: "heal_on_skill",
  NEXT_ATTACK_MULT: "next_attack_mult",
  RANDOM_EFFECT: "random_effect",
  POISON: "poison",
};

const PASSIVE_SCALING = {
  STR_DEX: (stats) => stats.str * 0.5 + stats.dex * 0.5,
  STR_ONLY: (stats) => stats.str,
  DEX_ONLY: (stats) => stats.dex,
  INT_ARC: (stats) => stats.int * 0.5 + stats.arc * 0.5,
  ARC_DEX: (stats) => stats.arc * 0.6 + stats.dex * 0.4,
  STR_DEX_POWER: (stats, power) => (stats.str * 0.4 + stats.dex * 0.3) + power * 0.02,
  DEX_ARC_POWER: (stats, power) => (stats.dex * 0.4 + stats.arc * 0.3) + power * 0.02,
};

const WEAPON_PASSIVES = {
  shadowdagger: {
    name: "Ảnh Hồn Đoản Đao",
    type: PASSIVE_TYPES.NONE,
    description: "Dungeon phá 22% giáp mỗi lần kích hoạt (tối đa 40%); PvP 25%; World Boss 30%.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.22,
        cap: 0.40,
        log: (name) => `⚔️ **[Shadow Dagger]** Phá hủy 22% giáp vật lý của **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.25,
        log: (name) => `⚔️ **[Shadow Dagger]** Phá hủy 25% giáp vật lý của **${name}**!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.30,
        permanent: true,
        log: () => `⚔️ **[Shadow Dagger]** Đã phá giáp boss! Phòng ngự vật lý giảm 30% cho đến hết trận.`,
      },
    },
  },

  poisondagger: {
    name: "Thuốc Độc Đoản Đao",
    type: PASSIVE_TYPES.POISON,
    description: "45% cơ hội tiêm kịch độc: gây độc trong 3 lượt và giảm 15% phòng ngự đối thủ.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.POISON,
        rounds: 3,
        scaling: PASSIVE_SCALING.DEX_ARC_POWER,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, alsoShredMR: true, cap: 0.30 },
        ],
        log: (name) => `🧪 **[Poison Dagger]** Kịch độc ăn mòn! **${name}** bị trúng độc 3 lượt và giảm 15% phòng ngự!`,
      },
      pvp: {
        type: PASSIVE_TYPES.POISON,
        rounds: 3,
        scaling: PASSIVE_SCALING.DEX_ARC_POWER,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, alsoShredMR: true, cap: 0.30 },
        ],
        log: (name) => `🧪 **[Poison Dagger]** Kịch độc ăn mòn! **${name}** bị trúng độc và giảm 15% phòng ngự!`,
      },
      boss: {
        type: PASSIVE_TYPES.POISON,
        rounds: 3,
        scaling: PASSIVE_SCALING.DEX_ARC_POWER,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, alsoShredMR: true, cap: 0.30 },
        ],
        log: () => `🧪 **[Poison Dagger]** Kịch độc ăn mòn Boss, làm suy giảm phòng ngự!`,
      },
    },
  },

  firesword: {
    name: "Hỏa Long Thần Kiếm",
    type: PASSIVE_TYPES.BURN,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.BURN,
        rounds: 2,
        scaling: PASSIVE_SCALING.STR_DEX,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: (name) => `🔥 **[Fire Sword]** Đòn chém rực lửa gây Thiêu Đốt và Giảm Hồi Máu lên **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        log: (name) => `🔥 **[Fire Sword]** Lửa thiêu đốt! **${name}** bị giảm hồi máu trong 2 lượt.`,
      },
      boss: {
        type: PASSIVE_TYPES.BURN,
        rounds: 0,
        duration_ms: 30000,
        healReduced: true,
        log: () => `⚔️ **[Fire Sword]** Thiêu đốt boss! Giảm 30% hồi máu của boss trong 30 giây.`,
      },
    },
  },

  greenstaff: {
    name: "Mộc Diệp Pháp Trượng",
    type: PASSIVE_TYPES.HEAL_ON_SKILL,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.HEAL_ON_SKILL,
        scaling: PASSIVE_SCALING.INT_ARC,
        log: (name, healAmt) => `💚 **[Mộc Diệp Pháp Trượng]** Hồi phục **${healAmt.toLocaleString()}** HP (10% máu đã mất) khi dùng kỹ năng!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.12,
        healType: "missing_hp",
        log: (name, healAmt) => `💚 **[Green Staff]** Hồi phục **${healAmt.toLocaleString()}** HP từ nội tại!`,
      },
      boss: {
        type: PASSIVE_TYPES.HEAL_ON_SKILL,
        scaling: PASSIVE_SCALING.INT_ARC,
        log: (name, healAmt) => `💚 **[Green Staff]** Hồi phục **${healAmt.toLocaleString()}** HP khi dùng kỹ năng!`,
      },
    },
  },

  bluestaff: {
    name: "Lam Tinh Thần Trượng",
    type: PASSIVE_TYPES.MR_PIERCE,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.25,
        alsoRoll: { type: PASSIVE_TYPES.FREEZE, rounds: 1, chance: 0.25 },
        log: (name) => `❄️ **[Blue Staff]** Xuyên 25% kháng phép!${Math.random() < 0.25 ? ` Làm đóng băng **${name}**!` : ""}`,
      },
      pvp: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.25,
        log: () => `❄️ **[Blue Staff]** Đòn đánh xuyên 25% kháng phép!`,
      },
      boss: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.50,
        log: () => `⚔️ **[Blue Staff]** Đòn đánh xuyên 50% kháng phép của boss.`,
      },
    },
  },

  crimsondagger: {
    name: "Huyết Nguyệt Đoản Đao",
    type: PASSIVE_TYPES.ARMOR_PIERCE,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.40,
        log: () => `🩸 **[Crimson Dagger]** Xuyên 40% phòng ngự vật lý!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.45,
        log: () => `🩸 **[Crimson Dagger]** Xuyên 45% phòng ngự vật lý!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.45,
        log: () => `⚔️ **[Crimson Dagger]** Đòn đánh xuyên 45% phòng ngự vật lý của boss.`,
      },
    },
  },

  gravitybow: {
    name: "Cung Trọng Lực",
    type: PASSIVE_TYPES.STUN,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        log: (name) => `⚡ **[Gravity Bow]** Bắn ra mũi tên trọng lực làm choáng **${name}** trong 1 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        log: (name) => `⚡ **[Gravity Bow]** Mũi tên trọng lực làm choáng **${name}**!`,
      },
      boss: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        log: (name) => `⚡ **[Gravity Bow]** Mũi tên trọng lực làm choáng **${name}**!`,
      },
    },
  },

  holysword: {
    name: "Thánh Kiếm Hoàng Kim",
    type: PASSIVE_TYPES.DAMAGE_MULT,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.65,
        hitCount: 3,
        log: () => `⚔️ **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.65x sát thương.`,
      },
      pvp: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.65,
        hitCount: 3,
        log: () => `⚔️ **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.65x sát thương.`,
      },
      boss: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.80,
        hitCount: 3,
        log: () => `⚔️ **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.80x sát thương.`,
      },
    },
  },

  darksword: {
    name: "Hắc Ám Ma Kiếm",
    type: PASSIVE_TYPES.NONE,
    description: "45% cơ hội giải phóng hắc khí: tăng 15% sát thương bóng tối và làm suy yếu mục tiêu (giảm 20% sát thương mục tiêu gây ra trong 2 lượt).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.15,
        targetAtkDown: true,
        selfDamageReduce: 0.20,
        log: (name) => `🌑 **[Dark Sword]** Hắc khí bao phủ làm suy yếu **${name}**, giảm 20% sát thương gây ra của mục tiêu!`,
      },
      pvp: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.15,
        targetAtkDown: true,
        selfDamageReduce: 0.20,
        log: (name) => `🌑 **[Dark Sword]** Hắc khí làm suy yếu **${name}**!`,
      },
      boss: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.15,
        selfDamageReduce: 0.20,
        log: () => `🌑 **[Dark Sword]** Hắc khí bao phủ! Giảm 20% sát thương của Boss lượt này và tăng 15% sát thương bóng tối.`,
      },
    },
  },

  darkstaff: {
    name: "Hắc Ám Thần Trượng",
    type: PASSIVE_TYPES.RANDOM_EFFECT,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15 },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.25 },
        ],
        log: () => `🔮 **[Dark Staff]** Hắc ám thay đổi hình thái!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15 },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.25 },
        ],
        log: () => `🔮 **[Dark Staff]** Hắc ám thay đổi hình thái!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, duration_ms: 30000, healReduced: true },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.30, permanent: true },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.50 },
        ],
        log: () => `⚔️ **[Dark Staff]** Hắc ám biến đổi!`,
      },
    },
  },

  duskanddawn: {
    name: "Thần Kiếm Song Cực",
    type: PASSIVE_TYPES.DOUBLE_HIT,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.28,
        log: () => `🌅 **[Dusk and Dawn]** Sức mạnh bình minh và hoàng hôn cộng hưởng! Đòn tấn công liên kích!`,
      },
      pvp: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.28,
        log: () => `🌅 **[Dusk and Dawn]** Liên kích!`,
      },
      boss: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.28,
        log: () => `🌅 **[Dusk and Dawn]** Liên kích!`,
      },
    },
  },

  riverofblood: {
    name: "Huyết Hải Thần Kiếm",
    type: PASSIVE_TYPES.LIFESTEAL,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.02,
        healType: "damage",
        log: (name, healAmt) => `❤️ **[River of Blood]** Hồi phục **${healAmt.toLocaleString()}** HP.`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.05,
        healType: "damage",
        log: (name, healAmt) => `❤️ **[River of Blood]** Hồi **${healAmt.toLocaleString()}** HP từ lifesteal!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.05,
        healType: "damage",
        log: (name, healAmt) => `⚔️ **[River of Blood]** Chém hồi máu bằng **${healAmt.toLocaleString()}** HP.`,
      },
    },
  },

  axesnake: {
    name: "Rìu Mãng Xà Hex",
    type: PASSIVE_TYPES.ARMOR_SHRED,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.10,
        cap: 0.40,
        alsoShredMR: true,
        log: (name, data) => `🐍 **[Axesnake]** Phá hủy 10% giáp! PR: ${data.armor.toLocaleString()} / MR: ${data.mr.toLocaleString()}.`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.10,
        cap: 0.80,
        log: () => `🐍 **[Axesnake]** Phá 10% giáp đối thủ!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.10,
        permanent: true,
        log: (name, data) => `⚔️ **[Axesnake]** Phá 10% giáp boss! Tổng cộng ${(data.totalReduced * 100).toFixed(0)}%.`,
      },
    },
  },

  sunbow: {
    name: "Sun Bow",
    type: PASSIVE_TYPES.ARMOR_PIERCE,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        alsoPierceMR: true,
        log: () => `☀️ **[Sun Bow]** Xuyên 10% phòng ngự!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        alsoPierceMR: true,
        log: () => `☀️ **[Sun Bow]** Xuyên 10% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        alsoPierceMR: true,
        log: () => `⚔️ **[Sun Bow]** Xuyên 10% giáp vật lý và kháng phép.`,
      },
    },
  },

  clawhex: {
    name: "Vuốt Độc Quyền Năng",
    type: PASSIVE_TYPES.BLEED,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.15,
        log: (name) => `🛡️ **[Clawhex]** Gây chảy máu 3 lượt + 15% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.15,
        log: (name) => `🛡️ **[Clawhex]** Chảy máu 3 lượt + 15% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.15,
        log: (name) => `⚔️ **[Clawhex]** Chảy máu + 15% sát thương!`,
      },
    },
  },

  spearhex: {
    name: "Spearhex",
    type: PASSIVE_TYPES.ARMOR_PIERCE,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        log: () => `🔱 **[Spearhex]** Xuyên 10% giáp!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        log: () => `🔱 **[Spearhex]** Xuyên 10% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        log: () => `⚔️ **[Spearhex]** Xuyên 10% giáp vật lý.`,
      },
    },
  },

  shieldhex: {
    name: "Shieldhex",
    type: PASSIVE_TYPES.REFLECT,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        log: () => `🛡️ **[Shieldhex]** Hấp thụ 15% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        log: () => `🛡️ **[Shieldhex]** Hấp thụ 15% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        log: () => `⚔️ **[Shieldhex]** Khiên Hex hấp thụ 15% sát thương.`,
      },
    },
  },

  lunashard: {
    name: "Lunashard",
    type: PASSIVE_TYPES.FREEZE,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        log: (name) => `🌙 **[Lunashard]** Ánh trăng đóng băng **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        log: (name) => `🌙 **[Lunashard]** Ánh trăng đóng băng!`,
      },
      boss: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        log: (name) => `🌙 **[Lunashard]** Ánh trăng đóng băng!`,
      },
    },
  },

  eclipsesoul: {
    name: "Eclipsesoul",
    type: PASSIVE_TYPES.RANDOM_EFFECT,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_PIERCE, amount: 0.30 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `🌑 **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_PIERCE, amount: 0.30 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `🌑 **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_PIERCE, amount: 0.30 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `🌑 **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
      },
    },
  },

  fallenangel: {
    name: "Thiên Sứ Sa Ngã",
    type: PASSIVE_TYPES.LIFESTEAL,
    description: "Cố định giảm 12% sát thương nhận vào; khi tấn công có 45% cơ hội tăng 20% sát thương và hồi phục 6% máu đã mất.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        healType: "missing_hp",
        damageMult: 1.20,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `🪽 **[Fallen Angel]** Lông vũ sa ngã bùng nổ! Tăng 20% sát thương và hồi phục **${healAmt.toLocaleString()}** HP!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        healType: "missing_hp",
        damageMult: 1.20,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `🪽 **[Fallen Angel]** Tăng 20% sát thương và hồi **${healAmt.toLocaleString()}** HP!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        healType: "missing_hp",
        damageMult: 1.20,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `🪽 **[Fallen Angel]** Hồi phục **${healAmt.toLocaleString()}** HP và tăng 20% sát thương lên Boss!`,
      },
    },
  },

  greeddagger: {
    name: "Đoản Đao Tham Lam",
    type: PASSIVE_TYPES.LIFESTEAL,
    description: "Hút máu 8% sát thương gây ra; khi mục tiêu dưới 50% HP gây thêm 25% sát thương chí mạng.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.25,
        log: (name, healAmt) => `💰 **[Greed Dagger]** Đoạt mệnh thôn phệ, hồi **${healAmt.toLocaleString()}** HP (+25% sát thương săn mồi)!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.25,
        log: (name, healAmt) => `💰 **[Greed Dagger]** Hút máu, hồi **${healAmt.toLocaleString()}** HP!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.25,
        log: (name, healAmt) => `💰 **[Greed Dagger]** Thôn phệ sinh lực Boss, hồi **${healAmt.toLocaleString()}** HP!`,
      },
    },
  },

  asmodeus: {
    name: "Trường Kiếm Dục Vọng",
    type: PASSIVE_TYPES.ARMOR_SHRED,
    description: "45% cơ hội kích hoạt Cuồng Vọng: tăng 30% sát thương và phá 15% giáp của mục tiêu trong 2 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.45,
        damageMult: 1.30,
        log: (name) => `👁️ **[Asmodeus]** Cuồng vọng bùng nổ! Tăng 30% sát thương và phá 15% giáp của **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.45,
        damageMult: 1.30,
        log: (name) => `👁️ **[Asmodeus]** Cuồng vọng tăng 30% sát thương và phá 15% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.45,
        damageMult: 1.30,
        log: () => `👁️ **[Asmodeus]** Cuồng vọng bùng nổ! Tăng 30% sát thương và phá giáp Boss!`,
      },
    },
  },

  soulreaper: {
    name: "Lưỡi Hái Linh Hồn",
    type: PASSIVE_TYPES.HEAL_BAN,
    description: "45% kích hoạt Gặt Hái Linh Hồn: cấm hồi máu 2 lượt. Khi mục tiêu dưới 35% HP gây thêm 40% sát thương kết liễu và hồi phục 5% HP.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        executeThreshold: 0.35,
        executeBonus: 0.40,
        lifestealPct: 0.05,
        log: (name) => `⛓️ **[Soul Reaper]** Lưỡi hái gặt hồn! **${name}** bị cấm hồi máu 2 lượt và chịu thêm sát thương kết liễu!`,
      },
      pvp: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        executeThreshold: 0.35,
        executeBonus: 0.40,
        lifestealPct: 0.05,
        log: () => `⛓️ **[Soul Reaper]** Lưỡi hái gặt hồn! Cấm hồi máu và kết liễu mục tiêu thấp máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        executeThreshold: 0.35,
        executeBonus: 0.40,
        lifestealPct: 0.05,
        log: () => `⚔️ **[Soul Reaper]** Lưỡi hái gặt hồn! Khóa hồi phục Boss và tăng sát thương kết liễu!`,
      },
    },
  },

  beelzebub: {
    name: "Xúc Tu Ruồi Hoại Tử",
    type: PASSIVE_TYPES.ARMOR_SHRED,
    description: "45% cơ hội kích hoạt Đàn Ruồi Hoại Tử: ăn mòn 20% giáp và 20% kháng phép mục tiêu trong 2 lượt, đồng thời hồi 5% HP tối đa.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.20,
        cap: 0.40,
        alsoShredMR: true,
        healPctMaxHp: 0.05,
        log: (name) => `💀 **[Beelzebub]** Bầy ruồi hoại tử gặm nhấm, phá 20% song phòng của **${name}** và hồi 5% HP!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.20,
        cap: 0.40,
        alsoShredMR: true,
        healPctMaxHp: 0.05,
        log: (name) => `💀 **[Beelzebub]** Bầy ruồi phá 20% phòng ngự và hồi máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.20,
        cap: 0.40,
        alsoShredMR: true,
        healPctMaxHp: 0.05,
        log: () => `💀 **[Beelzebub]** Bầy ruồi hoại tử ăn mòn song phòng Boss!`,
      },
    },
  },

  satan: {
    name: "Ma Kiếm Hỏa Ngục",
    type: PASSIVE_TYPES.BURN,
    description: "45% kích hoạt Hỏa Ngục Tận Thế: thiêu đốt mục tiêu 3 lượt (theo STR) và cấm hồi máu 2 lượt. Tăng 10% sát thương.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.10,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: (name) => `🔥 **[Satan]** Ngọn lửa địa ngục thiêu rụi **${name}**, gây thiêu đốt cực mạnh và cấm hồi máu 2 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.10,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: (name) => `🔥 **[Satan]** Hỏa ngục thiêu rụi đối thủ và cấm hồi máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.10,
        duration_ms: 30000,
        healReduced: true,
        log: () => `🔥 **[Satan]** Hỏa ngục thiêu đốt Boss, khóa hồi phục và tăng sát thương!`,
      },
    },
  },

  bladesorrow: {
    name: "Bladesorrow",
    type: PASSIVE_TYPES.BLEED,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, cap: 0.30 },
        ],
        log: (name) => `🗡️ **[Bladesorrow]** Lưỡi kiếm bi thương khiến **${name}** chảy máu 3 lượt và giảm 15% giáp (tối đa 30%)!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.12, cap: 0.25 },
        ],
        log: (name) => `🗡️ **[Bladesorrow]** Vết chém bi thương khiến đối thủ bị xuất huyết và giảm 12% giáp (tối đa 25%)!`,
      },
      boss: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, cap: 0.30 },
        ],
        log: () => `🗡️ **[Bladesorrow]** Lưỡi kiếm bi thương găm sâu vào Boss, gây chảy máu và phá giáp!`,
      },
    },
  },

  frostgauntlet: {
    name: "Găng Tay Băng Giá",
    type: PASSIVE_TYPES.FREEZE,
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.33,
        log: (name) => `❄️ **[Găng Tay Băng Giá]** Hàn khí đóng băng **${name}** trong 1 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        log: (name) => `❄️ **[Găng Tay Băng Giá]** Đối thủ bị đóng băng trong 1 lượt!`,
      },
      boss: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.20,
        log: () => `❄️ **[Găng Tay Băng Giá]** Hàn khí làm chậm nhịp hành động của boss!`,
      },
    },
  },

  demonbook: {
    name: "Quỷ Thư",
    type: PASSIVE_TYPES.RANDOM_EFFECT,
    description: "45% kích hoạt tà thuật cổ đại: ngẫu nhiên Hỏa Ngục (thiêu đốt + cấm hồi máu), Hủ Bại (phá 30% giáp & kháng phép), hoặc Hóa Đá (choáng 1 lượt).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.30, alsoShredMR: true, cap: 0.50 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `📖 **[Quỷ Thư]** Lời nguyền tà thuật cổ đại giải phóng!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.30, alsoShredMR: true },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `📖 **[Quỷ Thư]** Lời nguyền tà thuật giải phóng!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.30, alsoShredMR: true },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `📖 **[Quỷ Thư]** Lời nguyền tà thuật gieo rắc lên Boss!`,
      },
    },
  },

  thorshammer: {
    name: "Búa Lôi Thần Thor",
    type: PASSIVE_TYPES.STUN,
    description: "45% cơ hội gọi Thiên Lôi Giáng Thế: làm choáng mục tiêu 1 lượt và tăng 35% sát thương lôi điện.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        damageMult: 1.35,
        log: (name) => `⚡ **[Búa Lôi Thần Thor]** Thiên lôi giáng thế! Làm choáng **${name}** và tăng 35% sát thương lôi điện!`,
      },
      pvp: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        damageMult: 1.35,
        log: (name) => `⚡ **[Búa Lôi Thần Thor]** Thiên lôi làm choáng đối thủ và tăng sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        damageMult: 1.35,
        log: () => `⚡ **[Búa Lôi Thần Thor]** Sấm thần làm gián đoạn Boss và tăng sát thương!`,
      },
    },
  },

  odinhammer: {
    name: "Búa Toàn Tri Odin",
    type: PASSIVE_TYPES.DAMAGE_MULT,
    description: "Đòn đánh thứ 3 được Odin khai nhãn: gây 1.75x sát thương và xuyên 50% kháng phép mục tiêu.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.75,
        hitCount: 3,
        mrPierce: 0.50,
        log: () => `🦉 **[Búa Toàn Tri Odin]** Cổ ngữ khải huyền! Đòn đánh thứ 3 gây 1.75x sát thương và xuyên 50% kháng phép!`,
      },
      pvp: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.75,
        hitCount: 3,
        mrPierce: 0.50,
        log: () => `🦉 **[Búa Toàn Tri Odin]** Đòn đánh thứ 3 xuyên kháng phép và gây 1.75x sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.75,
        hitCount: 3,
        mrPierce: 0.50,
        log: () => `🦉 **[Búa Toàn Tri Odin]** Đòn thứ 3 gây 1.75x sát thương và xuyên kháng phép Boss!`,
      },
    },
  },

  darkhold: {
    name: "Bí Thuật Hắc Ám Darkhold",
    type: PASSIVE_TYPES.MR_SHRED,
    description: "45% kích hoạt Trói Buộc Hư Vô: phá 25% kháng phép mục tiêu và giảm 15% sát thương nhận vào trong 2 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.25,
        cap: 0.50,
        selfDamageReduce: 0.15,
        log: (name) => `📜 **[Darkhold]** Bí thuật hư vô ăn mòn 25% kháng phép của **${name}** và giảm 15% sát thương nhận vào!`,
      },
      pvp: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.25,
        selfDamageReduce: 0.15,
        log: (name) => `📜 **[Darkhold]** Phá 25% kháng phép và giảm 15% sát thương nhận vào!`,
      },
      boss: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.25,
        permanent: true,
        selfDamageReduce: 0.15,
        log: () => `📜 **[Darkhold]** Bí thuật hư vô làm suy yếu 25% kháng phép Boss!`,
      },
    },
  },
};

const LOCKED_WEAPONS = [];
const PASSIVE_KEY_BY_NAME = Object.fromEntries(
  Object.entries(WEAPON_PASSIVES).map(([key, passive]) => [
    passive.name?.toLowerCase().replace(/\s+/g, ""),
    key,
  ])
);

const normalizePassiveKey = (subType) => {
  const clean = String(subType || "").toLowerCase().replace(/\s+/g, "");
  if (WEAPON_PASSIVES[clean]) return clean;
  if (PASSIVE_KEY_BY_NAME[clean]) return PASSIVE_KEY_BY_NAME[clean];
  if (clean.includes("darkhold") || clean.includes("bithuathacam")) return "darkhold";
  if (clean.includes("soulreaper") || clean.includes("luoihailinhhon")) return "soulreaper";
  if (clean.includes("frostgauntlet") || clean.includes("gangtaybanggia")) return "frostgauntlet";
  if (clean.includes("bladesorrow") || clean.includes("bithuong")) return "bladesorrow";
  for (const [nameKey, wpKey] of Object.entries(PASSIVE_KEY_BY_NAME)) {
    if (clean.includes(nameKey) || clean.includes(wpKey)) return wpKey;
  }
  return clean;
};

const getWeaponPassive = (subType) => {
  if (!subType) return null;
  const clean = normalizePassiveKey(subType);
  return WEAPON_PASSIVES[clean] || null;
};

const isLockedWeapon = (subType) => {
  if (!subType) return false;
  const clean = normalizePassiveKey(subType);
  return WEAPON_PASSIVES[clean] === undefined;
};

const getPassiveForMode = (subType, mode) => {
  const passive = getWeaponPassive(subType);
  if (!passive) return null;
  return passive.mode[mode] || null;
};

module.exports = {
  WEAPON_PASSIVE_TRIGGER_RATE,
  PASSIVE_TYPES,
  PASSIVE_SCALING,
  WEAPON_PASSIVES,
  LOCKED_WEAPONS,
  getWeaponPassive,
  isLockedWeapon,
  getPassiveForMode,
};
