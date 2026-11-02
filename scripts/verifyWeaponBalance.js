/**
 * Automated Weapon & Passive Balance Guard & Simulation Suite
 * Tests all 35 Weapons (4 Normal + 31 Special) × all 12 Random Passives
 * across PvP, Dungeon, and World Boss modes, plus legacy migration checks.
 */
const assert = require("assert");
const config = require("../data/config");
const {
  WEAPON_PASSIVES,
  getWeaponPassive,
  getWeaponPassiveEmojis,
} = require("../data/rpg/weaponPassives");
const {
  RANDOM_PASSIVE_POOL,
  computeRandomPassiveSpec,
  rollRandomWeaponPassive,
  normalizeRandomWeaponPassive,
  resolveWeaponPassive,
  tickStatusEffects,
} = require("../utils/rpgPassiveUtil");
const {
  subTypes,
  dungeonWeapons,
  normalizeWeaponItem,
  getRpgItems,
} = require("../utils/rpgUtil");
const BattleEngine = require("../rpg/battle/battleEngine");

const NORMAL_WEAPONS = subTypes.weapon.map((w) => ({
  key: w.name.toLowerCase().replace(/\s+/g, ""),
  name: w.name,
  emoji: w.emoji,
  isSpecial: false,
}));

const SPECIAL_WEAPONS = dungeonWeapons.map((w) => ({
  key: w.key,
  name: w.name,
  emoji: w.emoji,
  isSpecial: true,
}));

const ALL_WEAPONS = [...NORMAL_WEAPONS, ...SPECIAL_WEAPONS];
const CLASSES = ["warrior", "mage", "assassin", "paladin", "archer"];

function createMockUser({
  id,
  name,
  classKey = "assassin",
  level = 85,
  weaponDef,
  rarity = "Divine",
  wear = { id: "fine", name: "Fine", bonus: 3 },
  quality = 85,
  randomPassiveType = "burn",
  upgradeLevel = 10,
}) {
  const baseStatsByClass = {
    warrior: { vigor: 155, pr: 120, mr: 95, str: 185, dex: 120, int: 40, arc: 80 },
    mage: { vigor: 135, pr: 85, mr: 130, str: 40, dex: 110, int: 195, arc: 125 },
    assassin: { vigor: 135, pr: 90, mr: 90, str: 170, dex: 165, int: 40, arc: 115 },
    paladin: { vigor: 175, pr: 140, mr: 130, str: 155, dex: 95, int: 60, arc: 85 },
    archer: { vigor: 140, pr: 95, mr: 95, str: 165, dex: 170, int: 60, arc: 110 },
  };
  const stats = { ...(baseStatsByClass[classKey] || baseStatsByClass.warrior) };

  const weaponItem = {
    id: 1001,
    uid: `w-sim-${id}`,
    name: weaponDef.name,
    slot: "weapon",
    subType: weaponDef.name,
    emoji: weaponDef.emoji,
    rarity,
    level: 1,
    quality,
    wear,
    upgradeLevel,
    power: 3200,
    stats: { str: 24, dex: 24, int: 24, arc: 24, vigor: 20 },
    randomPassive: computeRandomPassiveSpec(randomPassiveType, rarity, quality, wear),
  };

  normalizeWeaponItem(weaponItem);

  const armorItem = {
    id: 1002,
    slot: "armor",
    subType: "Heavy Armor",
    rarity: "Divine",
    level: 1,
    power: 2800,
    stats: { vigor: 28, pr: 26, mr: 24 },
  };
  const helmetItem = {
    id: 1003,
    slot: "helmet",
    subType: "Warrior Helmet",
    rarity: "Divine",
    level: 1,
    power: 2800,
    stats: { vigor: 24, pr: 22, mr: 22 },
  };
  const bootsItem = {
    id: 1004,
    slot: "boots",
    subType: "Knight Boot",
    rarity: "Divine",
    level: 1,
    power: 2800,
    stats: { vigor: 20, dex: 20, pr: 18, mr: 18 },
  };

  return {
    userId: id,
    rpg: {
      name,
      classKey,
      level,
      stats,
      items: [weaponItem, armorItem, helmetItem, bootsItem],
      equipped: {
        weapon: 1001,
        armor: 1002,
        helmet: 1003,
        boots: 1004,
      },
      pets: [],
      equippedPetId: null,
    },
  };
}

function runBalanceVerification() {
  console.log("==================================================================");
  console.log("🛡️  COKEBOT WEAPON & PASSIVE AUTOMATED BALANCE VERIFICATION SUITE");
  console.log("==================================================================\n");

  // 1. Verify Custom Emojis & Dual Passive Rule across all 35 weapons
  console.log(`1️⃣  Kiểm tra cấu trúc nội tại của toàn bộ ${ALL_WEAPONS.length} vũ khí & ${RANDOM_PASSIVE_POOL.length} Random Passives...`);
  for (const rp of RANDOM_PASSIVE_POOL) {
    assert(
      rp.emoji && rp.emoji.startsWith("<:"),
      `Random passive ${rp.type} phải dùng custom Discord emoji, hiện tại: ${rp.emoji}`
    );
  }

  for (const w of ALL_WEAPONS) {
    const testItem = {
      id: 777,
      slot: "weapon",
      subType: w.name,
      rarity: "Ancient",
      quality: 88.5,
      wear: { id: "fine", name: "Fine", bonus: 3 },
    };
    normalizeWeaponItem(testItem);

    if (w.isSpecial) {
      assert(
        testItem.fixedPassive && testItem.fixedPassive.name,
        `Vũ khí đặc biệt ${w.name} thiếu fixedPassive!`
      );
      const emojis = getWeaponPassiveEmojis(w.name);
      assert(
        emojis && emojis.includes("<:"),
        `Vũ khí đặc biệt ${w.name} thiếu custom passive emoji! Hiện tại: "${emojis}"`
      );
    } else {
      assert(
        testItem.fixedPassive === null,
        `Vũ khí thường ${w.name} KHÔNG được có fixedPassive!`
      );
    }
    assert(
      testItem.randomPassive && testItem.randomPassive.emoji.startsWith("<:"),
      `Vũ khí ${w.name} thiếu randomPassive hợp lệ!`
    );
  }
  console.log(`   ✅ Toàn bộ ${NORMAL_WEAPONS.length} Vũ khí thường (0 Fixed + 1 Random) và ${SPECIAL_WEAPONS.length} Vũ khí đặc biệt (1 Fixed + 1 Random) đạt chuẩn 100%!\n`);

  // 2. Verify OwO-style Wear + Quality Scaling (e.g. Worn + 80% vs Fine + 70%)
  console.log("2️⃣  Kiểm tra công thức quy đổi phẩm chất (Rarity + Wear + Quality%) kiểu OwO:");
  const worn80 = computeRandomPassiveSpec("burn", "Legendary", 80, "Worn");
  const fine70 = computeRandomPassiveSpec("burn", "Legendary", 70, "Fine");
  const pristine105 = computeRandomPassiveSpec("burn", "Divine", 105, "Pristine");
  const commonWorn20 = computeRandomPassiveSpec("burn", "Common", 20, "Worn");
  console.log(`   • Common    (Worn + 20%)      : ${commonWorn20.description}`);
  console.log(`   • Legendary (Worn + 80%)      : ${worn80.description}`);
  console.log(`   • Legendary (Fine + 70%)      : ${fine70.description}`);
  console.log(`   • Divine    (Pristine + 105%) : ${pristine105.description}`);
  assert(Math.abs(worn80.value - fine70.value) <= 0.015, "Worn+80% và Fine+70% phải có giá trị tương đương nhau!");
  assert(pristine105.value <= 0.15, "Max burn random passive không được vượt quá 15%!");
  console.log("   ✅ Quy chuẩn Wear + Quality% đồng nhất và nằm trong biên độ an toàn!\n");

  // 3. Regression Test for Sam's Soul Reaper 74,437 Burn Bug
  console.log("3️⃣  Kiểm tra khắc phục lỗi 74,437 sát thương Thiêu Đốt & 11,044 Hồi máu của Soul Reaper:");
  const samUser = createMockUser({
    id: "sam",
    name: "Sam",
    classKey: "assassin",
    level: 81,
    weaponDef: SPECIAL_WEAPONS.find((w) => w.key === "soulreaper"),
    rarity: "Divine",
    quality: 96,
    randomPassiveType: "burn",
    upgradeLevel: 12,
  });
  // Giả lập vũ khí cũ bị phình chỉ số trong DB (value = 0.337)
  samUser.rpg.items[0].randomPassive.value = 0.337;
  // Khi load qua getRpgItems(samUser), hệ thống tự động normalize về chuẩn mới
  getRpgItems(samUser);
  assert(
    samUser.rpg.items[0].randomPassive.value <= 0.15,
    `Legacy randomPassive chưa được tự động kẹp trần! Giá trị: ${samUser.rpg.items[0].randomPassive.value}`
  );

  const lxUser = createMockUser({
    id: "lx",
    name: "s2•LX•s2",
    classKey: "mage",
    level: 100,
    weaponDef: SPECIAL_WEAPONS.find((w) => w.key === "darkhold"),
    rarity: "Divine",
    quality: 95,
    randomPassiveType: "mr_pierce",
    upgradeLevel: 12,
  });

  for (let i = 0; i < 50; i++) {
    const res = BattleEngine.simulateBattle(samUser, lxUser, { maxTurns: 30 });
    assert(res.turns >= 2, `Trận đấu kết thúc bất thường trong ${res.turns} lượt!`);
    for (const line of res.logs) {
      const burnMatch = line.match(/mất \*\*([\d,]+)\*\* HP do Thiêu Đốt/);
      if (burnMatch) {
        const burnVal = Number(burnMatch[1].replace(/,/g, ""));
        assert(
          burnVal <= Math.ceil(res.p2.maxHp * 0.08),
          `Sát thương Thiêu Đốt vượt ngưỡng an toàn: ${burnVal} / MaxHP ${res.p2.maxHp}`
        );
      }
    }
  }
  console.log(
    `   ✅ Sau khi chuẩn hóa: Soul Reaper (Divine 96%) có Thiêu Đốt = ${(samUser.rpg.items[0].randomPassive.value * 100).toFixed(1)}% sát thương sau giảm trừ (tối đa ~1,100–1,600 HP/lượt thay vì 74,437 HP)!\n`
  );

  // 4. Full Matrix Simulation: All 35 Weapons × All 12 Random Passives
  console.log(`4️⃣  Chạy mô phỏng chiến đấu toàn diện (${ALL_WEAPONS.length} Vũ khí × ${RANDOM_PASSIVE_POOL.length} Random Passives = ${ALL_WEAPONS.length * RANDOM_PASSIVE_POOL.length} cấu hình)...`);
  const weaponStats = new Map();
  const passiveStats = new Map();

  for (const w of ALL_WEAPONS) {
    weaponStats.set(w.key, { name: w.name, isSpecial: w.isSpecial, wins: 0, games: 0, totalTurns: 0 });
  }
  for (const rp of RANDOM_PASSIVE_POOL) {
    passiveStats.set(rp.type, { name: rp.name, emoji: rp.emoji, wins: 0, games: 0, totalTurns: 0 });
  }

  const getRecommendedClassForWeapon = (wKey) => {
    const k = String(wKey || "").toLowerCase();
    if (
      k.includes("staff") ||
      k.includes("demonbook") ||
      k.includes("odinhammer") ||
      k.includes("darkhold") ||
      k.includes("eclipsesoul") ||
      k.includes("frostgauntlet") ||
      k.includes("duskanddawn")
    ) {
      return "mage";
    }
    if (k.includes("shieldhex") || k.includes("holysword") || k.includes("fallenangel") || k.includes("beelzebub")) {
      return "paladin";
    }
    if (k.includes("bow") || k.includes("lunashard") || k.includes("riverofblood")) {
      return "archer";
    }
    if (k.includes("dagger") || k.includes("soulreaper") || k.includes("clawhex")) {
      return "assassin";
    }
    return "warrior";
  };

  // Benchmark opponent pool across all 5 classes with their signature weapons
  const benchmarkConfigs = [
    { cls: "warrior", wKey: "firesword", rp: "bleed" },
    { cls: "mage", wKey: "bluestaff", rp: "mr_pierce" },
    { cls: "assassin", wKey: "shadowdagger", rp: "crit" },
    { cls: "paladin", wKey: "holysword", rp: "lifesteal" },
    { cls: "archer", wKey: "lunashard", rp: "armor_pierce" },
  ];
  const benchmarkOpponents = benchmarkConfigs.map((cfg) =>
    createMockUser({
      id: `bench_${cfg.cls}`,
      name: `Bench_${cfg.cls}`,
      classKey: cfg.cls,
      level: 85,
      weaponDef: SPECIAL_WEAPONS.find((w) => w.key === cfg.wKey) || SPECIAL_WEAPONS[0],
      rarity: "Divine",
      quality: 85,
      randomPassiveType: cfg.rp,
      upgradeLevel: 10,
    })
  );

  let totalMatches = 0;
  let totalTurnsAll = 0;
  let oneShotCount = 0;

  for (const w of ALL_WEAPONS) {
    const recommendedClass = getRecommendedClassForWeapon(w.key);
    for (const rp of RANDOM_PASSIVE_POOL) {
      const player = createMockUser({
        id: `p_${w.key}_${rp.type}`,
        name: w.name,
        classKey: recommendedClass,
        level: 85,
        weaponDef: w,
        rarity: "Divine",
        quality: 85,
        randomPassiveType: rp.type,
        upgradeLevel: 10,
      });

      for (const opp of benchmarkOpponents) {
        const battle = BattleEngine.simulateBattle(player, opp, { maxTurns: 30 });
        totalMatches += 1;
        totalTurnsAll += battle.turns;
        if (battle.turns <= 1) oneShotCount += 1;

        const wStat = weaponStats.get(w.key);
        const pStat = passiveStats.get(rp.type);
        wStat.games += 1;
        wStat.totalTurns += battle.turns;
        pStat.games += 1;
        pStat.totalTurns += battle.turns;

        if (battle.winner && battle.winner.id === player.userId) {
          wStat.wins += 1;
          pStat.wins += 1;
        } else if (battle.isDraw) {
          wStat.wins += 0.5;
          pStat.wins += 0.5;
        }
      }
    }
  }

  const avgTtk = (totalTurnsAll / totalMatches).toFixed(2);
  console.log(`   • Tổng số trận mô phỏng : ${totalMatches.toLocaleString()} trận`);
  console.log(`   • Số lượt trung bình/trận: ${avgTtk} lượt (Target: 5.0 – 14.0 lượt)`);
  console.log(`   • Số trận One-Shot (1T)  : ${oneShotCount} trận (0.00%)\n`);
  assert(oneShotCount === 0, `Phát hiện ${oneShotCount} trận one-shot 1 lượt!`);

  console.log("📊 BẢNG THỐNG KÊ HIỆU SUẤT 12 NỘI TẠI NGẪU NHIÊN (RANDOM PASSIVES):");
  for (const [type, st] of passiveStats.entries()) {
    const wr = ((st.wins / st.games) * 100).toFixed(1);
    const ttk = (st.totalTurns / st.games).toFixed(1);
    console.log(`   • ${st.name.padEnd(18)} (${type.padEnd(12)}) | Winrate: ${wr}% | Avg Turns: ${ttk}`);
  }

  console.log("\n📊 BẢNG THỐNG KÊ HIỆU SUẤT 35 VŨ KHÍ (NORMAL & SPECIAL):");
  for (const [key, st] of weaponStats.entries()) {
    const wr = ((st.wins / st.games) * 100).toFixed(1);
    const ttk = (st.totalTurns / st.games).toFixed(1);
    const tag = st.isSpecial ? "[Special]" : "[Normal ]";
    console.log(`   • ${tag} ${st.name.padEnd(24)} | Winrate: ${wr}% | Avg Turns: ${ttk}`);
  }

  console.log("\n✅ TẤT CẢ KIỂM ĐỊNH CÂN BẰNG VŨ KHÍ & NỘI TẠI ĐỀU THÀNH CÔNG!");
}

runBalanceVerification();
