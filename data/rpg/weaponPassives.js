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

const getStatEmojis = () => {
  const ps = config.emoji?.petStats || {};
  return {
    hp: ps.hp || "",
    att: ps.att || "",
    pr: ps.pr || "",
    wp: ps.wp || "",
    mag: ps.mag || "",
    mr: ps.mr || "",
    hybrid: ps.hybrid || (ps.att && ps.mag ? `${ps.att}/${ps.mag}` : ""),
  };
};

const getStatusEmojis = () => {
  const st = config.emoji?.status || {};
  return {
    bleed: st.bleed || "<:bleed:1521938497642958889>",
    burn: st.burn || "<:burn:1521938494094835774>",
    stun: st.stun || "<:stun:1521938490605178910>",
    heal: st.heal || "<:heal:1521938487907975198>",
    dispe: st.dispe || "<:dispe:1521938483730710578>",
    break: st.break || "<:break:1521938480337391736>",
    atkup: st.atkup || "<:atkup:1521938477359300648>",
    atkdown: st.atkdown || "<:atkdown:1521938474587000913>",
    healreduction: st.healreduction || "<:healreduction:1523340558855045190>",
    poisonous: st.poisonous || "<:poisonous:1522374367542247424>",
    taunt: st.taunt || "<:taunt:1521938510485917796>",
    frostbite: st.frostbite || "<:frostbite:1521938506425958431>",
    freeze: st.freeze || "<:freeze:1521938500478566639>",
    lifesteal: st.lifesteal || "",
    armor_pierce: st.armor_pierce || "",
    mr_pierce: st.mr_pierce || "",
    mr_shred: st.mr_shred || "",
    double_hit: st.double_hit || "",
    third_hit: st.third_hit || "",
    reflect: st.reflect || "",
    shield_guard: st.shield_guard || "",
    execute: st.execute || "",
    crit_up: st.crit_up || "",
    chaos_curse: st.chaos_curse || "",
  };
};

const st = getStatusEmojis();

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
        log: (name) => `${st.break} **[Shadow Dagger]** Phá hủy 22% giáp vật lý của **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.25,
        log: (name) => `${st.break} **[Shadow Dagger]** Phá hủy 25% giáp vật lý của **${name}**!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.30,
        permanent: true,
        log: () => `${st.break} **[Shadow Dagger]** Đã phá giáp boss! Phòng ngự vật lý giảm 30% cho đến hết trận.`,
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
        log: (name) => `${st.poisonous} **[Poison Dagger]** Kịch độc ăn mòn! **${name}** bị trúng độc 3 lượt và giảm 15% phòng ngự!`,
      },
      pvp: {
        type: PASSIVE_TYPES.POISON,
        rounds: 3,
        scaling: PASSIVE_SCALING.DEX_ARC_POWER,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, alsoShredMR: true, cap: 0.30 },
        ],
        log: (name) => `${st.poisonous} **[Poison Dagger]** Kịch độc ăn mòn! **${name}** bị trúng độc và giảm 15% phòng ngự!`,
      },
      boss: {
        type: PASSIVE_TYPES.POISON,
        rounds: 3,
        scaling: PASSIVE_SCALING.DEX_ARC_POWER,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, alsoShredMR: true, cap: 0.30 },
        ],
        log: () => `${st.poisonous} **[Poison Dagger]** Kịch độc ăn mòn Boss, làm suy giảm phòng ngự!`,
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
        log: (name) => `${st.burn} **[Fire Sword]** Đòn chém rực lửa gây Thiêu Đốt và Giảm Hồi Máu lên **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        log: (name) => `${st.healreduction} **[Fire Sword]** Lửa thiêu đốt! **${name}** bị giảm hồi máu trong 2 lượt.`,
      },
      boss: {
        type: PASSIVE_TYPES.BURN,
        rounds: 0,
        duration_ms: 30000,
        healReduced: true,
        log: () => `${st.burn} **[Fire Sword]** Thiêu đốt boss! Giảm 30% hồi máu của boss trong 30 giây.`,
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
        log: (name, healAmt) => `${st.heal} **[Mộc Diệp Pháp Trượng]** Hồi phục **${healAmt.toLocaleString()}** HP (10% máu đã mất) khi dùng kỹ năng!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.12,
        healType: "missing_hp",
        log: (name, healAmt) => `${st.heal} **[Green Staff]** Hồi phục **${healAmt.toLocaleString()}** HP từ nội tại!`,
      },
      boss: {
        type: PASSIVE_TYPES.HEAL_ON_SKILL,
        scaling: PASSIVE_SCALING.INT_ARC,
        log: (name, healAmt) => `${st.heal} **[Green Staff]** Hồi phục **${healAmt.toLocaleString()}** HP khi dùng kỹ năng!`,
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
        log: (name) => `${st.break} **[Blue Staff]** Xuyên 25% kháng phép!${Math.random() < 0.25 ? ` ${st.freeze} Làm đóng băng **${name}**!` : ""}`,
      },
      pvp: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.25,
        log: () => `${st.break} **[Blue Staff]** Đòn đánh xuyên 25% kháng phép!`,
      },
      boss: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.50,
        log: () => `${st.break} **[Blue Staff]** Đòn đánh xuyên 50% kháng phép của boss.`,
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
        log: () => `${st.break} **[Crimson Dagger]** Xuyên 40% phòng ngự vật lý!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.45,
        log: () => `${st.break} **[Crimson Dagger]** Xuyên 45% phòng ngự vật lý!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.45,
        log: () => `${st.break} **[Crimson Dagger]** Đòn đánh xuyên 45% phòng ngự vật lý của boss.`,
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
        log: (name) => `${st.stun} **[Gravity Bow]** Bắn ra mũi tên trọng lực làm choáng **${name}** trong 1 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        log: (name) => `${st.stun} **[Gravity Bow]** Mũi tên trọng lực làm choáng **${name}**!`,
      },
      boss: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        log: (name) => `${st.stun} **[Gravity Bow]** Mũi tên trọng lực làm choáng **${name}**!`,
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
        log: () => `${st.atkup} **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.65x sát thương.`,
      },
      pvp: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.65,
        hitCount: 3,
        log: () => `${st.atkup} **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.65x sát thương.`,
      },
      boss: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.80,
        hitCount: 3,
        log: () => `${st.atkup} **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.80x sát thương.`,
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
        log: (name) => `${st.atkdown} **[Dark Sword]** Hắc khí bao phủ làm suy yếu **${name}**, giảm 20% sát thương gây ra của mục tiêu!`,
      },
      pvp: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.15,
        targetAtkDown: true,
        selfDamageReduce: 0.20,
        log: (name) => `${st.atkdown} **[Dark Sword]** Hắc khí làm suy yếu **${name}**!`,
      },
      boss: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.15,
        selfDamageReduce: 0.20,
        log: () => `${st.atkdown} **[Dark Sword]** Hắc khí bao phủ! Giảm 20% sát thương của Boss lượt này và tăng 15% sát thương bóng tối.`,
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
        log: () => `${st.dispe} **[Dark Staff]** Hắc ám thay đổi hình thái!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15 },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.25 },
        ],
        log: () => `${st.dispe} **[Dark Staff]** Hắc ám thay đổi hình thái!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, duration_ms: 30000, healReduced: true },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.30, permanent: true },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.50 },
        ],
        log: () => `${st.dispe} **[Dark Staff]** Hắc ám biến đổi!`,
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
        log: () => `${st.atkup} **[Dusk and Dawn]** Sức mạnh bình minh và hoàng hôn cộng hưởng! Đòn tấn công liên kích!`,
      },
      pvp: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.28,
        log: () => `${st.atkup} **[Dusk and Dawn]** Liên kích!`,
      },
      boss: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.28,
        log: () => `${st.atkup} **[Dusk and Dawn]** Liên kích!`,
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
        log: (name, healAmt) => `${st.heal} **[River of Blood]** Hồi phục **${healAmt.toLocaleString()}** HP.`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.05,
        healType: "damage",
        log: (name, healAmt) => `${st.heal} **[River of Blood]** Hồi **${healAmt.toLocaleString()}** HP từ lifesteal!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.05,
        healType: "damage",
        log: (name, healAmt) => `${st.heal} **[River of Blood]** Chém hồi máu bằng **${healAmt.toLocaleString()}** HP.`,
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
        log: (name, data) => `${st.break} **[Axesnake]** Phá hủy 10% giáp! PR: ${data.armor.toLocaleString()} / MR: ${data.mr.toLocaleString()}.`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.10,
        cap: 0.80,
        log: () => `${st.break} **[Axesnake]** Phá 10% giáp đối thủ!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.10,
        permanent: true,
        log: (name, data) => `${st.break} **[Axesnake]** Phá 10% giáp boss! Tổng cộng ${(data.totalReduced * 100).toFixed(0)}%.`,
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
        log: () => `${st.break} **[Sun Bow]** Xuyên 10% phòng ngự!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        alsoPierceMR: true,
        log: () => `${st.break} **[Sun Bow]** Xuyên 10% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        alsoPierceMR: true,
        log: () => `${st.break} **[Sun Bow]** Xuyên 10% giáp vật lý và kháng phép.`,
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
        log: () => `${st.bleed} **[Clawhex]** Gây chảy máu 3 lượt + 15% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.15,
        log: () => `${st.bleed} **[Clawhex]** Chảy máu 3 lượt + 15% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.15,
        log: () => `${st.bleed} **[Clawhex]** Chảy máu + 15% sát thương!`,
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
        log: () => `${st.break} **[Spearhex]** Xuyên 10% giáp!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        log: () => `${st.break} **[Spearhex]** Xuyên 10% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.10,
        log: () => `${st.break} **[Spearhex]** Xuyên 10% giáp vật lý.`,
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
        log: () => `${st.taunt} **[Shieldhex]** Hấp thụ 15% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        log: () => `${st.taunt} **[Shieldhex]** Hấp thụ 15% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        log: () => `${st.taunt} **[Shieldhex]** Khiên Hex hấp thụ 15% sát thương.`,
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
        log: (name) => `${st.freeze} **[Lunashard]** Ánh trăng đóng băng **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        log: () => `${st.freeze} **[Lunashard]** Ánh trăng đóng băng!`,
      },
      boss: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        log: () => `${st.freeze} **[Lunashard]** Ánh trăng đóng băng!`,
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
        log: () => `${st.burn} **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_PIERCE, amount: 0.30 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.burn} **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_PIERCE, amount: 0.30 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.burn} **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
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
        log: (name, healAmt) => `${st.heal} **[Fallen Angel]** Lông vũ sa ngã bùng nổ! Tăng 20% sát thương và hồi phục **${healAmt.toLocaleString()}** HP!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        healType: "missing_hp",
        damageMult: 1.20,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `${st.heal} **[Fallen Angel]** Tăng 20% sát thương và hồi **${healAmt.toLocaleString()}** HP!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        healType: "missing_hp",
        damageMult: 1.20,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `${st.heal} **[Fallen Angel]** Hồi phục **${healAmt.toLocaleString()}** HP và tăng 20% sát thương lên Boss!`,
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
        log: (name, healAmt) => `${st.heal} **[Greed Dagger]** Đoạt mệnh thôn phệ, hồi **${healAmt.toLocaleString()}** HP (+25% sát thương săn mồi)!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.25,
        log: (name, healAmt) => `${st.heal} **[Greed Dagger]** Hút máu, hồi **${healAmt.toLocaleString()}** HP!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.25,
        log: (name, healAmt) => `${st.heal} **[Greed Dagger]** Thôn phệ sinh lực Boss, hồi **${healAmt.toLocaleString()}** HP!`,
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
        log: (name) => `${st.atkup} **[Asmodeus]** Cuồng vọng bùng nổ! Tăng 30% sát thương và phá 15% giáp của **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.45,
        damageMult: 1.30,
        log: () => `${st.atkup} **[Asmodeus]** Cuồng vọng tăng 30% sát thương và phá 15% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.45,
        damageMult: 1.30,
        log: () => `${st.atkup} **[Asmodeus]** Cuồng vọng bùng nổ! Tăng 30% sát thương và phá giáp Boss!`,
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
        log: (name) => `${st.healreduction} **[Soul Reaper]** Lưỡi hái gặt hồn! **${name}** bị cấm hồi máu 2 lượt và chịu thêm sát thương kết liễu!`,
      },
      pvp: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        executeThreshold: 0.35,
        executeBonus: 0.40,
        lifestealPct: 0.05,
        log: () => `${st.healreduction} **[Soul Reaper]** Lưỡi hái gặt hồn! Cấm hồi máu và kết liễu mục tiêu thấp máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        executeThreshold: 0.35,
        executeBonus: 0.40,
        lifestealPct: 0.05,
        log: () => `${st.healreduction} **[Soul Reaper]** Lưỡi hái gặt hồn! Khóa hồi phục Boss và tăng sát thương kết liễu!`,
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
        log: (name) => `${st.poisonous} **[Beelzebub]** Bầy ruồi hoại tử gặm nhấm, phá 20% song phòng của **${name}** và hồi 5% HP!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.20,
        cap: 0.40,
        alsoShredMR: true,
        healPctMaxHp: 0.05,
        log: () => `${st.poisonous} **[Beelzebub]** Bầy ruồi phá 20% phòng ngự và hồi máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.20,
        cap: 0.40,
        alsoShredMR: true,
        healPctMaxHp: 0.05,
        log: () => `${st.poisonous} **[Beelzebub]** Bầy ruồi hoại tử ăn mòn song phòng Boss!`,
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
        log: (name) => `${st.burn} **[Satan]** Ngọn lửa địa ngục thiêu rụi **${name}**, gây thiêu đốt cực mạnh và cấm hồi máu 2 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.10,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: () => `${st.burn} **[Satan]** Hỏa ngục thiêu rụi đối thủ và cấm hồi máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.10,
        duration_ms: 30000,
        healReduced: true,
        log: () => `${st.burn} **[Satan]** Hỏa ngục thiêu đốt Boss, khóa hồi phục và tăng sát thương!`,
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
        log: (name) => `${st.bleed} **[Bladesorrow]** Lưỡi kiếm bi thương khiến **${name}** chảy máu 3 lượt và giảm 15% giáp (tối đa 30%)!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.12, cap: 0.25 },
        ],
        log: () => `${st.bleed} **[Bladesorrow]** Vết chém bi thương khiến đối thủ bị xuất huyết và giảm 12% giáp (tối đa 25%)!`,
      },
      boss: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, cap: 0.30 },
        ],
        log: () => `${st.bleed} **[Bladesorrow]** Lưỡi kiếm bi thương găm sâu vào Boss, gây chảy máu và phá giáp!`,
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
        log: (name) => `${st.freeze} **[Găng Tay Băng Giá]** Hàn khí đóng băng **${name}** trong 1 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        log: () => `${st.freeze} **[Găng Tay Băng Giá]** Đối thủ bị đóng băng trong 1 lượt!`,
      },
      boss: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.20,
        log: () => `${st.frostbite} **[Găng Tay Băng Giá]** Hàn khí làm chậm nhịp hành động của boss!`,
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
        log: () => `${st.dispe} **[Quỷ Thư]** Lời nguyền tà thuật cổ đại giải phóng!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.30, alsoShredMR: true },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.dispe} **[Quỷ Thư]** Lời nguyền tà thuật giải phóng!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.30, alsoShredMR: true },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.dispe} **[Quỷ Thư]** Lời nguyền tà thuật gieo rắc lên Boss!`,
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
        log: (name) => `${st.stun} **[Búa Lôi Thần Thor]** Thiên lôi giáng thế! Làm choáng **${name}** và tăng 35% sát thương lôi điện!`,
      },
      pvp: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        damageMult: 1.35,
        log: () => `${st.stun} **[Búa Lôi Thần Thor]** Thiên lôi làm choáng đối thủ và tăng sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        damageMult: 1.35,
        log: () => `${st.stun} **[Búa Lôi Thần Thor]** Sấm thần làm gián đoạn Boss và tăng sát thương!`,
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
        log: () => `${st.atkup} **[Búa Toàn Tri Odin]** Cổ ngữ khải huyền! Đòn đánh thứ 3 gây 1.75x sát thương và xuyên 50% kháng phép!`,
      },
      pvp: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.75,
        hitCount: 3,
        mrPierce: 0.50,
        log: () => `${st.atkup} **[Búa Toàn Tri Odin]** Đòn đánh thứ 3 xuyên kháng phép và gây 1.75x sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.75,
        hitCount: 3,
        mrPierce: 0.50,
        log: () => `${st.atkup} **[Búa Toàn Tri Odin]** Đòn thứ 3 gây 1.75x sát thương và xuyên kháng phép Boss!`,
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
        log: (name) => `${st.break} **[Darkhold]** Bí thuật hư vô ăn mòn 25% kháng phép của **${name}** và giảm 15% sát thương nhận vào!`,
      },
      pvp: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.25,
        selfDamageReduce: 0.15,
        log: () => `${st.break} **[Darkhold]** Phá 25% kháng phép và giảm 15% sát thương nhận vào!`,
      },
      boss: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.25,
        permanent: true,
        selfDamageReduce: 0.15,
        log: () => `${st.break} **[Darkhold]** Bí thuật hư vô làm suy yếu 25% kháng phép Boss!`,
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

const WEAPON_UI_META = {
  shadowdagger: {
    icons: ["break"],
    title: "Ám Ảnh Phá Giáp",
    build: (s, se) => ({
      intro: `Đòn đâm từ bóng tối có **45%** cơ hội kích hoạt ${s.break} **Ám Ảnh Phá Giáp** lên mục tiêu.`,
      quotes: [
        `> ${s.break} __**Ám Ảnh Phá Giáp**__ - Phá hủy **22%–30%** ${se.pr} **PR** (Giáp vật lý) của mục tiêu (Đồng đội cùng hưởng khi đánh World Boss).`,
        `> • **Giới hạn cộng dồn** - Giảm tối đa **40%** ${se.pr} **PR** trong Dungeon.`,
      ],
    }),
  },
  poisondagger: {
    icons: ["poisonous", "break"],
    title: "Kịch Độc Ăn Mòn",
    build: (s, se) => ({
      intro: `Lưỡi đao tẩm độc có **45%** cơ hội tiêm ${s.poisonous} **Kịch Độc** và gây ${s.break} **Ăn Mòn Phòng Ngự**.`,
      quotes: [
        `> ${s.poisonous} __**Kịch Độc**__ - Gây sát thương độc mỗi lượt trong **3 lượt** theo **DEX** và **ARC**.`,
        `> ${s.break} __**Ăn Mòn Phòng Ngự**__ - Giảm **15%** ${se.pr} **PR** và ${se.mr} **MR** của mục tiêu (tối đa **30%**).`,
      ],
    }),
  },
  firesword: {
    icons: ["burn", "healreduction"],
    title: "Hỏa Long Thiêu Đốt",
    build: (s, se) => ({
      intro: `Giải phóng ngọn lửa rồng thiêng, có **45%** cơ hội áp dụng ${s.burn} **Thiêu Đốt** và ${s.healreduction} **Vết Thương Sâu**.`,
      quotes: [
        `> ${s.burn} __**Thiêu Đốt**__ - Gây sát thương lửa trong **2 lượt** theo **STR** và **DEX**.`,
        `> ${s.healreduction} __**Vết Thương Sâu**__ - Giảm **30%** hiệu quả ${se.hp} hồi máu của mục tiêu trong **2 lượt** (**30s** với World Boss).`,
      ],
    }),
  },
  greenstaff: {
    icons: ["heal"],
    title: "Mộc Diệp Hồi Sinh",
    build: (s, se) => ({
      intro: `Kết nối sinh mệnh rừng già, kích hoạt ${s.heal} **Mộc Diệp Hồi Sinh** khi chiến đấu.`,
      quotes: [
        `> ${s.heal} __**Mộc Diệp Hồi Sinh**__ - Hồi phục **10%–12%** ${se.hp} **HP đã mất** theo **INT** và **ARC** khi tung kỹ năng hoặc đòn đánh nội tại.`,
      ],
    }),
  },
  bluestaff: {
    icons: ["mr_pierce", "freeze"],
    title: "Lam Tinh Xuyên Phá",
    build: (s, se) => {
      const pIcon = s.mr_pierce || s.armor_pierce || "";
      return {
        intro: `Hội tụ hàn băng tinh khiết, có **45%** cơ hội kích hoạt ${pIcon ? `${pIcon} ` : ""}**Xuyên Kháng Phép** và ${s.freeze} **Đóng Băng**.`,
        quotes: [
          `> ${pIcon ? `${pIcon} ` : ""}__**Xuyên Kháng Phép**__ - Đòn đánh bỏ qua **25%** ${se.mr} **MR** của đối thủ (**50%** với World Boss).`,
          `> ${s.freeze} __**Đóng Băng**__ - Có **25%** cơ hội đóng băng mục tiêu trong **1 lượt**.`,
        ],
      };
    },
  },
  crimsondagger: {
    icons: ["armor_pierce"],
    title: "Huyết Nguyệt Xuyên Giáp",
    build: (s, se) => {
      const pIcon = s.armor_pierce || "";
      return {
        intro: `Mũi đao đỏ thẫm xé toạc phòng tuyến, có **45%** cơ hội kích hoạt ${pIcon ? `${pIcon} ` : ""}**Huyết Nguyệt Xuyên Giáp**.`,
        quotes: [
          `> ${pIcon ? `${pIcon} ` : ""}__**Huyết Nguyệt Xuyên Giáp**__ - Đòn tấn công xuyên thẳng **40%–45%** ${se.pr} **PR** (Giáp vật lý) của mục tiêu.`,
        ],
      };
    },
  },
  gravitybow: {
    icons: ["stun"],
    title: "Mũi Tên Trọng Lực",
    build: (s) => ({
      intro: `Bắn ra trường trọng lực cực đại, có **45%** cơ hội kích hoạt ${s.stun} **Trọng Lực Áp Chế**.`,
      quotes: [
        `> ${s.stun} __**Trọng Lực Áp Chế**__ - Làm **Choáng** mục tiêu trong **1 lượt**.`,
        `> • **Cộng Hưởng Đa Chiều** - Tối ưu hóa sát thương theo **DEX (S)**, **INT (A)** và **ARC (B)**.`,
      ],
    }),
  },
  holysword: {
    icons: ["third_hit"],
    title: "Thánh Quang Phán Quyết",
    build: (s, se) => {
      const tIcon = s.third_hit || s.atkup || "";
      return {
        intro: `Tích tụ thánh quang qua từng nhát chém để giải phóng ${tIcon ? `${tIcon} ` : ""}**Phán Quyết Hoàng Kim**.`,
        quotes: [
          `> ${tIcon ? `${tIcon} ` : ""}__**Phán Quyết Hoàng Kim**__ - Mỗi đòn đánh thứ **3** được ban phước, gây **165%–180%** ${se.att} sát thương chuẩn xác.`,
        ],
      };
    },
  },
  darksword: {
    icons: ["atkup", "atkdown"],
    title: "Hắc Khí Áp Chế",
    build: (s, se) => ({
      intro: `Giải phóng hắc khí bóng tối (**45%** cơ hội), áp dụng ${s.atkup} **Cường Hóa Hắc Ám** và ${s.atkdown} **Suy Yếu**.`,
      quotes: [
        `> ${s.atkup} __**Cường Hóa Hắc Ám**__ - Tăng **15%** ${se.att} sát thương bóng tối trong lượt kích hoạt.`,
        `> ${s.atkdown} __**Suy Yếu**__ - Làm giảm **20%** sát thương mục tiêu gây ra trong **2 lượt**.`,
      ],
    }),
  },
  darkstaff: {
    icons: ["chaos_curse"],
    title: "Hỗn Mang Biến Đổi",
    build: (s, se) => {
      const cIcon = s.chaos_curse || "";
      return {
        intro: `Quyền trượng hắc ám có **45%** cơ hội kích hoạt ${cIcon ? `${cIcon} ` : ""}**Hỗn Mang Biến Đổi** (ngẫu nhiên 1 trong 3 hiệu ứng):`,
        quotes: [
          `> ${s.burn} __**Hắc Hỏa**__ - Thiêu đốt mục tiêu trong **2 lượt** theo **INT** và **ARC**.`,
          `> ${s.break} __**Phá Giáp**__ - Phá hủy **15%–30%** ${se.pr} **PR** của mục tiêu.`,
          `> • **Xuyên Kháng Phép** - Đòn đánh bỏ qua **25%–50%** ${se.mr} **MR** của mục tiêu.`,
        ],
      };
    },
  },
  duskanddawn: {
    icons: ["double_hit"],
    title: "Song Cực Liên Kích",
    build: (s, se) => {
      const dIcon = s.double_hit || "";
      return {
        intro: `Dung hợp sức mạnh bình minh và hoàng hôn, chém song hệ ${se.hybrid} **Vật Lý / Phép Thuật** và kích hoạt ${dIcon ? `${dIcon} ` : ""}**Song Cực Liên Kích**.`,
        quotes: [
          `> ${dIcon ? `${dIcon} ` : ""}__**Song Cực Liên Kích**__ - Có **28%–30%** cơ hội thực hiện thêm **1 đòn tấn công phụ** ngay trong lượt.`,
          `> • **Scale 3 Chỉ Số** - Cộng hưởng **INT (S)**, **DEX (A)** và **ARC (B)**.`,
        ],
      };
    },
  },
  riverofblood: {
    icons: ["lifesteal"],
    title: "Huyết Hải Hấp Thụ",
    build: (s, se) => {
      const lIcon = s.lifesteal || "";
      return {
        intro: `Lưỡi kiếm nhuốm máu hấp thụ sinh lực kẻ địch qua ${lIcon ? `${lIcon} ` : ""}**Huyết Hải Hấp Thụ**.`,
        quotes: [
          `> ${lIcon ? `${lIcon} ` : ""}__**Huyết Hải Hấp Thụ**__ - Hồi phục ${se.hp} **HP** cho bản thân bằng **2%–5%** sát thương gây ra.`,
          `> • **Huyết Khí** - Tăng **5%** tổng uy lực vũ khí theo **ARC** và **DEX**.`,
        ],
      };
    },
  },
  axesnake: {
    icons: ["break"],
    title: "Mãng Xà Nghiền Giáp",
    build: (s, se) => ({
      intro: `Đòn bổ mang nanh độc mãng xà có **45%** cơ hội kích hoạt ${s.break} **Nghiền Nát Phòng Tuyến**.`,
      quotes: [
        `> ${s.break} __**Nghiền Nát Phòng Tuyến**__ - Phá hủy **10%** ${se.pr} **PR** và ${se.mr} **MR** của mục tiêu mỗi lần kích hoạt.`,
        `> • **Giới hạn cộng dồn** - Cộng dồn tối đa **40%** trong Dungeon và **80%** trong PvP.`,
      ],
    }),
  },
  sunbow: {
    icons: ["armor_pierce"],
    title: "Thái Dương Xuyên Thấu",
    build: (s, se) => {
      const pIcon = s.armor_pierce || "";
      return {
        intro: `Mũi tên ánh sáng mặt trời kích hoạt ${pIcon ? `${pIcon} ` : ""}**Thái Dương Xuyên Thấu**.`,
        quotes: [
          `> ${pIcon ? `${pIcon} ` : ""}__**Thái Dương Xuyên Thấu**__ - Bỏ qua **10%** ${se.pr} **PR** (Giáp vật lý) và **10%** ${se.mr} **MR** (Kháng phép).`,
          `> • **Cộng Hưởng Thái Dương** - Scale song tu **DEX (S)**, **INT (S)** và **ARC (B)**.`,
        ],
      };
    },
  },
  clawhex: {
    icons: ["bleed", "atkup"],
    title: "Quỷ Trảo Xuất Huyết",
    build: (s) => ({
      intro: `Vuốt quỷ xé rách mục tiêu (**45%** cơ hội), gây ${s.bleed} **Chảy Máu** và ${s.atkup} **Cuồng Sát**.`,
      quotes: [
        `> ${s.bleed} __**Chảy Máu**__ - Mỗi lượt gây sát thương bằng **50% STR + 50% DEX** trong **3 lượt**.`,
        `> ${s.atkup} __**Cuồng Sát**__ - Tăng trực tiếp **15%** sát thương đòn đánh khi kích hoạt.`,
      ],
    }),
  },
  spearhex: {
    icons: ["armor_pierce"],
    title: "Quỷ Thương Xuyên Phá",
    build: (s, se) => {
      const pIcon = s.armor_pierce || "";
      return {
        intro: `Mũi thương tà thuật đâm xuyên giáp trụ, kích hoạt ${pIcon ? `${pIcon} ` : ""}**Quỷ Thương Xuyên Phá**.`,
        quotes: [
          `> ${pIcon ? `${pIcon} ` : ""}__**Quỷ Thương Xuyên Phá**__ - Đòn đánh bỏ qua **10%** ${se.pr} **PR** (Giáp vật lý) của mục tiêu.`,
        ],
      };
    },
  },
  shieldhex: {
    icons: ["reflect"],
    title: "Quỷ Khiên Phản Chấn",
    build: (s, se) => {
      const rIcon = s.reflect || "";
      return {
        intro: `Tạo lớp chắn tà thuật tích trữ sát thương nhận vào để kích hoạt ${rIcon ? `${rIcon} ` : ""}**Quỷ Khiên Phản Chấn**.`,
        quotes: [
          `> ${rIcon ? `${rIcon} ` : ""}__**Hấp Thụ & Phản Chấn**__ - Hấp thụ **15%** sát thương trong **3 lượt**, sau đó phản lại **75%** sát thương đã tích tụ.`,
          `> • **Scale Phòng Thủ** - Tăng sức mạnh trực tiếp theo ${se.pr} **PR (S)** và ${se.mr} **MR (S)**.`,
        ],
      };
    },
  },
  lunashard: {
    icons: ["freeze", "crit_up"],
    title: "Nguyệt Thực Băng Tinh",
    build: (s) => {
      const cIcon = s.crit_up || "";
      return {
        intro: `Mảnh trăng lạnh giá ban tặng ${s.freeze} **Ánh Trăng Đóng Băng** và ${cIcon ? `${cIcon} ` : ""}**Nguyệt Quang Chí Mạng**.`,
        quotes: [
          `> ${s.freeze} __**Ánh Trăng Đóng Băng**__ - Có **25%** cơ hội đóng băng mục tiêu trong **1 lượt**.`,
          `> ${cIcon ? `${cIcon} ` : ""}__**Nguyệt Quang Chí Mạng**__ - Tăng **15%** Tỷ lệ Bạo kích, **25%** Sát thương Bạo kích và xuyên **15%** phòng thủ.`,
        ],
      };
    },
  },
  eclipsesoul: {
    icons: ["chaos_curse"],
    title: "Nhật Thực Hồn Chú",
    build: (s, se) => {
      const cIcon = s.chaos_curse || "";
      return {
        intro: `Linh hồn nhật thực biến ảo khôn lường, kích hoạt ngẫu nhiên ${cIcon ? `${cIcon} ` : ""}**Nhật Thực Hồn Chú**:`,
        quotes: [
          `> ${s.burn} __**Nhật Thực Thiêu Đốt**__ - Thiêu đốt mục tiêu **2 lượt** theo **INT (S)** và **ARC (A)**.`,
          `> ${s.stun} __**Thực Nhật Áp Chế**__ - Làm **Choáng** mục tiêu **1 lượt** hoặc xuyên **30%** ${se.pr} **PR**.`,
        ],
      };
    },
  },
  fallenangel: {
    icons: ["shield_guard", "lifesteal"],
    title: "Thiên Sứ Sa Ngã",
    build: (s, se) => {
      const gIcon = s.shield_guard || "";
      const lIcon = s.lifesteal || "";
      return {
        intro: `Đôi cánh sa ngã bảo hộ chủ nhân với ${gIcon ? `${gIcon} ` : ""}**Thánh Thuẫn Đen** và kích hoạt ${lIcon ? `${lIcon} ` : ""}**Hấp Huyết Phán Quyết** (**45%** cơ hội).`,
        quotes: [
          `> ${gIcon ? `${gIcon} ` : ""}__**Thánh Thuẫn Đen**__ - Cố định giảm **12%** mọi sát thương nhận vào.`,
          `> ${lIcon ? `${lIcon} ` : ""}__**Hấp Huyết Phán Quyết**__ - Tăng **20%** ${se.att} sát thương gây ra và hồi phục **6%** ${se.hp} **HP đã mất**.`,
        ],
      };
    },
  },
  greeddagger: {
    icons: ["lifesteal", "execute"],
    title: "Đoạt Mệnh Tham Lam",
    build: (s, se) => {
      const lIcon = s.lifesteal || "";
      const eIcon = s.execute || "";
      return {
        intro: `Đoản đao tham lam nuốt chửng sinh lực mục tiêu qua ${lIcon ? `${lIcon} ` : ""}**Đoạt Mệnh** và ${eIcon ? `${eIcon} ` : ""}**Săn Mồi**.`,
        quotes: [
          `> ${lIcon ? `${lIcon} ` : ""}__**Đoạt Mệnh**__ - Hút máu bằng **8%** ${se.hp} sát thương gây ra.`,
          `> ${eIcon ? `${eIcon} ` : ""}__**Săn Mồi Kết Liễu**__ - Khi mục tiêu dưới **50%** ${se.hp} **HP**, gây thêm **25%** sát thương chí mạng kết liễu.`,
        ],
      };
    },
  },
  asmodeus: {
    icons: ["atkup", "break"],
    title: "Cuồng Vọng Bùng Nổ",
    build: (s, se) => ({
      intro: `Khơi dậy cuồng vọng hủy diệt (**45%** cơ hội), kích hoạt ${s.atkup} **Cuồng Vọng** và ${s.break} **Phá Giáp**.`,
      quotes: [
        `> ${s.atkup} __**Cuồng Vọng**__ - Tăng mạnh **30%** ${se.att} sát thương đòn đánh.`,
        `> ${s.break} __**Phá Giáp**__ - Nghiền nát **15%** ${se.pr} **PR** của mục tiêu trong **2 lượt** (tối đa **45%**).`,
      ],
    }),
  },
  soulreaper: {
    icons: ["healreduction", "execute"],
    title: "Gặt Hái Linh Hồn",
    build: (s, se) => {
      const eIcon = s.execute || "";
      return {
        intro: `Lưỡi hái tử thần tước đoạt sinh mệnh (**45%** cơ hội), áp dụng ${s.healreduction} **Khóa Hồn** và ${eIcon ? `${eIcon} ` : ""}**Trảm Hồn Kết Liễu**.`,
        quotes: [
          `> ${s.healreduction} __**Khóa Hồn**__ - Cấm mục tiêu hồi máu trong **2 lượt**.`,
          `> ${eIcon ? `${eIcon} ` : ""}__**Trảm Hồn Kết Liễu**__ - Khi mục tiêu dưới **35%** ${se.hp} **HP**, gây thêm **40%** sát thương kết liễu và hồi **5%** ${se.hp} **HP**.`,
        ],
      };
    },
  },
  beelzebub: {
    icons: ["break", "heal"],
    title: "Đàn Ruồi Hoại Tử",
    build: (s, se) => ({
      intro: `Triệu hồi bầy ruồi chúa tể (**45%** cơ hội), gây ${s.break} **Ăn Mòn Song Phòng** và ${s.heal} **Phàm Ăn Hồi Phục**.`,
      quotes: [
        `> ${s.break} __**Ăn Mòn Song Phòng**__ - Gặm nhấm **20%** ${se.pr} **PR** và **20%** ${se.mr} **MR** của mục tiêu trong **2 lượt** (tối đa **40%**).`,
        `> ${s.heal} __**Phàm Ăn**__ - Hồi phục ngay **5%** ${se.hp} **HP tối đa** cho bản thân.`,
      ],
    }),
  },
  satan: {
    icons: ["burn", "healreduction"],
    title: "Hỏa Ngục Tận Thế",
    build: (s, se) => ({
      intro: `Triệu hồi ngọn lửa địa ngục tối thượng (**45%** cơ hội), áp dụng ${s.burn} **Hỏa Ngục Tận Thế** và ${s.healreduction} **Tuyệt Diệt**.`,
      quotes: [
        `> ${s.burn} __**Hỏa Ngục Tận Thế**__ - Thiêu đốt mục tiêu trong **3 lượt** theo **STR** và tăng **10%** sát thương.`,
        `> ${s.healreduction} __**Tuyệt Diệt**__ - Cấm mục tiêu hồi phục ${se.hp} **HP** trong **2 lượt**.`,
      ],
    }),
  },
  bladesorrow: {
    icons: ["bleed", "break"],
    title: "Vết Chém Bi Thương",
    build: (s, se) => ({
      intro: `Kiếm khí bi thương khắc sâu vào kẻ địch (**45%** cơ hội), gây ${s.bleed} **Xuất Huyết** và ${s.break} **Phá Giáp**.`,
      quotes: [
        `> ${s.bleed} __**Xuất Huyết Bi Thương**__ - Gây chảy máu liên tục trong **3 lượt** theo **STR (S)** và **DEX (A)**.`,
        `> ${s.break} __**Rạn Nứt**__ - Giảm **12%–15%** ${se.pr} **PR** của mục tiêu (cộng dồn tối đa **25%–30%**).`,
      ],
    }),
  },
  frostgauntlet: {
    icons: ["freeze"],
    title: "Hàn Băng Tuyệt Đối",
    build: (s) => ({
      intro: `Găng tay băng giá cực hàn giải phóng ${s.freeze} **Đóng Băng Vĩnh Cửu**.`,
      quotes: [
        `> ${s.freeze} __**Đóng Băng**__ - Có **25%–33%** cơ hội đóng băng hoàn toàn mục tiêu trong **1 lượt**.`,
        `> • **Hàn Quyền Gacha** - Cộng hưởng 3 chỉ số **INT (S)**, **ARC (A)** và **DEX (B)**.`,
      ],
    }),
  },
  demonbook: {
    icons: ["chaos_curse"],
    title: "Tà Thuật Cổ Đại",
    build: (s, se) => {
      const cIcon = s.chaos_curse || "";
      return {
        intro: `Mở trang sách cổ ngữ tà thần (**45%** cơ hội), kích hoạt ${cIcon ? `${cIcon} ` : ""}**Tà Thuật Cổ Đại** (ngẫu nhiên 1 trong 3 hiệu ứng):`,
        quotes: [
          `> ${s.burn} __**Hỏa Ngục**__ - Thiêu đốt mục tiêu **2 lượt** theo **INT** và **ARC**.`,
          `> ${s.break} __**Hủ Bại**__ - Phá hủy **30%** ${se.pr} **PR** & ${se.mr} **MR** của mục tiêu.`,
          `> ${s.stun} __**Hóa Đá**__ - Phong ấn làm **Choáng** mục tiêu trong **1 lượt**.`,
        ],
      };
    },
  },
  thorshammer: {
    icons: ["stun", "atkup"],
    title: "Thiên Lôi Giáng Thế",
    build: (s, se) => ({
      intro: `Triệu hồi sấm sét Cửu Giới (**45%** cơ hội), giáng ${s.stun} **Thiên Lôi** và ${s.atkup} **Cuồng Lôi**.`,
      quotes: [
        `> ${s.stun} __**Thiên Lôi Giáng Thế**__ - Làm **Choáng** mục tiêu trong **1 lượt**.`,
        `> ${s.atkup} __**Cuồng Lôi**__ - Cường hóa đòn đánh tăng thêm **35%** ${se.att} sát thương lôi điện.`,
      ],
    }),
  },
  odinhammer: {
    icons: ["third_hit", "mr_pierce"],
    title: "Cổ Ngữ Khải Huyền",
    build: (s, se) => {
      const tIcon = s.third_hit || "";
      const pIcon = s.mr_pierce || "";
      return {
        intro: `Con mắt toàn tri của Odin soi thấu điểm yếu, kích hoạt ${tIcon ? `${tIcon} ` : ""}**Khải Huyền** và ${pIcon ? `${pIcon} ` : ""}**Xuyên Thấu Phép**.`,
        quotes: [
          `> ${tIcon ? `${tIcon} ` : ""}__**Cổ Ngữ Khải Huyền**__ - Mỗi đòn đánh thứ **3** bùng nổ gây **175%** ${se.mag} sát thương.`,
          `> ${pIcon ? `${pIcon} ` : ""}__**Xuyên Thấu Phép**__ - Đòn khải huyền xuyên thẳng **50%** ${se.mr} **MR** của mục tiêu.`,
        ],
      };
    },
  },
  darkhold: {
    icons: ["mr_shred", "shield_guard"],
    title: "Trói Buộc Hư Vô",
    build: (s, se) => {
      const mIcon = s.mr_shred || "";
      const gIcon = s.shield_guard || "";
      return {
        intro: `Bí thuật cấm kỵ từ Darkhold (**45%** cơ hội) áp dụng ${mIcon ? `${mIcon} ` : ""}**Ăn Mòn Kháng Phép** và ${gIcon ? `${gIcon} ` : ""}**Màn Đêm Hư Vô**.`,
        quotes: [
          `> ${mIcon ? `${mIcon} ` : ""}__**Ăn Mòn Kháng Phép**__ - Phá hủy **25%** ${se.mr} **MR** của mục tiêu (tối đa **50%**).`,
          `> ${gIcon ? `${gIcon} ` : ""}__**Màn Đêm Hư Vô**__ - Giảm **15%** sát thương bản thân phải nhận trong **2 lượt**.`,
        ],
      };
    },
  },
};

const getWeaponPassiveEmojis = (subType) => {
  const s = getStatusEmojis();
  const key = normalizePassiveKey(subType);
  const meta = WEAPON_UI_META[key];
  if (meta && Array.isArray(meta.icons)) {
    return meta.icons.map((k) => s[k] || "").filter(Boolean).join("");
  }
  return "";
};

const formatWeaponRichDescription = (subType) => {
  const s = getStatusEmojis();
  const se = getStatEmojis();
  const key = normalizePassiveKey(subType);
  const meta = WEAPON_UI_META[key];

  const lines = [];
  if (meta) {
    const built = meta.build(s, se);
    lines.push(built.intro);
    lines.push(...built.quotes);
  } else {
    lines.push(
      `Vũ khí chiến đấu cơ bản, cộng hưởng sát thương trực tiếp theo chỉ số ${se.att} **ATT** và ${se.mag} **MAG** của nhân vật.`
    );
    lines.push(
      `> • **Thuần Vũ Khí** - Không tiêu hao nội lực, tối ưu hóa sát thương cơ bản theo hệ số Scale.`
    );
  }

  return lines.join("\n");
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
  getWeaponPassiveEmojis,
  formatWeaponRichDescription,
  getStatEmojis,
  getStatusEmojis,
};
