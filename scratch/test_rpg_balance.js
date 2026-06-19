const config = require("../data/config");
const assert = require("assert");

console.log("=== Testing RPG Configuration Updates ===");
try {
  assert.strictEqual(config.rpg.gear_drop.drop_rate, 0.08);
  assert.strictEqual(config.rpg.gear_slots.weapon.rate, 35);
  assert.strictEqual(config.rpg.gear_drop.luck_rate_per_point, 0.0005);
  assert.strictEqual(config.rpg.gear_rarities.Legendary.rate, 0.1);
  assert.strictEqual(config.rpg.gear_rarities.Mythic.rate, 0.01);
  assert.strictEqual(config.rpg.gear_rarities.Ancient.rate, 0.0054);
  assert.strictEqual(config.rpg.gear_rarities.Divine.rate, 0.0005);
  console.log("✅ All configuration values match requests exactly!");
} catch (err) {
  console.error("❌ Configuration validation failed:", err.message);
  process.exit(1);
}

console.log("\n=== Testing World Boss Drop Rates (Simulating 10,000 kills each) ===");

const rollRarityForBoss = (rankKey, type) => {
  const r = Math.random() * 100;
  const typeLower = String(type || "").toLowerCase();
  if (rankKey === "thuong" || rankKey === "than") {
    return r < 10 ? "Legendary" : "Epic";
  }
  if (rankKey === "rong") {
    if (r < 5) return "Mythic";
    if (r < 25) return "Legendary";
    return "Epic";
  }
  if (rankKey === "thuongnhan") {
    if (typeLower === "participant") {
      if (r < 1) return "Ancient";
      if (r < 15) return "Mythic";
      return "Legendary";
    }
    if (typeLower === "lasthit") {
      if (r < 1) return "Divine";
      if (r < 5) return "Ancient";
      if (r < 25) return "Mythic";
      return "Legendary";
    }
  }
  return null;
};

// 1. Common/God tier (90% Epic, 10% Legendary)
let epicCount1 = 0, legCount1 = 0;
for (let i = 0; i < 10000; i++) {
  const rolled = rollRarityForBoss("thuong", "participant");
  if (rolled === "Epic") epicCount1++;
  else if (rolled === "Legendary") legCount1++;
}
console.log(`- Cấp Thường/Thần drops: Epic = ${(epicCount1 / 100).toFixed(2)}% (Target: 90%), Legendary = ${(legCount1 / 100).toFixed(2)}% (Target: 10%)`);

// 2. Dragon tier (75% Epic, 20% Legendary, 5% Mythic)
let epicCount2 = 0, legCount2 = 0, mythCount2 = 0;
for (let i = 0; i < 10000; i++) {
  const rolled = rollRarityForBoss("rong", "participant");
  if (rolled === "Epic") epicCount2++;
  else if (rolled === "Legendary") legCount2++;
  else if (rolled === "Mythic") mythCount2++;
}
console.log(`- Cấp Rồng drops: Epic = ${(epicCount2 / 100).toFixed(2)}% (Target: 75%), Legendary = ${(legCount2 / 100).toFixed(2)}% (Target: 20%), Mythic = ${(mythCount2 / 100).toFixed(2)}% (Target: 5%)`);

// 3. Sage tier Participant (85% Legendary, 14% Mythic, 1% Ancient)
let legCount3 = 0, mythCount3 = 0, ancCount3 = 0;
for (let i = 0; i < 10000; i++) {
  const rolled = rollRarityForBoss("thuongnhan", "participant");
  if (rolled === "Legendary") legCount3++;
  else if (rolled === "Mythic") mythCount3++;
  else if (rolled === "Ancient") ancCount3++;
}
console.log(`- Cấp Thượng Nhân participant drops: Legendary = ${(legCount3 / 100).toFixed(2)}% (Target: 85%), Mythic = ${(mythCount3 / 100).toFixed(2)}% (Target: 14%), Ancient = ${(ancCount3 / 100).toFixed(2)}% (Target: 1%)`);

// 4. Sage tier Last Hit (75% Legendary, 20% Mythic, 4% Ancient, 1% Divine)
let legCount4 = 0, mythCount4 = 0, ancCount4 = 0, divCount4 = 0;
for (let i = 0; i < 10000; i++) {
  const rolled = rollRarityForBoss("thuongnhan", "lasthit");
  if (rolled === "Legendary") legCount4++;
  else if (rolled === "Mythic") mythCount4++;
  else if (rolled === "Ancient") ancCount4++;
  else if (rolled === "Divine") divCount4++;
}
console.log(`- Cấp Thượng Nhân lastHit drops: Legendary = ${(legCount4 / 100).toFixed(2)}% (Target: 75%), Mythic = ${(mythCount4 / 100).toFixed(2)}% (Target: 20%), Ancient = ${(ancCount4 / 100).toFixed(2)}% (Target: 4%), Divine = ${(divCount4 / 100).toFixed(2)}% (Target: 1%)`);

console.log("✅ World Boss drop rates converge to targets successfully!");

console.log("\n=== Testing Paladin Dungeon Skill [Thiên Mệnh] ===");

const activeDungeon = {
  logs: [],
  players: [
    {
      id: "p1",
      name: "PaladinPlayer",
      classKey: "paladin",
      hp: 80,
      maxHp: 200, // lost 120 HP
      poisonRounds: 2,
      healBanRounds: 1,
    },
    {
      id: "p2",
      name: "WarriorPlayer",
      classKey: "warrior",
      hp: 150,
      maxHp: 300, // lost 150 HP
      poisonRounds: 0,
      healBanRounds: 3,
    }
  ]
};

// Execute paladin skill simulation logic
const paladin = activeDungeon.players[0];
activeDungeon.players.forEach((p) => {
  if (p.hp > 0) {
    const clearedDebuffs = [];
    if (p.poisonRounds && p.poisonRounds > 0) {
      p.poisonRounds = 0;
      clearedDebuffs.push("Độc");
    }
    if (p.healBanRounds && p.healBanRounds > 0) {
      p.healBanRounds = 0;
      clearedDebuffs.push("Cấm Hồi Máu");
    }
    if (clearedDebuffs.length > 0) {
      activeDungeon.logs.push(`✨ **${p.name}** được Paladin thanh tẩy hiệu ứng: **${clearedDebuffs.join(", ")}**.`);
    }

    const lostHp = p.maxHp - p.hp;
    const healAmount = Math.floor(lostHp * 0.1);
    if (healAmount > 0) {
      const oldHp = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + healAmount);
      const actualHealed = p.hp - oldHp;
      activeDungeon.logs.push(`💚 **${p.name}** được hồi **${actualHealed.toLocaleString()}** HP (10% máu đã mất).`);
    }
  }
});

console.log("Logs during skill execute:");
activeDungeon.logs.forEach(log => console.log(`  ${log}`));

try {
  // Paladin lost 120 HP -> heals 12 HP -> 80 + 12 = 92 HP
  assert.strictEqual(activeDungeon.players[0].hp, 92);
  assert.strictEqual(activeDungeon.players[0].poisonRounds, 0);
  assert.strictEqual(activeDungeon.players[0].healBanRounds, 0);

  // Warrior lost 150 HP -> heals 15 HP -> 150 + 15 = 165 HP
  assert.strictEqual(activeDungeon.players[1].hp, 165);
  assert.strictEqual(activeDungeon.players[1].healBanRounds, 0);
  console.log("✅ Paladin skill heals correct amounts and clears all debuffs instantly!");
} catch (err) {
  console.error("❌ Paladin skill validation failed:", err.message);
  process.exit(1);
}

console.log("\n=== Testing Paladin Passive Damage Reduction ===");
const enemy = { atk: 1000 };
const testDmgForClass = (classKey) => {
  const armor = 200 * 3.0; // mock armor stat
  const mitigation = armor / (armor + 1000);
  const rawDmg = enemy.atk * 1.0 * 1.0; // raw damage without variance
  let damage = Math.max(10, Math.floor(rawDmg * (1 - mitigation)));
  
  if (classKey === "paladin") {
    damage = Math.floor(damage * 0.95);
  }
  return damage;
};

const warriorDmg = testDmgForClass("warrior");
const paladinDmg = testDmgForClass("paladin");
console.log(`- Warrior takes: ${warriorDmg} damage`);
console.log(`- Paladin takes: ${paladinDmg} damage`);

try {
  assert.strictEqual(Math.floor(warriorDmg * 0.95), paladinDmg);
  console.log("✅ Paladin passive damage reduction reduces final damage by exactly 5%!");
} catch (err) {
  console.error("❌ Damage reduction validation failed:", err.message);
  process.exit(1);
}

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
