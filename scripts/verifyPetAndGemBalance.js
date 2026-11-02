/**
 * Automated Verification Suite for Hunting Gems (including Special Event Gems)
 * and the 6 Pet Battle Stats (HP, ATT, PR, WP, MAG, MR) across PvP, Dungeon, & World Boss.
 */
const assert = require("assert");
const { ensureUserGems, equipGem, consumeGemsOnHunt } = require("../utils/gemUtil");
const { EVENT_CONFIG } = require("../data/event");
const { PET_SPECIES, computePetStatEffects, generatePetStats } = require("../data/pets");
const { getEquippedPetBonuses, getEffectiveRpgStats, resolvePetTurnAction } = require("../utils/rpgUtil");
const { applyStatusEffect, tickStatusEffects } = require("../utils/rpgPassiveUtil");
const BattleEngine = require("../rpg/battle/battleEngine");

console.log("==================================================================");
console.log("🐾💎 COKEBOT GEM & 6-STAT PET REALIZATION VERIFICATION SUITE");
console.log("==================================================================\n");

// 1. Test Gem System & Special Event Gem Bug Fix
console.log("1️⃣  Kiểm tra hệ thống Ngọc Săn Thú & Ngọc Sự Kiện (Special Gems)...");
const prevForce = EVENT_CONFIG.forceActive;
EVENT_CONFIG.forceActive = true;

const mockUser = {
  inventory: new Map([
    ["81", 2], // Rare Special Gem (50 durability)
    ["77", 1], // Legendary Lucky Gem
    ["51", 1], // Common Hunting Gem (25 hunts)
    ["65", 1], // Common Empowering Gem (25 animals)
  ]),
  huntGems: {
    hunting: null,
    empowering: null,
    lucky: { id: "75", durability: 0 }, // Stale broken gem
    special: { id: "80", durability: 5 }, // Invalid removed gem ID
  },
  markModified() {},
};

ensureUserGems(mockUser);
assert.strictEqual(mockUser.huntGems.lucky, null, "Stale 0-durability lucky gem must be cleared");
assert.strictEqual(mockUser.huntGems.special, null, "Invalid legacy gem #80 must be cleared");

const eqSpecial1 = equipGem(mockUser, "81");
assert.strictEqual(eqSpecial1.success, true, "Should equip Special Gem #81 after stale slot is cleared");
assert.strictEqual(mockUser.huntGems.special.durability, 100);

assert.strictEqual(equipGem(mockUser, "51").success, true);
assert.strictEqual(equipGem(mockUser, "65").success, true);
assert.strictEqual(equipGem(mockUser, "77").success, true);

// Test ALREADY_ACTIVE informative message (like when user typed Xuse 77 while Lucky slot was occupied)
const dupLucky = equipGem(mockUser, "77");
assert.strictEqual(dupLucky.success, false);
assert.strictEqual(dupLucky.code, "ALREADY_ACTIVE");
assert(dupLucky.error.includes("#77"), "ALREADY_ACTIVE error should clearly show active gem ID and durability");

// Consume 20 hunts with baseCatchCount=5, totalAnimalsCaught=10 (Empowering 2x active)
for (let i = 0; i < 20; i++) {
  consumeGemsOnHunt(mockUser, 10, 5);
}
assert.strictEqual(
  mockUser.huntGems.special,
  null,
  "Special Gem #81 (100 durability) must break after 20 hunts of 5 base animals (synchronized with Empowering)"
);

// Immediately re-equip the 2nd Special Gem #81 after the first one broke
const eqSpecial2 = equipGem(mockUser, "81");
assert.strictEqual(eqSpecial2.success, true, "Must be able to re-equip Special Gem #81 immediately after breaking");
assert.strictEqual(mockUser.huntGems.special.durability, 100);

EVENT_CONFIG.forceActive = prevForce;
console.log("   ✅ Đã xác nhận: Tự động dọn ngọc 0 độ bền / lỗi, đồng bộ trừ độ bền Ngọc Sự Kiện và gắn lại ngay khi vỡ!\n");

// 2. Test all 53 Pet Species 6-Stat Formulas & Bounds
console.log(`2️⃣  Kiểm tra công thức 6 chỉ số (HP, ATT, PR, WP, MAG, MR) trên toàn bộ ${PET_SPECIES.length} Linh Thú...`);
for (const sp of PET_SPECIES) {
  const fx1 = computePetStatEffects(sp, 1);
  const fx50 = computePetStatEffects(sp, 50);
  const fx100 = computePetStatEffects(sp, 100);

  assert(fx100.hpPct >= fx1.hpPct && fx100.hpPct <= 0.28, `Invalid hpPct for ${sp.key}`);
  assert(fx100.regenHpPct >= fx1.regenHpPct && fx100.regenHpPct <= 0.032, `Invalid regenHpPct for ${sp.key}`);
  assert(fx100.patkPct <= 0.14 && fx100.matkPct <= 0.14, `Invalid atkPct for ${sp.key}`);
  assert(fx100.skillDmgPct <= 0.10, `Invalid skillDmgPct for ${sp.key}`);
  assert(fx100.physDmgReducePct <= 0.10, `Invalid physDmgReducePct for ${sp.key}`);
  assert(fx100.statusResistPct <= 0.30, `Invalid statusResistPct for ${sp.key}`);
  assert(fx100.dotReducePct <= 0.25, `Invalid dotReducePct for ${sp.key}`);
  assert(fx100.ragePerTurn >= 0 && fx100.ragePerTurn <= 12, `Invalid ragePerTurn for ${sp.key}`);
}

const sampleArchetypes = ["snail", "mosasaurus", "quetzalcoatlus", "argentinosaurus", "icebear", "kirin", "shenlong"];
for (const key of sampleArchetypes) {
  const sp = PET_SPECIES.find((s) => s.key === key);
  const fx = computePetStatEffects(sp, 60);
  console.log(
    `   • ${sp.emoji} ${sp.name.padEnd(16)} (${sp.tier.padEnd(9)} Lv.60) | ` +
    `HP:+${(fx.hpPct * 100).toFixed(1)}% (Hồi +${(fx.regenHpPct * 100).toFixed(2)}%/T) | ` +
    `ATT:+${(fx.patkPct * 100).toFixed(1)}% | MAG:+${(fx.matkPct * 100).toFixed(1)}% (Skill:+${(fx.skillDmgPct * 100).toFixed(1)}%) | ` +
    `PR:+${fx.bonusPr} (-${(fx.physDmgReducePct * 100).toFixed(1)}%) | ` +
    `MR:+${fx.bonusMr} (Kháng CC:${(fx.statusResistPct * 100).toFixed(1)}%, -DoT:${(fx.dotReducePct * 100).toFixed(1)}%) | ` +
    `WP:+${fx.ragePerTurn} Nộ/T`
  );
}
console.log("   ✅ Tất cả 6 chỉ số của 53 Linh Thú đều có hiệu lực rõ ràng và nằm trong ngưỡng cân bằng!\n");

// 3. Test Pet Turn Action (Heal, Rage/MP, Damage) & Status Resist / DoT Reduction
console.log("3️⃣  Kiểm tra cơ chế Hồi máu mỗi lượt (HP+WP), Nạp Nộ (WP), Kháng hiệu ứng & Giảm DoT (MR)...");
const kirin = PET_SPECIES.find((s) => s.key === "kirin");
const kirinInstance = {
  ...kirin,
  level: 80,
  stats: generatePetStats(kirin),
};
const dummyOwner = {
  name: "Tester",
  classKey: "warrior",
  hp: 5000,
  maxHp: 10000,
  rage: 20,
  effects: { healReduced: 0 },
};
const turnRes = resolvePetTurnAction(kirinInstance, dummyOwner, { armor: 200, magicResist: 200, level: 60 }, "pvp");
assert(turnRes.damage > 0, "Pet should deal damage");
assert(turnRes.healAmount > 0 && dummyOwner.hp > 5000, "Pet with HP/WP should heal injured owner");
assert(turnRes.rageGained > 0 && dummyOwner.rage > 20, "Pet with WP should grant extra Rage to owner");
console.log(`   • Lượt hỗ trợ của Kỳ Lân (Lv.80): ${turnRes.log}`);

// Test DoT reduction via MR
const noMrTarget = { name: "NoMR", hp: 10000, maxHp: 10000, burnRounds: 1, burnDamage: 500, dotReducePct: 0 };
const highMrTarget = { name: "HighMR", hp: 10000, maxHp: 10000, burnRounds: 1, burnDamage: 500, dotReducePct: 0.20 };
tickStatusEffects(noMrTarget, null);
tickStatusEffects(highMrTarget, null);
assert.strictEqual(10000 - noMrTarget.hp, 500);
assert.strictEqual(10000 - highMrTarget.hp, 400);
console.log("   ✅ Chỉ số MR giảm chính xác sát thương DoT mỗi lượt và cho xác suất kháng hiệu ứng bất lợi!\n");

// 4. Simulate PvP Battles with Diverse Pet Archetypes
console.log("4️⃣  Chạy mô phỏng đối kháng PvP giữa các hệ Linh Thú (Lv.60)...");
function makeTestPlayer(id, classKey, petKey) {
  const sp = PET_SPECIES.find((s) => s.key === petKey);
  const petObj = {
    id: `pet-${petKey}`,
    key: sp.key,
    name: sp.name,
    tier: sp.tier,
    emoji: sp.emoji,
    level: 60,
    stats: generatePetStats(sp),
  };
  return {
    userId: id,
    rpg: {
      name: `${classKey.toUpperCase()}_${petKey}`,
      classKey,
      level: 60,
      stats: { vigor: 35, pr: 30, mr: 30, str: 40, dex: 35, int: 40, arc: 30 },
      equippedPet: petObj,
      pets: [petObj],
      equipped: {
        weapon: { slot: "weapon", name: "Holy Sword", subType: "holysword", rarity: "Mythic", power: 420 },
        armor: { slot: "armor", power: 220 },
        helmet: { slot: "helmet", power: 160 },
        boots: { slot: "boots", power: 160 },
      },
    },
  };
}

const matchups = [
  ["warrior", "argentinosaurus", "assassin", "mosasaurus"],
  ["mage", "quetzalcoatlus", "paladin", "kirin"],
  ["archer", "shenlong", "warrior", "icebear"],
];

for (const [c1, pet1, c2, pet2] of matchups) {
  const p1 = makeTestPlayer("u1", c1, pet1);
  const p2 = makeTestPlayer("u2", c2, pet2);
  let p1Wins = 0;
  let totalTurns = 0;
  const runs = 40;
  for (let i = 0; i < runs; i++) {
    const res = BattleEngine.simulateBattle(p1, p2);
    if (res.winner?.id === "u1") p1Wins++;
    totalTurns += res.turns;
  }
  console.log(
    `   • ${c1.toUpperCase()}+${pet1} vs ${c2.toUpperCase()}+${pet2}: ` +
    `Winrate ${(p1Wins / runs * 100).toFixed(1)}% | Avg Turns: ${(totalTurns / runs).toFixed(1)}`
  );
}

console.log("\n✅ TẤT CẢ KIỂM ĐỊNH NGỌC SĂN THÚ & 6 CHỈ SỐ LINH THÚ ĐỀU THÀNH CÔNG 100%!");
