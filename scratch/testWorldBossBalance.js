const assert = require("assert");
const {
  getWorldBossDamageCaps,
  applyWorldBossDamageLimit,
  getWorldBossCombatProfile,
  getWorldBossShieldhexConfig,
} = require("../utils/worldBossBalanceUtil");

const malzarethCaps = getWorldBossDamageCaps(125000);
assert.deepStrictEqual(malzarethCaps, {
  maxHp: 125000,
  softCap: 3125,
  hardCap: 5625,
  actionHardCap: 6875,
});

assert.strictEqual(applyWorldBossDamageLimit(4000, 125000).appliedDamage, 3230);
assert.strictEqual(applyWorldBossDamageLimit(6000, 125000).appliedDamage, 3470);
assert.strictEqual(applyWorldBossDamageLimit(243533, 125000).appliedDamage, 5625);
assert.strictEqual(applyWorldBossDamageLimit(243533, 125000).wasCapped, true);
assert.strictEqual(
  applyWorldBossDamageLimit(243533, 125000, { ignoreLimit: true }).appliedDamage,
  243533,
);

let remainingHp = 125000;
for (let attack = 0; attack < 3; attack += 1) {
  const direct = applyWorldBossDamageLimit(243533, 125000).appliedDamage;
  const pet = Math.min(2500, malzarethCaps.actionHardCap - direct);
  remainingHp -= direct + pet;
}
assert.strictEqual(remainingHp, 104375);

const scaledMalzareth = getWorldBossCombatProfile({
  key: "boss_XI",
  rank: "thuongnhan",
  hp: 125000,
  armor: 3900,
  magicResist: 3900,
  attackPower: 3200,
});
assert.strictEqual(scaledMalzareth.hp, 250000);
assert.strictEqual(scaledMalzareth.armor, 5070);
assert.strictEqual(scaledMalzareth.magicResist, 5070);
assert.strictEqual(scaledMalzareth.attackPower, 4800);
assert.strictEqual(getWorldBossCombatProfile(scaledMalzareth), scaledMalzareth);

const shieldhex = getWorldBossShieldhexConfig();
assert.strictEqual(shieldhex.absorbPct, 0.15);
assert.strictEqual(shieldhex.reflectPct, 0.75);

console.log("World Boss balance guardrail tests passed.");
