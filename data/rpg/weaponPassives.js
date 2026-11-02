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
  STR_DEX: (stats, power = 0) => (stats.str * 0.45 + stats.dex * 0.45) + Math.sqrt(Math.max(0, power)) * 2.2 + power * 0.008,
  STR_ONLY: (stats, power = 0) => (stats.str * 0.85) + Math.sqrt(Math.max(0, power)) * 2.2 + power * 0.008,
  DEX_ONLY: (stats, power = 0) => (stats.dex * 0.85) + Math.sqrt(Math.max(0, power)) * 2.2 + power * 0.008,
  INT_ARC: (stats, power = 0) => (stats.int * 0.45 + stats.arc * 0.45) + Math.sqrt(Math.max(0, power)) * 2.2 + power * 0.008,
  ARC_DEX: (stats, power = 0) => (stats.arc * 0.55 + stats.dex * 0.35) + Math.sqrt(Math.max(0, power)) * 2.2 + power * 0.008,
  STR_DEX_POWER: (stats, power = 0) => (stats.str * 0.40 + stats.dex * 0.35) + Math.sqrt(Math.max(0, power)) * 2.4 + power * 0.010,
  DEX_ARC_POWER: (stats, power = 0) => (stats.dex * 0.40 + stats.arc * 0.35) + Math.sqrt(Math.max(0, power)) * 2.4 + power * 0.010,
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
    lifesteal: st.lifesteal || "<:LifeSteal:1563844557026893924>",
    armor_pierce: st.armor_pierce || "<:ArmorPierce:1563844554728276018>",
    mr_pierce: st.mr_pierce || "<:dispe:1521938483730710578>",
    mr_shred: st.mr_shred || "<:break:1521938480337391736>",
    double_hit: st.double_hit || "<:atkup:1521938477359300648>",
    third_hit: st.third_hit || "<:atkup:1521938477359300648>",
    reflect: st.reflect || "<:taunt:1521938510485917796>",
    shield_guard: st.shield_guard || "<:taunt:1521938510485917796>",
    execute: st.execute || "<:healreduction:1523340558855045190>",
    crit_up: st.crit_up || "<:atkup:1521938477359300648>",
    chaos_curse: st.chaos_curse || "<:dispe:1521938483730710578>",
  };
};

const st = getStatusEmojis();

const WEAPON_PASSIVES = {
  shadowdagger: {
    name: "Ảnh Hồn Đoản Đao",
    type: PASSIVE_TYPES.ARMOR_SHRED,
    description: "45% cơ hội kích hoạt Ám Ảnh Phá Giáp: tăng 12% sát thương và phá 22%–25% giáp vật lý (tối đa 45%).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.22,
        cap: 0.44,
        damageMult: 1.12,
        log: (name) => `${st.break} **[Shadow Dagger]** Ám ảnh bùng phát (+12% ST), phá hủy 22% giáp vật lý của **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.24,
        cap: 0.45,
        damageMult: 1.12,
        log: (name) => `${st.break} **[Shadow Dagger]** Phá hủy 24% giáp vật lý của **${name}** và tăng 12% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.30,
        permanent: true,
        damageMult: 1.12,
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
        damageMult: 1.08,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, alsoShredMR: true, cap: 0.30 },
        ],
        log: (name) => `${st.poisonous} **[Poison Dagger]** Kịch độc ăn mòn! **${name}** bị trúng độc 3 lượt và giảm 15% phòng ngự!`,
      },
      pvp: {
        type: PASSIVE_TYPES.POISON,
        rounds: 3,
        scaling: PASSIVE_SCALING.DEX_ARC_POWER,
        damageMult: 1.08,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.15, alsoShredMR: true, cap: 0.30 },
        ],
        log: (name) => `${st.poisonous} **[Poison Dagger]** Kịch độc ăn mòn! **${name}** bị trúng độc và giảm 15% phòng ngự!`,
      },
      boss: {
        type: PASSIVE_TYPES.POISON,
        rounds: 3,
        scaling: PASSIVE_SCALING.DEX_ARC_POWER,
        damageMult: 1.10,
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
    description: "45% cơ hội kích hoạt Hỏa Long: tăng 10% sát thương, thiêu đốt 2 lượt và áp dụng Vết Thương Sâu cấm hồi máu.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.BURN,
        rounds: 2,
        scaling: PASSIVE_SCALING.STR_DEX_POWER,
        damageMult: 1.10,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: (name) => `${st.burn} **[Fire Sword]** Đòn chém rực lửa gây Thiêu Đốt và Giảm Hồi Máu lên **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BURN,
        rounds: 2,
        scaling: PASSIVE_SCALING.STR_DEX_POWER,
        damageMult: 1.10,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: (name) => `${st.burn} **[Fire Sword]** Lửa rồng thiêu đốt **${name}** và áp chế hồi máu 2 lượt!`,
      },
      boss: {
        type: PASSIVE_TYPES.BURN,
        rounds: 2,
        scaling: PASSIVE_SCALING.STR_DEX_POWER,
        damageMult: 1.12,
        duration_ms: 30000,
        healReduced: true,
        log: () => `${st.burn} **[Fire Sword]** Thiêu đốt boss! Giảm 30% hồi máu của boss trong 30 giây.`,
      },
    },
  },

  greenstaff: {
    name: "Mộc Diệp Pháp Trượng",
    type: PASSIVE_TYPES.HEAL_ON_SKILL,
    description: "45% cơ hội kích hoạt Mộc Diệp Hồi Sinh: tăng 15% sát thương và hồi phục 14% HP đã mất (tối thiểu 5% Max HP).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.14,
        minMaxHpPct: 0.05,
        healType: "missing_hp",
        damageMult: 1.15,
        log: (name, healAmt) => `${st.heal} **[Mộc Diệp Pháp Trượng]** Hồi phục **${healAmt.toLocaleString()}** HP (14% máu đã mất) và tăng 15% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.14,
        minMaxHpPct: 0.05,
        healType: "missing_hp",
        damageMult: 1.15,
        log: (name, healAmt) => `${st.heal} **[Green Staff]** Hồi phục **${healAmt.toLocaleString()}** HP từ nội tại Mộc Diệp!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.14,
        minMaxHpPct: 0.05,
        healType: "missing_hp",
        damageMult: 1.15,
        log: (name, healAmt) => `${st.heal} **[Green Staff]** Hồi phục **${healAmt.toLocaleString()}** HP khi chiến đấu!`,
      },
    },
  },

  bluestaff: {
    name: "Lam Tinh Thần Trượng",
    type: PASSIVE_TYPES.MR_PIERCE,
    description: "45% cơ hội kích hoạt Lam Tinh: tăng 14% sát thương, xuyên 32%–50% kháng phép và 25% cơ hội đóng băng 1 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.32,
        damageMult: 1.14,
        alsoRoll: { type: PASSIVE_TYPES.FREEZE, rounds: 1, chance: 0.25 },
        log: () => `${st.break} **[Blue Staff]** Hàn băng xuyên 32% kháng phép và tăng 14% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.32,
        damageMult: 1.14,
        alsoRoll: { type: PASSIVE_TYPES.FREEZE, rounds: 1, chance: 0.25 },
        log: () => `${st.break} **[Blue Staff]** Đòn đánh xuyên 32% kháng phép và tăng 14% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.MR_PIERCE,
        amount: 0.50,
        damageMult: 1.15,
        log: () => `${st.break} **[Blue Staff]** Đòn đánh xuyên 50% kháng phép của boss.`,
      },
    },
  },

  crimsondagger: {
    name: "Huyết Nguyệt Đoản Đao",
    type: PASSIVE_TYPES.ARMOR_PIERCE,
    description: "45% cơ hội kích hoạt Huyết Nguyệt: tăng 14% sát thương và xuyên 40%–45% phòng ngự vật lý.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.40,
        damageMult: 1.14,
        log: () => `${st.armor_pierce} **[Crimson Dagger]** Huyết nguyệt tăng 14% sát thương và xuyên 40% phòng ngự vật lý!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.40,
        damageMult: 1.12,
        log: () => `${st.armor_pierce} **[Crimson Dagger]** Xuyên 40% phòng ngự vật lý và tăng 12% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.45,
        damageMult: 1.15,
        log: () => `${st.armor_pierce} **[Crimson Dagger]** Đòn đánh xuyên 45% phòng ngự vật lý của boss.`,
      },
    },
  },

  gravitybow: {
    name: "Cung Trọng Lực",
    type: PASSIVE_TYPES.STUN,
    description: "45% cơ hội kích hoạt Trường Trọng Lực: tăng 8% sát thương và 40% cơ hội làm choáng mục tiêu 1 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        chance: 0.45,
        damageMult: 1.10,
        log: (name) => `${st.stun} **[Gravity Bow]** Bắn ra mũi tên trọng lực (+10% ST) làm choáng **${name}** trong 1 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        chance: 0.40,
        damageMult: 1.08,
        log: (name) => `${st.stun} **[Gravity Bow]** Mũi tên trọng lực làm choáng **${name}**!`,
      },
      boss: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        chance: 0.40,
        damageMult: 1.12,
        log: (name) => `${st.stun} **[Gravity Bow]** Mũi tên trọng lực làm choáng **${name}**!`,
      },
    },
  },

  holysword: {
    name: "Thánh Kiếm Hoàng Kim",
    type: PASSIVE_TYPES.DAMAGE_MULT,
    description: "Mỗi đòn đánh thứ 3 được Thánh Quang ban phước, gây 172%–180% sát thương và xuyên 25% phòng ngự.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.72,
        hitCount: 3,
        armorPierce: 0.25,
        log: () => `${st.atkup} **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.72x sát thương.`,
      },
      pvp: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.72,
        hitCount: 3,
        armorPierce: 0.25,
        log: () => `${st.atkup} **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.72x sát thương.`,
      },
      boss: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.80,
        hitCount: 3,
        armorPierce: 0.25,
        log: () => `${st.atkup} **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây 1.80x sát thương.`,
      },
    },
  },

  darksword: {
    name: "Hắc Ám Ma Kiếm",
    type: PASSIVE_TYPES.NONE,
    description: "45% cơ hội giải phóng hắc khí: tăng 16% sát thương bóng tối và làm suy yếu mục tiêu (giảm 18% sát thương mục tiêu gây ra trong 2 lượt).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.16,
        targetAtkDown: true,
        selfDamageReduce: 0.16,
        log: (name) => `${st.atkdown} **[Dark Sword]** Hắc khí bao phủ làm suy yếu **${name}**, giảm sát thương mục tiêu!`,
      },
      pvp: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.16,
        targetAtkDown: true,
        selfDamageReduce: 0.16,
        log: (name) => `${st.atkdown} **[Dark Sword]** Hắc khí làm suy yếu **${name}** và tăng 16% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.NONE,
        damageMult: 1.16,
        selfDamageReduce: 0.18,
        log: () => `${st.atkdown} **[Dark Sword]** Hắc khí bao phủ! Giảm 18% sát thương của Boss lượt này và tăng 16% sát thương bóng tối.`,
      },
    },
  },

  darkstaff: {
    name: "Hắc Ám Thần Trượng",
    type: PASSIVE_TYPES.RANDOM_EFFECT,
    description: "45% cơ hội kích hoạt Hỗn Mang: tăng 12% sát thương và ngẫu nhiên gây Hắc Hỏa, Phá Giáp hoặc Xuyên Kháng Phép.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.12,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.18, cap: 0.36, alsoShredMR: true },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.30 },
        ],
        log: () => `${st.dispe} **[Dark Staff]** Hắc ám thay đổi hình thái!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.12,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.18, cap: 0.36, alsoShredMR: true },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.30 },
        ],
        log: () => `${st.dispe} **[Dark Staff]** Hắc ám thay đổi hình thái!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.14,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC, duration_ms: 30000, healReduced: true },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.25, permanent: true },
          { type: PASSIVE_TYPES.MR_PIERCE, amount: 0.45 },
        ],
        log: () => `${st.dispe} **[Dark Staff]** Hắc ám biến đổi!`,
      },
    },
  },

  duskanddawn: {
    name: "Thần Kiếm Song Cực",
    type: PASSIVE_TYPES.DOUBLE_HIT,
    description: "Đòn đánh luân phiên Vật Lý/Phép Thuật; có 30% cơ hội kích hoạt Song Cực Liên Kích gây thêm 35% sát thương.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.30,
        bonusMult: 0.35,
        log: () => `${st.atkup} **[Dusk and Dawn]** Sức mạnh bình minh và hoàng hôn cộng hưởng! Đòn tấn công liên kích (+35% ST)!`,
      },
      pvp: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.30,
        bonusMult: 0.35,
        log: () => `${st.atkup} **[Dusk and Dawn]** Song cực liên kích (+35% sát thương)!`,
      },
      boss: {
        type: PASSIVE_TYPES.DOUBLE_HIT,
        chance: 0.30,
        bonusMult: 0.35,
        log: () => `${st.atkup} **[Dusk and Dawn]** Song cực liên kích!`,
      },
    },
  },

  riverofblood: {
    name: "Huyết Hải Thần Kiếm",
    type: PASSIVE_TYPES.LIFESTEAL,
    description: "45% cơ hội kích hoạt Huyết Hải: tăng 12% sát thương và hồi phục 8% sát thương thực gây ra.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        damageMult: 1.12,
        healType: "damage",
        log: (name, healAmt) => `${st.lifesteal} **[River of Blood]** Huyết hải tăng 12% ST và hồi phục **${healAmt.toLocaleString()}** HP.`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        damageMult: 1.12,
        healType: "damage",
        log: (name, healAmt) => `${st.lifesteal} **[River of Blood]** Hồi **${healAmt.toLocaleString()}** HP từ Huyết Hải!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.08,
        damageMult: 1.12,
        healType: "damage",
        log: (name, healAmt) => `${st.lifesteal} **[River of Blood]** Chém hồi máu bằng **${healAmt.toLocaleString()}** HP.`,
      },
    },
  },

  axesnake: {
    name: "Rìu Mãng Xà Hex",
    type: PASSIVE_TYPES.ARMOR_SHRED,
    description: "45% cơ hội kích hoạt Nghiền Giáp: tăng 16% sát thương và phá hủy 16% PR & MR (cộng dồn tối đa 40%).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.16,
        cap: 0.40,
        alsoShredMR: true,
        damageMult: 1.16,
        log: (name, data) => `${st.break} **[Axesnake]** Phá hủy 16% song phòng! PR: ${data.armor.toLocaleString()} / MR: ${data.mr.toLocaleString()}.`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.16,
        cap: 0.40,
        alsoShredMR: true,
        damageMult: 1.16,
        log: () => `${st.break} **[Axesnake]** Nghiền nát 16% giáp & kháng phép đối thủ (+16% ST)!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.12,
        permanent: true,
        damageMult: 1.16,
        log: (name, data) => `${st.break} **[Axesnake]** Phá 12% giáp boss! Tổng cộng ${(data.totalReduced * 100).toFixed(0)}%.`,
      },
    },
  },

  sunbow: {
    name: "Sun Bow",
    type: PASSIVE_TYPES.ARMOR_PIERCE,
    description: "45% cơ hội kích hoạt Thái Dương Xuyên Thấu: tăng 10% sát thương và xuyên 18% giáp vật lý lẫn kháng phép.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.18,
        alsoPierceMR: true,
        damageMult: 1.10,
        log: () => `${st.armor_pierce} **[Sun Bow]** Ánh sáng thái dương tăng 10% ST và xuyên 18% phòng ngự!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.18,
        alsoPierceMR: true,
        damageMult: 1.10,
        log: () => `${st.armor_pierce} **[Sun Bow]** Xuyên 18% song phòng và tăng 10% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.20,
        alsoPierceMR: true,
        damageMult: 1.12,
        log: () => `${st.armor_pierce} **[Sun Bow]** Xuyên 20% giáp vật lý và kháng phép.`,
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
    description: "45% cơ hội kích hoạt Quỷ Thương Xuyên Phá: tăng 15% sát thương và xuyên 25% giáp vật lý.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.25,
        damageMult: 1.15,
        log: () => `${st.armor_pierce} **[Spearhex]** Quỷ thương tăng 15% ST và xuyên 25% giáp!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.25,
        damageMult: 1.15,
        log: () => `${st.armor_pierce} **[Spearhex]** Xuyên 25% giáp và tăng 15% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_PIERCE,
        amount: 0.25,
        damageMult: 1.15,
        log: () => `${st.armor_pierce} **[Spearhex]** Xuyên 25% giáp vật lý.`,
      },
    },
  },

  shieldhex: {
    name: "Shieldhex",
    type: PASSIVE_TYPES.REFLECT,
    description: "Hấp thụ 15% sát thương nhận vào trong 3 lượt rồi phản chấn 75% sát thương tích tụ; giảm 10% sát thương nhận vào.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        damageMult: 1.10,
        selfDamageReduce: 0.10,
        log: () => `${st.taunt} **[Shieldhex]** Khiên Hex hấp thụ 15% sát thương và cường hóa phòng thủ!`,
      },
      pvp: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        damageMult: 1.10,
        selfDamageReduce: 0.10,
        log: () => `${st.taunt} **[Shieldhex]** Hấp thụ 15% sát thương và tăng 10% công kích!`,
      },
      boss: {
        type: PASSIVE_TYPES.REFLECT,
        absorbPct: 0.15,
        reflectPct: 0.75,
        threshold: 3,
        damageMult: 1.10,
        selfDamageReduce: 0.10,
        log: () => `${st.taunt} **[Shieldhex]** Khiên Hex hấp thụ 15% sát thương.`,
      },
    },
  },

  lunashard: {
    name: "Lunashard",
    type: PASSIVE_TYPES.FREEZE,
    description: "45% cơ hội kích hoạt Nguyệt Quang: tăng 18% sát thương, xuyên 15% phòng thủ và 30% cơ hội đóng băng 1 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.30,
        damageMult: 1.18,
        pierceAmount: 0.15,
        log: (name) => `${st.freeze} **[Lunashard]** Ánh trăng đóng băng **${name}** và tăng 18% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.30,
        damageMult: 1.18,
        pierceAmount: 0.15,
        log: () => `${st.freeze} **[Lunashard]** Nguyệt quang xuyên phòng thủ và đóng băng đối thủ!`,
      },
      boss: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        damageMult: 1.18,
        pierceAmount: 0.15,
        log: () => `${st.freeze} **[Lunashard]** Ánh trăng đóng băng!`,
      },
    },
  },

  eclipsesoul: {
    name: "Eclipsesoul",
    type: PASSIVE_TYPES.RANDOM_EFFECT,
    description: "45% cơ hội kích hoạt Nhật Thực Hồn Chú: tăng 14% sát thương và ngẫu nhiên gây Thiêu Đốt, Xuyên Giáp hoặc Choáng.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.14,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_PIERCE, amount: 0.30 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.burn} **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.14,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_PIERCE, amount: 0.30 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.burn} **[Eclipsesoul]** Sức mạnh nhật thực biến đổi!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.14,
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
    description: "Cố định giảm 12% sát thương nhận vào; khi tấn công có 45% cơ hội tăng 18% sát thương và hồi phục 6% máu đã mất.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        minMaxHpPct: 0.03,
        healType: "missing_hp",
        damageMult: 1.18,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `${st.lifesteal} **[Fallen Angel]** Lông vũ sa ngã bùng nổ! Tăng 18% sát thương và hồi phục **${healAmt.toLocaleString()}** HP!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        minMaxHpPct: 0.03,
        healType: "missing_hp",
        damageMult: 1.18,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `${st.lifesteal} **[Fallen Angel]** Tăng 18% sát thương và hồi **${healAmt.toLocaleString()}** HP!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.06,
        minMaxHpPct: 0.03,
        healType: "missing_hp",
        damageMult: 1.18,
        selfDamageReduce: 0.12,
        log: (name, healAmt) => `${st.lifesteal} **[Fallen Angel]** Hồi phục **${healAmt.toLocaleString()}** HP và tăng 18% sát thương lên Boss!`,
      },
    },
  },

  greeddagger: {
    name: "Đoản Đao Tham Lam",
    type: PASSIVE_TYPES.LIFESTEAL,
    description: "Hút máu 9% sát thương gây ra (+14% sát thương); khi mục tiêu dưới 50% HP gây thêm 24% sát thương chí mạng kết liễu.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.09,
        damageMult: 1.14,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.24,
        log: (name, healAmt) => `${st.lifesteal} **[Greed Dagger]** Đoạt mệnh thôn phệ, hồi **${healAmt.toLocaleString()}** HP (+24% sát thương săn mồi)!`,
      },
      pvp: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.09,
        damageMult: 1.14,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.24,
        log: (name, healAmt) => `${st.lifesteal} **[Greed Dagger]** Hút máu, hồi **${healAmt.toLocaleString()}** HP!`,
      },
      boss: {
        type: PASSIVE_TYPES.LIFESTEAL,
        pct: 0.09,
        damageMult: 1.14,
        healType: "damage",
        executeThreshold: 0.50,
        executeBonus: 0.24,
        log: (name, healAmt) => `${st.lifesteal} **[Greed Dagger]** Thôn phệ sinh lực Boss, hồi **${healAmt.toLocaleString()}** HP!`,
      },
    },
  },

  asmodeus: {
    name: "Trường Kiếm Dục Vọng",
    type: PASSIVE_TYPES.ARMOR_SHRED,
    description: "45% cơ hội kích hoạt Cuồng Vọng: tăng 22% sát thương và phá 15% giáp của mục tiêu trong 2 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.40,
        damageMult: 1.22,
        log: (name) => `${st.atkup} **[Asmodeus]** Cuồng vọng bùng nổ! Tăng 22% sát thương và phá 15% giáp của **${name}**!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.40,
        damageMult: 1.22,
        log: () => `${st.atkup} **[Asmodeus]** Cuồng vọng tăng 22% sát thương và phá 15% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.15,
        cap: 0.45,
        damageMult: 1.24,
        log: () => `${st.atkup} **[Asmodeus]** Cuồng vọng bùng nổ! Tăng 24% sát thương và phá giáp Boss!`,
      },
    },
  },

  soulreaper: {
    name: "Lưỡi Hái Linh Hồn",
    type: PASSIVE_TYPES.HEAL_BAN,
    description: "45% kích hoạt Gặt Hái Linh Hồn: tăng 6% sát thương, cấm hồi máu 2 lượt và hút 5% máu thực. Khi mục tiêu dưới 35% HP gây thêm 24% sát thương kết liễu.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        damageMult: 1.08,
        executeThreshold: 0.35,
        executeBonus: 0.25,
        lifestealPct: 0.05,
        log: (name) => `${st.healreduction} **[Soul Reaper]** Lưỡi hái gặt hồn! **${name}** bị cấm hồi máu 2 lượt và chịu thêm sát thương kết liễu!`,
      },
      pvp: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        damageMult: 1.06,
        executeThreshold: 0.35,
        executeBonus: 0.24,
        lifestealPct: 0.05,
        log: () => `${st.healreduction} **[Soul Reaper]** Lưỡi hái gặt hồn! Cấm hồi máu và kết liễu mục tiêu thấp máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.HEAL_BAN,
        rounds: 2,
        damageMult: 1.10,
        executeThreshold: 0.35,
        executeBonus: 0.28,
        lifestealPct: 0.06,
        log: () => `${st.healreduction} **[Soul Reaper]** Lưỡi hái gặt hồn! Khóa hồi phục Boss và tăng sát thương kết liễu!`,
      },
    },
  },

  beelzebub: {
    name: "Xúc Tu Ruồi Hoại Tử",
    type: PASSIVE_TYPES.ARMOR_SHRED,
    description: "45% cơ hội kích hoạt Đàn Ruồi Hoại Tử: tăng 10% sát thương, ăn mòn 18% giáp & kháng phép (tối đa 36%) và hồi 4% HP tối đa.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.18,
        cap: 0.36,
        alsoShredMR: true,
        damageMult: 1.10,
        healPctMaxHp: 0.04,
        log: (name) => `${st.poisonous} **[Beelzebub]** Bầy ruồi hoại tử gặm nhấm, phá 18% song phòng của **${name}** và hồi 4% HP!`,
      },
      pvp: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.18,
        cap: 0.36,
        alsoShredMR: true,
        damageMult: 1.10,
        healPctMaxHp: 0.04,
        log: () => `${st.poisonous} **[Beelzebub]** Bầy ruồi phá 18% phòng ngự và hồi máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.ARMOR_SHRED,
        amount: 0.18,
        cap: 0.36,
        alsoShredMR: true,
        damageMult: 1.10,
        healPctMaxHp: 0.04,
        log: () => `${st.poisonous} **[Beelzebub]** Bầy ruồi hoại tử ăn mòn song phòng Boss!`,
      },
    },
  },

  satan: {
    name: "Ma Kiếm Hỏa Ngục",
    type: PASSIVE_TYPES.BURN,
    description: "45% kích hoạt Hỏa Ngục Tận Thế: thiêu đốt mục tiêu 3 lượt (theo STR), tăng 12% sát thương và cấm hồi máu 2 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.12,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: (name) => `${st.burn} **[Satan]** Ngọn lửa địa ngục thiêu rụi **${name}**, gây thiêu đốt và cấm hồi máu 2 lượt!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.12,
        alsoApplies: { type: PASSIVE_TYPES.HEAL_BAN, rounds: 2 },
        log: () => `${st.burn} **[Satan]** Hỏa ngục thiêu rụi đối thủ và cấm hồi máu!`,
      },
      boss: {
        type: PASSIVE_TYPES.BURN,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_ONLY,
        damageMult: 1.12,
        duration_ms: 30000,
        healReduced: true,
        log: () => `${st.burn} **[Satan]** Hỏa ngục thiêu đốt Boss, khóa hồi phục và tăng sát thương!`,
      },
    },
  },

  bladesorrow: {
    name: "Bladesorrow",
    type: PASSIVE_TYPES.BLEED,
    description: "45% cơ hội kích hoạt Vết Chém Bi Thương: tăng 10% sát thương, chảy máu 3 lượt và giảm 14% giáp (tối đa 28%).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.10,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.14, cap: 0.28 },
        ],
        log: (name) => `${st.bleed} **[Bladesorrow]** Lưỡi kiếm bi thương khiến **${name}** chảy máu 3 lượt và giảm 14% giáp!`,
      },
      pvp: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.10,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.14, cap: 0.28 },
        ],
        log: () => `${st.bleed} **[Bladesorrow]** Vết chém bi thương khiến đối thủ bị xuất huyết và giảm 14% giáp!`,
      },
      boss: {
        type: PASSIVE_TYPES.BLEED,
        rounds: 3,
        scaling: PASSIVE_SCALING.STR_DEX,
        damageMult: 1.10,
        extraEffects: [
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.14, cap: 0.28 },
        ],
        log: () => `${st.bleed} **[Bladesorrow]** Lưỡi kiếm bi thương găm sâu vào Boss, gây chảy máu và phá giáp!`,
      },
    },
  },

  frostgauntlet: {
    name: "Găng Tay Băng Giá",
    type: PASSIVE_TYPES.FREEZE,
    description: "45% cơ hội giải phóng Hàn Khí: tăng 10% sát thương, xuyên 12% kháng phép và 25% cơ hội đóng băng 1 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.28,
        damageMult: 1.12,
        pierceAmount: 0.12,
        log: (name) => `${st.freeze} **[Găng Tay Băng Giá]** Hàn khí đóng băng **${name}** trong 1 lượt và tăng 12% sát thương!`,
      },
      pvp: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.25,
        damageMult: 1.10,
        pierceAmount: 0.12,
        log: () => `${st.freeze} **[Găng Tay Băng Giá]** Hàn khí xuyên phòng thủ và đóng băng đối thủ trong 1 lượt!`,
      },
      boss: {
        type: PASSIVE_TYPES.FREEZE,
        rounds: 1,
        chance: 0.22,
        damageMult: 1.12,
        pierceAmount: 0.12,
        log: () => `${st.frostbite} **[Găng Tay Băng Giá]** Hàn khí làm chậm nhịp hành động của boss!`,
      },
    },
  },

  demonbook: {
    name: "Quỷ Thư",
    type: PASSIVE_TYPES.RANDOM_EFFECT,
    description: "45% kích hoạt tà thuật cổ đại (+12% ST): ngẫu nhiên Hỏa Ngục (thiêu đốt), Hủ Bại (phá 24% giáp & kháng phép), hoặc Hóa Đá (choáng 1 lượt).",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.12,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.24, alsoShredMR: true, cap: 0.42 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.dispe} **[Quỷ Thư]** Lời nguyền tà thuật cổ đại giải phóng!`,
      },
      pvp: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.12,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.24, alsoShredMR: true, cap: 0.42 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.dispe} **[Quỷ Thư]** Lời nguyền tà thuật giải phóng!`,
      },
      boss: {
        type: PASSIVE_TYPES.RANDOM_EFFECT,
        damageMult: 1.14,
        effects: [
          { type: PASSIVE_TYPES.BURN, rounds: 2, scaling: PASSIVE_SCALING.INT_ARC },
          { type: PASSIVE_TYPES.ARMOR_SHRED, amount: 0.24, alsoShredMR: true, cap: 0.42 },
          { type: PASSIVE_TYPES.STUN, rounds: 1 },
        ],
        log: () => `${st.dispe} **[Quỷ Thư]** Lời nguyền tà thuật gieo rắc lên Boss!`,
      },
    },
  },

  thorshammer: {
    name: "Búa Lôi Thần Thor",
    type: PASSIVE_TYPES.STUN,
    description: "45% cơ hội gọi Thiên Lôi Giáng Thế: tăng 16% sát thương lôi điện và 40% cơ hội làm choáng mục tiêu 1 lượt.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        chance: 0.45,
        damageMult: 1.18,
        log: (name) => `${st.stun} **[Búa Lôi Thần Thor]** Thiên lôi giáng thế! Làm choáng **${name}** và tăng 18% sát thương lôi điện!`,
      },
      pvp: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        chance: 0.40,
        damageMult: 1.16,
        log: () => `${st.stun} **[Búa Lôi Thần Thor]** Thiên lôi làm choáng đối thủ và tăng 16% sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.STUN,
        rounds: 1,
        chance: 0.40,
        damageMult: 1.20,
        log: () => `${st.stun} **[Búa Lôi Thần Thor]** Sấm thần làm gián đoạn Boss và tăng sát thương!`,
      },
    },
  },

  odinhammer: {
    name: "Búa Toàn Tri Odin",
    type: PASSIVE_TYPES.DAMAGE_MULT,
    description: "Đòn đánh thứ 3 được Odin khai nhãn: gây 1.70x sát thương và xuyên 45% kháng phép mục tiêu.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.70,
        hitCount: 3,
        mrPierce: 0.45,
        log: () => `${st.atkup} **[Búa Toàn Tri Odin]** Cổ ngữ khải huyền! Đòn đánh thứ 3 gây 1.70x sát thương và xuyên 45% kháng phép!`,
      },
      pvp: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.70,
        hitCount: 3,
        mrPierce: 0.45,
        log: () => `${st.atkup} **[Búa Toàn Tri Odin]** Đòn đánh thứ 3 xuyên kháng phép và gây 1.70x sát thương!`,
      },
      boss: {
        type: PASSIVE_TYPES.DAMAGE_MULT,
        mult: 1.75,
        hitCount: 3,
        mrPierce: 0.45,
        log: () => `${st.atkup} **[Búa Toàn Tri Odin]** Đòn thứ 3 gây 1.75x sát thương và xuyên kháng phép Boss!`,
      },
    },
  },

  darkhold: {
    name: "Bí Thuật Hắc Ám Darkhold",
    type: PASSIVE_TYPES.MR_SHRED,
    description: "45% kích hoạt Trói Buộc Hư Vô: tăng 12% sát thương, phá 22% kháng phép mục tiêu (tối đa 44%) và giảm 12% sát thương nhận vào.",
    mode: {
      dungeon: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.22,
        cap: 0.44,
        damageMult: 1.12,
        selfDamageReduce: 0.12,
        log: (name) => `${st.break} **[Darkhold]** Bí thuật hư vô ăn mòn 22% kháng phép của **${name}** và giảm 12% sát thương nhận vào!`,
      },
      pvp: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.22,
        cap: 0.44,
        damageMult: 1.12,
        selfDamageReduce: 0.12,
        log: () => `${st.break} **[Darkhold]** Phá 22% kháng phép và giảm 12% sát thương nhận vào!`,
      },
      boss: {
        type: PASSIVE_TYPES.MR_SHRED,
        amount: 0.22,
        permanent: true,
        damageMult: 1.12,
        selfDamageReduce: 0.12,
        log: () => `${st.break} **[Darkhold]** Bí thuật hư vô làm suy yếu 22% kháng phép Boss!`,
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

const NORMAL_WEAPON_KEYS = new Set([
  "longsword",
  "staff",
  "dagger",
  "warhammer",
  "greatsword",
  "wand",
  "bow",
]);

const normalizePassiveKey = (subType) => {
  const clean = String(subType || "").toLowerCase().replace(/\s+/g, "");
  if (NORMAL_WEAPON_KEYS.has(clean)) return clean;
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
      const pIcon = s.mr_pierce || "";
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
      const tIcon = s.third_hit || "";
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
      `Vũ khí chiến đấu cơ bản, cộng hưởng sát thương trực tiếp theo hệ số Scale của nhân vật.`
    );
    lines.push(
      `> • **Thuần Vũ Khí** - Không có nội tại đặc biệt, tối ưu hóa sát thương cơ bản.`
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
