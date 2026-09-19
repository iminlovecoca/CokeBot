const config = require("../data/config");

const getWorldBossBalance = () => config.rpg?.balance?.world_boss || {};
const getWorldBossBalanceVersion = () => Number(getWorldBossBalance().combat_profile_version) || 1;

const isWorldBossEvent = (boss) => boss?.key === "hexia" || boss?.key === "godhexa";

const getWorldBossCombatProfile = (boss) => {
  if (!boss || typeof boss !== "object") return boss;
  if (Number(boss.worldBossBalanceVersion) === getWorldBossBalanceVersion()) return boss;
  const balance = getWorldBossBalance();
  const eventBoss = isWorldBossEvent(boss);
  const rank = boss.rank || "than";
  const hpMultiplier = eventBoss
    ? Number(balance.event_hp_multiplier) || 1.5
    : Number(balance.hp_multiplier_by_rank?.[rank]) || 1;
  const attackMultiplier = eventBoss
    ? Number(balance.event_attack_multiplier) || 1.35
    : Number(balance.attack_multiplier_by_rank?.[rank]) || 1;
  const defenseMultiplier = eventBoss
    ? Number(balance.event_defense_multiplier) || 1.15
    : Number(balance.defense_multiplier) || 1;
  const minAttack = eventBoss
    ? 0
    : Number(balance.min_attack_power_by_rank?.[rank]) || 0;
  return {
    ...boss,
    hp: Math.max(1, Math.floor((Number(boss.hp) || 1) * hpMultiplier)),
    recommended_power: Math.max(
      1,
      Math.floor((Number(boss.recommended_power) || 1) * hpMultiplier),
    ),
    armor: Math.max(0, Math.floor((Number(boss.armor) || 0) * defenseMultiplier)),
    magicResist: Math.max(0, Math.floor((Number(boss.magicResist) || 0) * defenseMultiplier)),
    attackPower: Math.max(
      minAttack,
      Math.floor((Number(boss.attackPower) || 0) * attackMultiplier),
    ),
    worldBossBalanceVersion: getWorldBossBalanceVersion(),
  };
};

const getBossMaxHp = (bossMaxHp) => Math.max(1, Math.floor(Number(bossMaxHp) || 0));

const getWorldBossDamageCaps = (bossMaxHp) => {
  const maxHp = getBossMaxHp(bossMaxHp);
  const balance = getWorldBossBalance();
  const softCap = Math.max(1, Math.floor(maxHp * (Number(balance.damage_soft_cap_pct) || 0.025)));
  const hardCap = Math.max(softCap, Math.floor(maxHp * (Number(balance.damage_hard_cap_pct) || 0.045)));
  const actionHardCap = Math.max(
    hardCap,
    Math.floor(maxHp * (Number(balance.action_hard_cap_pct) || 0.055)),
  );
  return { maxHp, softCap, hardCap, actionHardCap };
};

const applyWorldBossDamageLimit = (damage, bossMaxHp, options = {}) => {
  const requestedDamage = Math.max(0, Math.floor(Number(damage) || 0));
  if (options.ignoreLimit) {
    return {
      requestedDamage,
      appliedDamage: requestedDamage,
      wasCapped: false,
      ...getWorldBossDamageCaps(bossMaxHp),
    };
  }

  const caps = getWorldBossDamageCaps(bossMaxHp);
  const overflowEfficiency = Math.min(
    1,
    Math.max(0, Number(getWorldBossBalance().overflow_efficiency) || 0.12),
  );
  const appliedDamage = requestedDamage <= caps.softCap
    ? requestedDamage
    : Math.min(
      caps.hardCap,
      caps.softCap + Math.floor((requestedDamage - caps.softCap) * overflowEfficiency),
    );

  return {
    requestedDamage,
    appliedDamage,
    wasCapped: appliedDamage < requestedDamage,
    ...caps,
  };
};

const getWorldBossShieldhexConfig = () => {
  const balance = getWorldBossBalance();
  return {
    absorbPct: Math.min(0.95, Math.max(0, Number(balance.shieldhex_absorb_pct) || 0.15)),
    reflectPct: Math.min(1, Math.max(0, Number(balance.shieldhex_reflect_pct) || 0.75)),
  };
};

module.exports = {
  getWorldBossCombatProfile,
  getWorldBossBalanceVersion,
  getWorldBossDamageCaps,
  applyWorldBossDamageLimit,
  getWorldBossShieldhexConfig,
};
