module.exports = {
  prefix: "x",
  emoji: {
    blank: "<:blank:1403928807395819671>",
    money: "<:cokecy:1509951335016173662>",
    coinflip: "<a:coinflip:1394380327014891530>",
    heads: "<:heads:1405448328728285254>",
    tails: "<:tails:1405448342141403156>",
    slots_eggplant: "<:slots_eggplant:1403773769465594027>",
    slots_heart: "<:slots_heart:1403773780962181270>",
    slots_lychee: "<:slots_lychee:1403773792781861004>",
    slots_coin: "<a:slots_coin:1403773750448623716>",
    slots_U: "<:slots_U:1403773817301766346>",
    slots_W: "<:slots_W:1403773828533981286>",
    slots_rolling: "<a:slots_rollRecovered2:1403778802542313604>",
    dice: "<:rice:1396919696581857290>",
    dice_rolling: "<a:dice_rolldice:1403773919751831643>",
    dice_1: "<:dice_1:1403773853146288258>",
    dice_2: "<:dice_2:1403773866505011473>",
    dice_3: "<:dice_3:1403773877569458268>",
    dice_4: "<:dice_4:1403773888722108537>",
    dice_5: "<:dice_5:1403773898515943504>",
    dice_6: "<:dice_6:1404015916311642252>",
    back: "<:back:1387747558880841789>",
    As: "<:as:1387744476281180313>",
    "2s": "<:2s:1387744451430187070>",
    "3s": "<:3s:1387744435680448662>",
    "4s": "<:4s:1387744421117689856>",
    "5s": "<:5s:1387744401672900678>",
    "6s": "<:6s:1387744380521025536>",
    "7s": "<:7s:1387744359654621246>",
    "8s": "<:8s:1387744343573663795>",
    "9s": "<:9s:1387744328021049454>",
    "10s": "<:10s:1387744315001802839>",
    Js: "<:js:1387744943573045398>",
    Qs: "<:qs:1387744494937444524>",
    Ks: "<:ks:1387744640362352691>",
    Ah: "<:ah:1387747538479743046>",
    "2h": "<:2h:1387747525225615400>",
    "3h": "<:3h:1387747508582879283>",
    "4h": "<:4h:1387747459903651840>",
    "5h": "<:5h:1387747409458892801>",
    "6h": "<:6h:1387747390613618870>",
    "7h": "<:7h:1387747372792283176>",
    "8h": "<:8h:1387747352663818290>",
    "9h": "<:9h:1387747330081427456>",
    "10h": "<:10h:1387747310833897543>",
    Jh: "<:jh:1387747288411017328>",
    Qh: "<:qh:1387747094860927130>",
    Kh: "<:kh:1387747075621650523>",
    Ad: "<:ad:1387746016584798270>",
    "2d": "<:2d:1387745830768873482>",
    "3d": "<:3d:1387745813966618754>",
    "4d": "<:4d:1387745735952433286>",
    "5d": "<:5d:1387745682936303626>",
    "6d": "<:6d:1387745631421861898>",
    "7d": "<:7d:1387745614917537792>",
    "8d": "<:8d:1387745588853997811>",
    "9d": "<:9d:1387745073038622780>",
    "10d": "<:10d:1387745042197647493>",
    Jd: "<:jd:1387745008970629201>",
    Qd: "<:qd:1387744996974919791>",
    Kd: "<:kd:1387744979916558456>",
    Ac: "<:ac:1387747044189405204>",
    "2c": "<:2c:1387747027382702190>",
    "3c": "<:3c:1387747001067900958>",
    "4c": "<:4c:1387746985385398335>",
    "5c": "<:5c:1387746960357986344>",
    "6c": "<:6c:1387746942880055397>",
    "7c": "<:7c:1387746915462156288>",
    "8c": "<:8c:1387746898496065649>",
    "9c": "<:9c:1387746869517746338>",
    "10c": "<:10c:1387746849154269266>",
    Jc: "<:jc:1387746825771159592>",
    Qc: "<:qc:1387746055717781626>",
    Kc: "<:kc:1387746037199798445>",
    male: "<:male:1417090222717407283>",
    female: "<:female:1417090232762761298>",
    genderless: "<:genderless:1417090211640250438>",
    yes: "<:yes:1417090203188723722>",
    no: "<:no:1417090195702153258>",
    warning: "<:warning:1419916751604547704>",

    streakMilestones: {
      1: "<:fire1:1424934338356711534>",
      50: "<:fire50:1424934106080215100>",
      100: "<:fire100:1424934784769200138>",
      200: "<:fire200:1422828717335515206>",
      300: "<:fire300:1422828753804857425>",
      500: "<:fire500:1422828932130148352>",
    },
    fireBreak: "<:firebreak:1422828420735176876>",
  },

  category_emojis: {
    action: "🕹️",
    admin: "🛡️",
    cokecy: "<:cokecy:1509951335016173662>",
    cokemon: "🐶",
    gamble: "🎲",
    noitu: "🧩",
    rpg: "⚔️",
    shop: "🛒",
    user: "👤",
    default: "➡️",
  },

  rpg: {
    ...require("./rpg/rpgConfig"),
    classes: require("./rpg/classes"),
    boss: require("./rpg/boss"),
    skins: require("./rpg/skins"),
  },

  gamble_settings: {
    enable_special_treatment: false,
    max_bet: 250000,
    min_bet: 1,
    cooldown_second: 15,
  },

  channel_themes: {
    
    "1511282084260352091": null,
    
    "1511274018655698975": {
      main_types: ["Water", "Ice"],
      weight: 0.9,
    },
    
    "1511281435607044126": {
      main_types: ["Rock", "Ground", "Dragon"],
      weight: 0.9,
    },
    
    "1511281627941306430": {
      main_types: ["Dark", "Ghost"],
      weight: 0.9,
    },
    
    "1511281757339779192": {
      main_types: ["Electric", "Psychic", "Fairy"],
      weight: 0.9,
    },
    
    "1511281892526395532": {
      main_types: ["Grass", "Bug", "Flying", "Poison"],
      weight: 0.9,
    },
    
    "1511282007726882926": {
      main_types: ["Fighting", "Steel", "Normal"],
      weight: 0.9,
    },
    
    "1511294474469511309": {
      main_types: ["Dark", "Ghost", "Psychic"],
      weight: 0.9,
    },
  },

  cokemon_settings: {
    
    sell_percentage: 0.75,

    
    spawn_interval_ms: 15 * 1000,
    lure_duration_ms: 30 * 60 * 1000,
    lure_user_cooldown_ms: 30 * 60 * 1000,
    normal_spawn_cooldown_ms: 5 * 60 * 1000,
    lure_spawn_cooldown_ms: 2 * 60 * 1000,
    despawn_duration_ms: 5 * 60 * 1000,
    grace_period_ms: 60 * 1000,
    xp_cooldown_ms: 60 * 1000,
    friendship_cooldown_ms: 30 * 60 * 1000,
    cuddle_cooldown_ms: 60 * 60 * 1000,

    
    catch_net_uses: 20,
    max_stacked_nets: 5,

    
    max_iv: 31,
    max_level: 100,
    base_friendship: 70,
    max_friendship: 255,
    max_nickname_len: 20,

    
    shiny_rate: 4096, 
    tier_weights: {
      Common: 100,
      Rare: 25,
      Epic: 5,
      Ancient: 2,
      Legendary: 0.2,
    },
    tier_release_rewards: {
      Common: 200,
      Rare: 300,
      Epic: 400,
      Ancient: 500,
      Legendary: 1000,
      Mythical: 2000,
    },
    spawn_verbose: false,
    legendary_ping_role_id: "1243064840180994088",
  },

  natures: {
    
    Hardy: { plus: null, minus: null },
    Docile: { plus: null, minus: null },
    Serious: { plus: null, minus: null },
    Bashful: { plus: null, minus: null },
    Quirky: { plus: null, minus: null },

    
    Lonely: { plus: "atk", minus: "def" },
    Brave: { plus: "atk", minus: "spd" },
    Adamant: { plus: "atk", minus: "spatk" },
    Naughty: { plus: "atk", minus: "spdef" },

    
    Bold: { plus: "def", minus: "atk" },
    Relaxed: { plus: "def", minus: "spd" },
    Impish: { plus: "def", minus: "spatk" },
    Lax: { plus: "def", minus: "spdef" },

    
    Modest: { plus: "spatk", minus: "atk" },
    Mild: { plus: "spatk", minus: "def" },
    Quiet: { plus: "spatk", minus: "spd" },
    Rash: { plus: "spatk", minus: "spdef" },

    
    Calm: { plus: "spdef", minus: "atk" },
    Gentle: { plus: "spdef", minus: "def" },
    Sassy: { plus: "spdef", minus: "spd" },
    Careful: { plus: "spdef", minus: "spatk" },

    
    Timid: { plus: "spd", minus: "atk" },
    Hasty: { plus: "spd", minus: "def" },
    Jolly: { plus: "spd", minus: "spatk" },
    Naive: { plus: "spd", minus: "spdef" },
  },

  type_colors: {
    Fire: "#FF4500",
    Water: "#1E90FF",
    Grass: "#32CD32",
    Electric: "#FFD700",
    Flying: "#A890F0",
    Rock: "#B8A038",
    Ground: "#E0C068",
    Bug: "#A8B820",
    Fighting: "#C03028",
    Psychic: "#F85888",
    Dragon: "#7038F8",
    Steel: "#B8B8D0",
    Normal: "#A8A878",
    Poison: "#A040A0",
    Ice: "#98D8D8",
    Fairy: "#EE99AC",
    Ghost: "#705898",
    Dark: "#705848",
  },

  type_emojis: {
    Fire: "<:fire:1417090001430118441>",
    Water: "<:water:1417090025891565598>",
    Grass: "<:grass:1417089962943188992>",
    Electric: "<:electric:1417090105067175946>",
    Flying: "<:flying:1417089993855340694>",
    Rock: "<:rock:1417090075627491400>",
    Ground: "<:ground:1417090085849141309>",
    Bug: "<:bug:1417089950763188335>",
    Fighting: "<:fighting:1417090125027999824>",
    Psychic: "<:psychic:1417090018123583630>",
    Dragon: "<:dragon:1417090096485765161>",
    Steel: "<:steel:1417090118107402321>",
    Normal: "<:normal:1417161770941943858>",
    Poison: "<:poison:1417089975144419450>",
    Ice: "<:ice:1417090041007706134>",
    Fairy: "<:fairy:1417090032124035112>",
    Ghost: "<:ghost:1417090065448042546>",
    Dark: "<:dark:1417955762000625745>",
  },

  type_backgrounds: {
    Fire: "fire-bg.png",
    Water: "water-bg.png",
    Grass: "grass-bg.png",
    Electric: "electric-bg.png",
    Flying: "flying-bg.png",
    Rock: "rock-bg.png",
    Ground: "ground-bg.png",
    Bug: "bug-bg.png",
    Fighting: "fighting-bg.png",
    Psychic: "psychic-bg.png",
    Dragon: "dragon-bg.png",
    Steel: "steel-bg.png",
    Normal: "normal-bg.png",
    Poison: "poison-bg.png",
    Ice: "ice-bg.png",
    Fairy: "fairy-bg.png",
    Ghost: "ghost-bg.png",
    Dark: "dark-bg.png",
    default: "default-bg.png",
  },

  permissions: {
    dev_ids: [process.env.OWNER_ID, "690168451255631934"],
    admin_ids: [],
    anticheat_immune_ids: [],
  },

  anticheat: {
    mute_duration_ms: 60 * 60 * 1000,

    
    burst_enabled: true,
    burst_bucket_capacity: 12,
    burst_refill_rate_ms: 1000,

    bot_detection_enabled: true,

    
    rhythm_history_length: 15,
    rhythm_min_messages: 15,
    rhythm_std_dev_threshold_ms: 100,

    
    monotony_threshold: 60,

    
    focus_history_length: 50,
    focus_min_commands: 25,
    focus_high_value_commands: ["c", "catch", "hunt", "h", "autohunt", "ah", "dungeon", "dg", "battle", "b", "boss", "bs"],
    focus_ratio_threshold: 0.85,

    
    verification_enabled: true,
    verification_timeout_ms: 30 * 1000,
    verification_code_length: 6,
    verification_max_attempts: 5,
  },
  ai: {
    embedding_model: "gemini-embedding-001",
    embedding_dimensions: 3072,
    generative_model: "gemini-2.5-flash",
    ask_cooldown_ms: 30000,
    ask_history_limit: 6,
    thread_name_prefix: "🤖 Tổng đài hỗ trợ CokeBot:",
    thread_archive_minutes: 60,
    
    thread_expiry_ms: 60 * 60 * 1000,
    knowledge_base_version: "1.0.0",
  },
  dungeon: {
    normal_monster: {
      base_hp: 9100,
      round_hp_mult: 0.1,
      base_atk: 91,
      round_atk_mult: 0.05,
      base_defense: 58,
    },
    ranged_class_mitigation: {
      classes: ["archer", "mage"],
      multiplier: 0.6, 
    },
    rewards: {
      base_coke: 80000,
      base_exp: 24000,
    },
    default_boss: {
      key: "tf",
      name_phase1: "Boss TF (Phase 1)",
      name_phase2: "Boss TF (Phase 2 - Điên Loạn)",
      image_phase1: "TF.png",
      image_phase2: "TF-2.png",
      stats: {
        phase1: {
          base_hp: 300000,
          base_atk: 250,
          base_defense: 100,
        },
        phase2: {
          base_hp: 150000,
          base_atk_mult: 1.5,
          base_defense: 100,
        },
      },
      mechanics: {
        dice_roll: true,
        coin_flip: true,
        vulnerable_on_heal_ban: false,
      },
    },
    chapters: {
      1: {
        boss: {
          key: "skulgod",
          name_phase1: "Boss Skulgod (Phase 1)",
          name_phase2: "Boss Skulgod (Phase 2 - Điên Loạn)",
          image_phase1: "Skulgod.png",
          image_phase2: "skulgod-2.png",
          stats: {
            phase1: {
              base_hp: 240000,
              base_atk: 270,
              base_defense: 175,
            },
            phase2: {
              base_hp: 130000,
              base_atk_mult: 1.6,
              base_defense: 162,
            },
          },
          passive: {
            name: "Lời Nguyền Xương",
            chance: 0.40,
            duration: 2,
            type: "heal_ban",
          },
          mechanics: {
            dice_roll: false,
            coin_flip: false,
            vulnerable_on_heal_ban: true,
          },
          first_clear_reward: {
            claim_key: "firesword",
            emoji: "<:firesword:1514232156279406682>",
            name: "Hỏa Long Thần Kiếm",
            rarity: "Ancient",
            image_path: "Weapon/firesword.png",
          },
        },
      },
      2: {
        boss: {
          key: "vaelmor",
          name_phase1: "Vaelmor (Kịch Độc Cổ Thần)",
          name_phase2: "Vaelmor (Miasma Điên Cuồng)",
          image_phase1: "Vaelmor.png",
          image_phase2: "Vaelmor.png",
          stats: {
            phase1: {
              base_hp: 310000,
              base_atk: 300,
              base_defense: 188,
            },
            phase2: {
              base_hp: 165000,
              base_atk_mult: 1.6,
              base_defense: 169,
            },
          },
          mechanics: {
            dice_roll: false,
            coin_flip: false,
            vulnerable_on_heal_ban: false,
          },
          first_clear_reward: {
            claim_key: "greenstaff",
            emoji: "<:greenstaff:1514232158502518945>",
            name: "Mộc Diệp Pháp Trượng",
            rarity: "Ancient",
            image_path: "Weapon/greenstaff.png",
          },
        },
      },
      3: {
        boss: {
          key: "mourngait",
          name_phase1: "Mourngait (Bị Phong Ấn)",
          name_phase2: "Mourngait (Hắc Hỏa Phá Lệ)",
          image_phase1: "Mourngait.png",
          image_phase2: "Mourngait.png",
          stats: {
            phase1: {
              base_hp: 360000,
              base_atk: 320,
              base_defense: 200,
            },
            phase2: {
              base_hp: 195000,
              base_atk_mult: 1.7,
              base_defense: 175,
            },
          },
          mechanics: {
            dice_roll: false,
            coin_flip: false,
            vulnerable_on_heal_ban: false,
          },
          first_clear_reward: {
            claim_key: "bluestaff",
            emoji: "<:bluestaff:1514232160897339442>",
            name: "Lam Tinh Thần Trượng",
            rarity: "Ancient",
            image_path: "Weapon/bluestaff.png",
          },
        },
      },
      4: {
        boss: {
          key: "eldric",
          name_phase1: "Eldric (Thần Cung Trọng Lực)",
          name_phase2: "Eldric (Tâm Trọng Lực Cực Hạn)",
          image_phase1: "Eldric.png",
          image_phase2: "Eldric.png",
          stats: {
            phase1: {
              base_hp: 380000,
              base_atk: 330,
              base_defense: 215,
            },
            phase2: {
              base_hp: 210000,
              base_atk_mult: 1.8,
              base_defense: 185,
            },
          },
          mechanics: {
            dice_roll: false,
            coin_flip: false,
            vulnerable_on_heal_ban: false,
          },
          first_clear_reward: {
            claim_key: "gravitybow",
            emoji: "<:GravityBow:1516389241347641415>",
            name: "Cung Trọng Lực GravityBow",
            rarity: "Ancient",
            image_path: "Weapon/GravityBow.png",
          },
        },
      },
      5: {
        boss: {
          key: "tf",
          name_phase1: "Boss TF (Phase 1)",
          name_phase2: "Boss TF (Phase 2 - Điên Loạn)",
          image_phase1: "TF.png",
          image_phase2: "TF-2.png",
          stats: {
            phase1: {
              base_hp: 440000,
              base_atk: 400,
              base_defense: 235,
            },
            phase2: {
              base_hp: 240000,
              base_atk_mult: 1.9,
              base_defense: 210,
            },
          },
          mechanics: {
            dice_roll: true,
            coin_flip: true,
            vulnerable_on_heal_ban: false,
          },
          first_clear_reward: {
            claim_key: "crimsondagger",
            emoji: "<:crimsondagger:1514232163158065252>",
            name: "Huyết Nguyệt Đoản Đao",
            rarity: "Ancient",
            image_path: "Weapon/crimsondagger.png",
          },
        },
      },
      6: {
        boss: {
          key: "veilreaper",
          name_phase1: "Veilreaper (Tử Thần Hắc Hỏa)",
          name_phase2: "Veilreaper (Chiến Thần Diệt Vong)",
          image_phase1: "Veilreaper.png",
          image_phase2: "Veilreaper.png",
          stats: {
            phase1: {
              base_hp: 520000,
              base_atk: 500,
              base_defense: 265,
            },
            phase2: {
              base_hp: 280000,
              base_atk_mult: 2.2,
              base_defense: 245,
            },
          },
          mechanics: {
            dice_roll: false,
            coin_flip: false,
            vulnerable_on_heal_ban: false,
          },
          first_clear_reward: {
            claim_key: "shadowdagger",
            emoji: "<:shadowdagger:1514232151766339635>",
            name: "Ảnh Hồn Đoản Đao",
            rarity: "Ancient",
            image_path: "Weapon/shadowdagger.png",
          },
        },
      },
    },
  },
};
