const assert = require("assert");
const config = require("../data/config");
const classes = require("../data/rpg/classes");
const { WEAPON_PASSIVES } = require("../data/rpg/weaponPassives");
const { resolveWeaponPassive, tickStatusEffects } = require("../utils/rpgPassiveUtil");
const { dungeonWeapons } = require("../utils/rpgUtil");
const gachaBanner = require("../data/gachaBanner");
const {
  RARITIES,
  buildSimulatedDungeonPlayer,
  getAssassinSkillBleedDamage,
  getDungeonBossScalers,
  getDungeonTimeLimitMs,
  getSlothShieldBreakProgress,
} = require("../utils/dungeonBalanceUtil");

const CLASS_KEYS = Object.keys(classes);
const WEAPON_KEYS = Object.keys(WEAPON_PASSIVES);
const LEVELS = [1, 20, 40, 60, 80, 100, 120];
const UPGRADES = Array.from({ length: 11 }, (_, index) => index);
const CHAPTER_LEVELS = [35, 40, 45, 50, 60, 70, 75, 80, 85, 90, 95, 100, 110, 120];
const CHAPTER_RARITIES = ["Legendary", "Ancient", "Ancient", "Ancient", "Ancient", "Ancient", "Ancient", "Ancient", "Ancient", "Ancient", "Ancient", "Ancient", "Divine", "Divine"];
const CHAPTER_UPGRADES = [2, 1, 2, 3, 4, 5, 6, 7, 7, 8, 8, 9, 9, 10];
const NORMAL_WEAPONS = ["longsword", "dagger", "staff", "warhammer"];
const EVENT_WEAPONS = ["duskanddawn", "riverofblood", "axesnake", "sunbow", "clawhex", "spearhex", "shieldhex", "lunashard", "eclipsesoul", "demonbook", "thorshammer", "odinhammer"];
const GACHA_WEAPONS = gachaBanner.weapons.map((weapon) => weapon.weaponKey);
const DUNGEON_WEAPONS = dungeonWeapons
  .map((weapon) => weapon.key)
  .filter((weapon) => !EVENT_WEAPONS.includes(weapon) && !GACHA_WEAPONS.includes(weapon));
const ALL_WEAPONS = [...NORMAL_WEAPONS, ...DUNGEON_WEAPONS, ...EVENT_WEAPONS, ...GACHA_WEAPONS];
const WEAPON_CATEGORIES = {
  normal: NORMAL_WEAPONS,
  dungeon: DUNGEON_WEAPONS,
  event: EVENT_WEAPONS,
  gacha: GACHA_WEAPONS,
};
const CATEGORY_LOADOUTS = {
  normal: { warrior: "longsword", mage: "staff", assassin: "dagger", paladin: "warhammer", archer: "dagger", wretch: "longsword" },
  dungeon: { warrior: "firesword", mage: "greenstaff", assassin: "shadowdagger", paladin: "holysword", archer: "gravitybow", wretch: "bluestaff" },
  event: { warrior: "thorshammer", mage: "demonbook", assassin: "riverofblood", paladin: "shieldhex", archer: "sunbow", wretch: "duskanddawn" },
  gacha: { warrior: "bladesorrow", mage: "frostgauntlet", assassin: "bladesorrow", paladin: "frostgauntlet", archer: "bladesorrow", wretch: "frostgauntlet" },
};
const TEAM_ARCHETYPES = {
  balanced: [["warrior", "bladesorrow"], ["paladin", "shieldhex"], ["mage", "demonbook"]],
  burst: [["archer", "sunbow"], ["mage", "eclipsesoul"], ["warrior", "thorshammer"]],
  sustain: [["paladin", "greenstaff"], ["warrior", "shieldhex"], ["mage", "darkstaff"]],
  control: [["mage", "frostgauntlet"], ["warrior", "thorshammer"], ["paladin", "demonbook"]],
  bleed: [["assassin", "bladesorrow"], ["archer", "riverofblood"], ["warrior", "axesnake"]],
};

const CLASS_COMPOSITIONS = [];
for (let first = 0; first < CLASS_KEYS.length; first += 1) {
  for (let second = first; second < CLASS_KEYS.length; second += 1) {
    for (let third = second; third < CLASS_KEYS.length; third += 1) {
      CLASS_COMPOSITIONS.push([CLASS_KEYS[first], CLASS_KEYS[second], CLASS_KEYS[third]]);
    }
  }
}

const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const makeTeam = (chapter, archetype, curve = "on") => {
  const chapterIndex = chapter - 1;
  const levelDelta = curve === "under" ? -10 : curve === "over" ? 10 : 0;
  const upgradeDelta = curve === "under" ? -2 : curve === "over" ? 1 : 0;
  let rarityIndex = RARITIES.indexOf(CHAPTER_RARITIES[chapterIndex]);
  if (curve === "under") rarityIndex = Math.max(0, rarityIndex - 1);
  if (curve === "over") rarityIndex = Math.min(RARITIES.length - 1, rarityIndex + 1);
  return TEAM_ARCHETYPES[archetype].map(([classKey, weaponName], index) => {
    const player = buildSimulatedDungeonPlayer({
      classKey,
      level: CHAPTER_LEVELS[chapterIndex] + levelDelta,
      weaponName,
      weaponRank: RARITIES[rarityIndex],
      enhance: CHAPTER_UPGRADES[chapterIndex] + upgradeDelta,
      index,
    });
    player.maxHp = Math.floor(player.maxHp * 1.1);
    player.hp = player.maxHp;
    return player;
  });
};

const makeCompositionTeam = (chapter, composition, category, curve = "on", forcedWeapon = null, forcedUpgrade = null) => {
  const chapterIndex = chapter - 1;
  const levelDelta = curve === "under" ? -10 : curve === "over" ? 10 : 0;
  const upgradeDelta = curve === "under" ? -2 : curve === "over" ? 1 : 0;
  let rarityIndex = RARITIES.indexOf(CHAPTER_RARITIES[chapterIndex]);
  if (curve === "under") rarityIndex = Math.max(0, rarityIndex - 1);
  if (curve === "over") rarityIndex = Math.min(RARITIES.length - 1, rarityIndex + 1);
  return composition.map((classKey, index) => buildSimulatedDungeonPlayer({
    classKey,
    level: Math.max(1, CHAPTER_LEVELS[chapterIndex] + levelDelta),
    weaponName: forcedWeapon || CATEGORY_LOADOUTS[category][classKey],
    weaponRank: CHAPTER_RARITIES[chapterIndex] === "Divine" && category === "normal"
      ? "Ancient"
      : RARITIES[rarityIndex],
    enhance: forcedUpgrade === null
      ? Math.max(0, Math.min(10, CHAPTER_UPGRADES[chapterIndex] + upgradeDelta))
      : forcedUpgrade,
    index,
  }));
};

const createBoss = (chapter, players, phase = 1) => {
  const bossCfg = config.dungeon.chapters[chapter]?.boss || config.dungeon.default_boss;
  const phaseCfg = phase === 2 ? bossCfg.stats.phase2 : bossCfg.stats.phase1;
  const averageLevel = players.reduce((sum, player) => sum + player.level, 0) / players.length;
  const averagePower = players.reduce((sum, player) => sum + player.power, 0) / players.length;
  const bossScalers = getDungeonBossScalers(averageLevel, averagePower);
  const leaderScaler = bossScalers.durability;
  const chapterScaler = 1 + (chapter - 1) * 0.20;
  const phase1Attack = Math.floor(bossCfg.stats.phase1.base_atk * chapterScaler * bossScalers.offense);
  const maxHp = Math.floor(phaseCfg.base_hp * leaderScaler);
  return {
    name: bossCfg.name_phase1,
    key: bossCfg.key,
    phase,
    isBoss: true,
    maxHp,
    hp: maxHp,
    atk: phase === 2 ? Math.floor(phase1Attack * phaseCfg.base_atk_mult) : phase1Attack,
    armor: Math.floor(phaseCfg.base_defense * leaderScaler),
    magicResist: Math.floor(phaseCfg.base_defense * leaderScaler),
    poiseMax: 80 + chapter * 20,
    poise: 80 + chapter * 20,
    poiseBroken: false,
    aoeDamageMultiplier: bossCfg.mechanics?.aoe_damage_multiplier
      ?? config.dungeon.boss_phase2_aoe_damage_multiplier,
  };
};

const attack = (player, boss, state, multiplier = 1, isSkill = false) => {
  if (!isSkill && (state.chapter === 4 || state.chapter === 6)) {
    const ranged = player.classKey === "archer" || player.classKey === "mage";
    if (Math.random() < (ranged ? 0.35 : 0.20)) return 0;
  }
  let isMagical = player.classKey === "mage";
  if (player.weapon.subType === "duskanddawn") {
    player.duskDawnNext = player.duskDawnNext || "magical";
    isMagical = player.duskDawnNext === "magical";
    player.duskDawnNext = isMagical ? "physical" : "magical";
  }
  const baseAttack = isMagical
    ? player.stats.int * 3.5 + player.stats.arc * 1.5
    : player.stats.str * 2.5 + player.stats.dex * 1.5;
  let rawDamage = (baseAttack + player.power) * multiplier * config.dungeon.player_buff.damage_multiplier * 1.2;
  if (NORMAL_WEAPONS.includes(player.weapon.subType)) {
    rawDamage *= Number(config.dungeon.player_buff.normal_weapon_damage_multiplier) || 1;
  }
  if (player.atkDown) {
    rawDamage *= 0.5;
    player.atkDown = false;
  }
  const passive = resolveWeaponPassive(player, boss, { mode: "dungeon", rawDamage, isMagical, isSkill });
  if (passive.healAmount) player.hp = Math.min(player.maxHp, player.hp + passive.healAmount);
  let damageBeforeDefense = passive.damage * (0.85 + Math.random() * 0.3);
  const critRate = Math.min(0.85,
    (player.stats.arc * 0.2 + player.stats.dex * 0.1) / 100
      + (player.rpgClass.bonuses.critRate || 0)
      + (player.setBonus?.bonus?.critRate || 0)
      + config.dungeon.player_buff.crit_rate_bonus);
  if (Math.random() < critRate) damageBeforeDefense *= 1.5 + player.stats.dex * 0.002;
  const mitigation = passive.mrOrArmor / (passive.mrOrArmor + 150 + player.level * 2);
  let damage = Math.max(10, Math.floor(damageBeforeDefense * (1 - mitigation)));
  damage = Math.floor(damage * (1 + (player.rpgClass.bonuses.bossDamage || 0) + (player.setBonus?.bonus?.bossDamage || 0)));
  if (state.archerDouble && player.id !== state.archerCaster) {
    damage *= 2;
    state.archerDouble = false;
  }
  if (boss.poiseBroken) damage *= 2;
  if (state.chapter === 1 && state.team.some((member) => member.hp > 0 && member.healBanRounds > 0)) damage *= 2;
  if (state.diceMultiplier) damage = Math.floor(damage * state.diceMultiplier);
  const frozenPlayer = state.team.find((member) => member.hp > 0 && member.goldStatueFreeze > 0);
  if (frozenPlayer) {
    frozenPlayer.goldStatueHits = (frozenPlayer.goldStatueHits || 0) + 1;
    if (frozenPlayer.goldStatueHits >= 3) {
      frozenPlayer.goldStatueFreeze = 0;
      frozenPlayer.goldStatueHits = 0;
    }
  }
  const hpRatio = boss.hp / boss.maxHp;
  const activeSin = boss.key === "pandemonium"
    ? (hpRatio > 0.85 ? "pride" : hpRatio > 0.70 ? "greed" : hpRatio > 0.55 ? "lust" : hpRatio > 0.40 ? "envy" : hpRatio > 0.25 ? "gluttony" : hpRatio > 0.10 ? "wrath" : hpRatio > 0.05 ? "sloth" : "trueform")
    : boss.key;
  if (activeSin === "lucifer" || activeSin === "pride") {
    if (isSkill) {
      player.hp = Math.max(0, player.hp - damage);
      player.atkDown = true;
      damage = 0;
    } else {
      state.prideHitCounter = (state.prideHitCounter || 0) + 1;
      if (state.prideHitCounter >= 3) {
        state.prideHitCounter = 0;
        state.prideCounter = (state.prideCounter || 0) + 1;
      }
    }
  }
  if ((activeSin === "belphegor" || activeSin === "sloth") && !boss.slothfulShieldBroken) {
    boss.slothShieldProgress = (boss.slothShieldProgress || 0) + getSlothShieldBreakProgress({
      classKey: player.classKey,
      weaponSubType: player.weapon.subType,
      isSkill,
      bossIsBurning: boss.burnRounds > 0,
    });
    if (boss.slothShieldProgress >= 6) boss.slothfulShieldBroken = true;
    else damage = 0;
  }
  boss.hp = Math.max(0, boss.hp - damage);
  if ((activeSin === "beelzebub" || activeSin === "gluttony") && state.swallowedPlayerId && boss.burnRounds > 0) {
    const swallowed = state.team.find((member) => member.id === state.swallowedPlayerId);
    if (swallowed) swallowed.isSwallowed = false;
    state.swallowedPlayerId = null;
  }
  if (!boss.poiseBroken) {
    let poiseDamage = Math.max(6, Math.floor(damage * 0.00032));
    if ((activeSin === "lucifer" || activeSin === "pride") && !isSkill) poiseDamage = Math.max(12, poiseDamage);
    if (player.classKey === "warrior" && isSkill) poiseDamage = Math.max(12, Math.floor(poiseDamage * 1.5));
    boss.poise = Math.max(0, boss.poise - poiseDamage);
    if (boss.poise === 0) boss.poiseBroken = true;
  }
  if (player.classKey !== "mage") player.rage = Math.min(100, player.rage + 10);
  return damage;
};

const playerTurn = (player, boss, team, state, tactical) => {
  if (player.hp <= 0) return;
  if (player.isSwallowed || player.goldStatueFreeze > 0) return;
  const status = tickStatusEffects(player);
  if (player.hp <= 0 || status.skipTurn) return;
  if (player.healBanRounds > 0) player.healBanRounds -= 1;
  if (player.skillBanRounds > 0) player.skillBanRounds -= 1;
  const readyPaladin = tactical && team.some((member) => member.hp > 0 && member.classKey === "paladin" && member.rage >= 50 && !member.skillBanRounds);
  if (player.hp / player.maxHp < (tactical ? 0.35 : 0.30) && player.potions > 0 && !player.healBanRounds && !readyPaladin) {
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * config.dungeon.potion_heal_pct));
    player.potions -= 1;
    return;
  }
  const alive = team.filter((member) => member.hp > 0);
  const averageHp = alive.reduce((sum, member) => sum + member.hp / member.maxHp, 0) / alive.length;
  if (player.classKey === "paladin" && player.rage >= 50 && !player.skillBanRounds && (!tactical || averageHp < 0.82)) {
    alive.forEach((member) => { member.hp = Math.min(member.maxHp, member.hp + Math.floor(member.maxHp * 0.25)); });
    player.rage = Math.max(0, player.rage - 50) + 10;
    return;
  }
  let useSkill = false;
  if (player.skillBanRounds) {
    useSkill = false;
  } else if (player.classKey === "mage") {
    const tacticalManaWindow = state.phase === 1
      ? player.mana > 50 || boss.poiseBroken
      : player.mana >= 25;
    useSkill = player.mana >= 25 && (!tactical || tacticalManaWindow);
  } else {
    const saveForNextPhase = tactical && state.phase === 1 && boss.hp / boss.maxHp < 0.15;
    useSkill = player.rage >= 100 && !saveForNextPhase;
  }
  const hpRatio = boss.hp / boss.maxHp;
  const prideActive = boss.key === "lucifer" || (boss.key === "pandemonium" && hpRatio > 0.85);
  if (tactical && prideActive) useSkill = false;
  if (!useSkill) return attack(player, boss, state);
  if (player.classKey === "warrior") {
    player.rage = 0;
    return attack(player, boss, state, 4, true);
  }
  if (player.classKey === "assassin") {
    boss.bleedRounds = Math.max(boss.bleedRounds || 0, 3);
    boss.bleedDamage = Math.max(boss.bleedDamage || 0, getAssassinSkillBleedDamage(player, boss.maxHp));
    player.rage = 0;
    return attack(player, boss, state, 2, true);
  }
  if (player.classKey === "archer") {
    state.archerDouble = true;
    state.archerCaster = player.id;
    player.rage = 0;
    return attack(player, boss, state, 3, true);
  }
  if (player.classKey === "mage") {
    player.mana -= 25;
    return attack(player, boss, state, 3, true);
  }
  const fateRoll = Math.random();
  const fateMultiplier = fateRoll < 0.25 ? 2.2 : fateRoll < 0.60 ? 1.6 : fateRoll < 0.85 ? 1.15 : 1.0;
  player.rage = 0;
  return attack(player, boss, state, fateMultiplier, true);
};

const bossTurn = (chapter, boss, team, phase2Madness, state) => {
  const status = tickStatusEffects(boss);
  if (boss.hp <= 0) return { skipped: true, phase2Madness };
  if (status.skipTurn || boss.poiseBroken) {
    if (boss.poiseBroken) {
      state.prideCounter = Math.max(0, (state.prideCounter || 0) - 5);
      const swallowed = team.find((player) => player.isSwallowed);
      if (swallowed) swallowed.isSwallowed = false;
      state.swallowedPlayerId = null;
      state.wrathStacks = Math.floor((state.wrathStacks || 0) / 2);
    }
    boss.poiseBroken = false;
    boss.poise = boss.poiseMax;
    return { skipped: true, phase2Madness };
  }
  const alive = team.filter((player) => player.hp > 0);
  if (!alive.length) return { skipped: true, phase2Madness };
  const hpRatio = boss.hp / boss.maxHp;
  const activeSin = boss.key === "pandemonium"
    ? (hpRatio > 0.85 ? "pride" : hpRatio > 0.70 ? "greed" : hpRatio > 0.55 ? "lust" : hpRatio > 0.40 ? "envy" : hpRatio > 0.25 ? "gluttony" : hpRatio > 0.10 ? "wrath" : hpRatio > 0.05 ? "sloth" : "trueform")
    : boss.key;
  let customFollowupMultiplier = 1;
  if ((activeSin === "lucifer" || activeSin === "pride") && (state.prideCounter || 0) >= 10) {
    alive.forEach((player) => { player.hp = 0; });
    state.prideCounter = 0;
    return { skipped: false, phase2Madness };
  }
  if ((activeSin === "mammon" || activeSin === "greed") && Math.random() < 0.40) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    target.goldStatueFreeze = 3;
    target.goldStatueHits = 0;
    customFollowupMultiplier = 0.60;
  }
  if ((activeSin === "asmodeus" || activeSin === "lust") && Math.random() < 0.40 && alive.length >= 2) {
    const targets = [...alive].sort((a, b) => b.power - a.power).slice(0, 2);
    targets[0].chainedTo = targets[1].id;
    targets[1].chainedTo = targets[0].id;
    targets[0].chainRounds = 3;
    targets[1].chainRounds = 3;
    customFollowupMultiplier = 0.60;
  }
  if ((activeSin === "beelzebub" || activeSin === "gluttony") && Math.random() < 0.40 && !state.swallowedPlayerId) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    target.isSwallowed = true;
    state.swallowedPlayerId = target.id;
    customFollowupMultiplier = 0.60;
  }
  if ((activeSin === "belphegor" || activeSin === "sloth") && Math.random() < 0.40) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    target.stunRounds = Math.max(target.stunRounds || 0, 2);
    customFollowupMultiplier = 0.60;
  }
  if (activeSin === "trueform") {
    const configuredCountdown = config.dungeon.chapters[chapter]?.boss?.mechanics?.wipe_countdown || 5;
    state.wipeCountdown = state.wipeCountdown === undefined ? configuredCountdown : state.wipeCountdown - 1;
    if (state.wipeCountdown <= 0) alive.forEach((player) => { player.hp = 0; });
  }
  const swallowed = team.find((player) => player.hp > 0 && player.isSwallowed);
  if (swallowed) {
    swallowed.hp = Math.max(0, swallowed.hp - 600);
    if (swallowed.hp <= 0) {
      swallowed.isSwallowed = false;
      state.swallowedPlayerId = null;
    }
  }
  if (chapter === 2 && Math.random() < 0.35) {
    alive.forEach((player) => {
      player.poisonRounds = Math.min(4, (player.poisonRounds || 0) + 3);
      player.poisonDamage = Math.max(1, Math.floor(player.maxHp * 0.03));
    });
  }
  if (chapter === 3 && Math.random() < 0.35) {
    [...alive].sort(() => Math.random() - 0.5).slice(0, 2).forEach((player) => {
      player.skillBanRounds = (player.skillBanRounds || 0) + 1;
    });
  }
  if (chapter === 1 && boss.phase === 2 && Math.random() < 0.40) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    target.healBanRounds = (target.healBanRounds || 0) + 2;
  }
  if (chapter === 3 && boss.hp < boss.maxHp * 0.40 && Math.random() < 0.60) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    target.hp = Math.max(1, target.hp - Math.min(Math.floor(target.maxHp * 0.30), Math.floor(target.hp * 0.5)));
    return { skipped: false, phase2Madness };
  }
  if (chapter === 6 && Math.random() < 0.30) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    target.hp = Math.max(1, target.hp - Math.min(Math.floor(target.maxHp * 0.35), Math.floor(target.hp * 0.55)));
    return { skipped: false, phase2Madness };
  }
  if (boss.phase === 2) boss.phase2TurnCount = (boss.phase2TurnCount || 0) + 1;
  const aoeInterval = Math.max(1, config.dungeon.boss_phase2_aoe_interval || 2);
  const isAoeTurn = boss.phase === 2 && boss.phase2TurnCount % aoeInterval === 0;
  const targets = isAoeTurn
    ? alive
    : [(activeSin === "leviathan" || activeSin === "envy")
      ? [...alive].sort((a, b) => b.power - a.power)[0]
      : alive[Math.floor(Math.random() * alive.length)]];
  for (const player of targets) {
    const armor = player.stats.pr * 12;
    const mitigation = armor / (armor + 1000);
    const phaseMultiplier = isAoeTurn
      ? phase2Madness * boss.aoeDamageMultiplier
      : (boss.phase === 2 ? config.dungeon.boss_phase2_single_target_damage_multiplier : 1);
    const envyMultiplier = activeSin === "leviathan" || activeSin === "envy"
      ? 1 + Math.min(0.20, player.power / 100000)
      : 1;
    if (activeSin === "satan" || activeSin === "wrath") state.wrathStacks = Math.min(5, (state.wrathStacks || 0) + 1);
    const wrathMultiplier = 1 + (state.wrathStacks || 0) * 0.08;
    let damage = Math.max(10, Math.floor(boss.atk * phaseMultiplier * customFollowupMultiplier * envyMultiplier * wrathMultiplier * (0.85 + Math.random() * 0.3) * (1 - mitigation)));
    if (config.dungeon.ranged_class_mitigation.classes.includes(player.classKey)) damage = Math.floor(damage * config.dungeon.ranged_class_mitigation.multiplier);
    if (player.classKey === "paladin") damage = Math.floor(damage * 0.95);
    if (player.weapon.subType === "shieldhex") damage = Math.floor(damage * 0.80);
    player.hp = Math.max(0, player.hp - damage);
    if (player.chainedTo && player.chainRounds > 0) {
      const linked = team.find((member) => member.id === player.chainedTo && member.hp > 0);
      if (linked) linked.hp = Math.max(0, linked.hp - Math.max(1, Math.floor(damage * 0.35)));
      player.chainRounds -= 1;
      if (player.chainRounds <= 0) {
        if (linked) {
          delete linked.chainedTo;
          delete linked.chainRounds;
        }
        delete player.chainedTo;
        delete player.chainRounds;
      }
    }
    if (player.hp > 0 && player.classKey !== "mage") player.rage = Math.min(100, player.rage + 10);
  }
  return { skipped: false, phase2Madness: isAoeTurn ? Math.min(1.30, phase2Madness + (boss.key && boss.key !== "tf" ? 0.03 : 0.04)) : phase2Madness };
};

const fightPhase = (chapter, team, phase, tactical) => {
  const boss = createBoss(chapter, team, phase);
  const bossCfg = config.dungeon.chapters[chapter]?.boss || config.dungeon.default_boss;
  const diceRoll = bossCfg.mechanics?.dice_roll && phase === 1 ? Math.floor(Math.random() * 6) + 1 : 0;
  const state = {
    chapter,
    phase,
    team,
    archerDouble: false,
    archerCaster: null,
    diceMultiplier: diceRoll ? (diceRoll % 2 ? 0.85 : (diceRoll === 4 ? 1.25 : (diceRoll === 6 ? 1.40 : 1.10))) : null,
  };
  let phase2Madness = 1;
  const maxRounds = phase === 2 ? 42 : (chapter >= 7 ? 70 : 50);
  for (let round = 1; round <= maxRounds; round += 1) {
    team.sort((a, b) => b.stats.dex - a.stats.dex);
    for (const player of team) {
      playerTurn(player, boss, team, state, tactical);
      if (boss.hp <= 0) return { won: true, rounds: round };
    }
    const result = bossTurn(chapter, boss, team, phase2Madness, state);
    phase2Madness = result.phase2Madness;
    if (team.every((player) => player.hp <= 0)) return { won: false, rounds: round };
  }
  return { won: false, rounds: maxRounds, timeout: true };
};

const simulate = (chapter, archetype, curve, tactical, iterations = 80) => {
  let wins = 0;
  let timeouts = 0;
  let rounds = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const originalRandom = Math.random;
    Math.random = seededRandom(chapter * 100000 + iteration * 97 + archetype.length * 13 + (tactical ? 1 : 0));
    try {
      const team = makeTeam(chapter, archetype, curve);
      const phase1 = fightPhase(chapter, team, 1, tactical);
      let result = phase1;
      const hasPhase2 = chapter <= 6 && chapter !== 3;
      if (phase1.won && hasPhase2) result = fightPhase(chapter, team, 2, tactical);
      if (result.won) wins += 1;
      if (result.timeout) timeouts += 1;
      rounds += phase1.rounds + (hasPhase2 && phase1.won ? result.rounds : 0);
    } finally {
      Math.random = originalRandom;
    }
  }
  return { winRate: wins / iterations, timeoutRate: timeouts / iterations, averageRounds: rounds / iterations };
};

const simulateTeam = ({ chapter, teamFactory, curve = "on", tactical = true, iterations = 12, seedSalt = 0 }) => {
  let wins = 0;
  let timeouts = 0;
  let rounds = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const originalRandom = Math.random;
    Math.random = seededRandom(chapter * 1000003 + iteration * 7919 + seedSalt * 101 + (tactical ? 17 : 0));
    try {
      const team = teamFactory(curve);
      const phase1 = fightPhase(chapter, team, 1, tactical);
      let result = phase1;
      const hasPhase2 = chapter <= 6 && chapter !== 3;
      if (phase1.won && hasPhase2) result = fightPhase(chapter, team, 2, tactical);
      if (result.won) wins += 1;
      if (result.timeout) timeouts += 1;
      rounds += phase1.rounds + (hasPhase2 && phase1.won ? result.rounds : 0);
    } finally {
      Math.random = originalRandom;
    }
  }
  return { winRate: wins / iterations, timeoutRate: timeouts / iterations, averageRounds: rounds / iterations };
};

const runCoverageChecks = () => {
  let combinations = 0;
  for (const classKey of CLASS_KEYS) {
    for (const weaponName of ALL_WEAPONS) {
      for (const level of LEVELS) {
        for (const rarity of RARITIES) {
          let previousPower = -1;
          for (const enhance of UPGRADES) {
            const player = buildSimulatedDungeonPlayer({ classKey, level, weaponName, weaponRank: rarity, enhance });
            assert(Number.isFinite(player.power) && player.power > 0, "Sức mạnh mô phỏng phải hữu hạn và dương");
            assert(player.power >= previousPower, "Nâng cấp vũ khí không được làm giảm lực chiến");
            previousPower = player.power;
            combinations += 1;
          }
        }
      }
    }
  }
  let passivePairings = 0;
  for (const classKey of CLASS_KEYS) {
    for (const weaponName of WEAPON_KEYS) {
      const player = buildSimulatedDungeonPlayer({ classKey, level: 60, weaponName, weaponRank: "Ancient", enhance: 5 });
      const enemy = { name: "Mục tiêu kiểm thử", hp: 500000, maxHp: 500000, armor: 300, magicResist: 300 };
      const originalRandom = Math.random;
      Math.random = () => 0;
      try {
        const result = resolveWeaponPassive(player, enemy, {
          mode: "dungeon",
          rawDamage: player.power,
          isMagical: classKey === "mage",
          isSkill: true,
        });
        assert(Number.isFinite(result.damage) && result.damage >= 0, "Passive phải trả về sát thương hợp lệ");
        assert(Number.isFinite(result.mrOrArmor) && result.mrOrArmor >= 0, "Passive phải trả về phòng thủ hợp lệ");
      } finally {
        Math.random = originalRandom;
      }
      passivePairings += 1;
    }
  }
  assert.strictEqual(getDungeonTimeLimitMs("bossPhase2"), 7 * 60 * 1000);
  assert.strictEqual(config.dungeon.chapters[14].boss.mechanics.wipe_countdown, 6);
  assert.strictEqual(getSlothShieldBreakProgress({ classKey: "warrior", isSkill: true }), 3);
  assert.strictEqual(getSlothShieldBreakProgress({ classKey: "mage", weaponSubType: "thorshammer", isSkill: true }), 3);
  assert.strictEqual(getSlothShieldBreakProgress({ classKey: "mage", isSkill: true, bossIsBurning: true }), 2);
  assert.strictEqual(getSlothShieldBreakProgress({ classKey: "archer", isSkill: false }), 1);
  let configuredBosses = 0;
  for (let chapter = 1; chapter <= 14; chapter += 1) {
    const boss = config.dungeon.chapters[chapter]?.boss;
    assert(boss?.key && boss?.stats?.phase1, `Chương ${chapter} phải có boss và chỉ số Phase 1`);
    assert(boss.stats.phase1.base_hp > 0 && boss.stats.phase1.base_atk > 0 && boss.stats.phase1.base_defense >= 0);
    configuredBosses += 1;
  }
  return { combinations, passivePairings, configuredBosses };
};

const average = (rows, selector) => rows.length
  ? rows.reduce((sum, row) => sum + selector(row), 0) / rows.length
  : 0;

const coverage = runCoverageChecks();
assert.strictEqual(CLASS_COMPOSITIONS.length, 56, "Phải phủ đủ 56 tổ hợp 3 vị trí từ 6 class");
assert.strictEqual(new Set(ALL_WEAPONS).size, ALL_WEAPONS.length, "Danh sách nhóm vũ khí không được trùng");
assert.deepStrictEqual([...new Set(ALL_WEAPONS)].sort(), [...new Set([...NORMAL_WEAPONS, ...dungeonWeapons.map((weapon) => weapon.key)])].sort(), "Phải phủ toàn bộ vũ khí thường và vũ khí đặc biệt");

const compositionRows = [];
for (let chapter = 1; chapter <= 14; chapter += 1) {
  for (const [categoryIndex, category] of Object.keys(WEAPON_CATEGORIES).entries()) {
    for (let compositionIndex = 0; compositionIndex < CLASS_COMPOSITIONS.length; compositionIndex += 1) {
      const composition = CLASS_COMPOSITIONS[compositionIndex];
      const teamFactory = (curve) => makeCompositionTeam(chapter, composition, category, curve);
      compositionRows.push({
        chapter,
        category,
        composition: composition.join("+"),
        tactical: simulateTeam({ chapter, teamFactory, tactical: true, iterations: 12, seedSalt: categoryIndex * 100 + compositionIndex }),
        naive: simulateTeam({ chapter, teamFactory, tactical: false, iterations: 6, seedSalt: categoryIndex * 100 + compositionIndex }),
      });
    }
  }
}

const weaponRows = [];
for (let chapter = 1; chapter <= 14; chapter += 1) {
  for (let classIndex = 0; classIndex < CLASS_KEYS.length; classIndex += 1) {
    const classKey = CLASS_KEYS[classIndex];
    for (let weaponIndex = 0; weaponIndex < ALL_WEAPONS.length; weaponIndex += 1) {
      const weapon = ALL_WEAPONS[weaponIndex];
      const category = Object.entries(WEAPON_CATEGORIES).find(([, weapons]) => weapons.includes(weapon))[0];
      for (const upgrade of UPGRADES) {
        const composition = [classKey, classKey, classKey];
        const teamFactory = (curve) => makeCompositionTeam(chapter, composition, category, curve, weapon, upgrade);
        weaponRows.push({
          chapter,
          classKey,
          weapon,
          category,
          upgrade,
          tactical: simulateTeam({ chapter, teamFactory, tactical: true, iterations: 3, seedSalt: classIndex * 10000 + weaponIndex * 100 + upgrade }),
        });
      }
    }
  }
}

const chapters = Array.from({ length: 14 }, (_, index) => {
  const chapter = index + 1;
  const rows = compositionRows.filter((row) => row.chapter === chapter);
  const compositionScores = CLASS_COMPOSITIONS.map((composition) => {
    const key = composition.join("+");
    const matching = rows.filter((row) => row.composition === key);
    return { composition: key, winRate: average(matching, (row) => row.tactical.winRate) };
  });
  return {
    chapter,
    naive: average(rows, (row) => row.naive.winRate),
    tactical: average(rows, (row) => row.tactical.winRate),
    tacticalGain: average(rows, (row) => row.tactical.winRate - row.naive.winRate),
    timeout: average(rows, (row) => row.tactical.timeoutRate),
    viableCompositions: compositionScores.filter((row) => row.winRate >= 0.50).length,
    categoryWinRates: Object.fromEntries(Object.keys(WEAPON_CATEGORIES).map((category) => [
      category,
      average(rows.filter((row) => row.category === category), (row) => row.tactical.winRate),
    ])),
    weakestComposition: [...compositionScores].sort((a, b) => a.winRate - b.winRate)[0],
    strongestComposition: [...compositionScores].sort((a, b) => b.winRate - a.winRate)[0],
  };
});

const classSummary = Object.fromEntries(CLASS_KEYS.map((classKey) => {
  const rows = compositionRows.filter((row) => row.composition.split("+").includes(classKey));
  return [classKey, {
    winRate: average(rows, (row) => row.tactical.winRate),
    viableRows: rows.filter((row) => row.tactical.winRate >= 0.50).length,
    testedRows: rows.length,
  }];
}));
const categorySummary = Object.fromEntries(Object.keys(WEAPON_CATEGORIES).map((category) => {
  const rows = weaponRows.filter((row) => row.category === category);
  return [category, {
    weapons: WEAPON_CATEGORIES[category].length,
    winRate: average(rows, (row) => row.tactical.winRate),
    plus0: average(rows.filter((row) => row.upgrade === 0), (row) => row.tactical.winRate),
    plus10: average(rows.filter((row) => row.upgrade === 10), (row) => row.tactical.winRate),
  }];
}));
const gachaSummary = Object.fromEntries(GACHA_WEAPONS.map((weapon) => {
  const rows = weaponRows.filter((row) => row.weapon === weapon);
  return [weapon, {
    winRate: average(rows, (row) => row.tactical.winRate),
    plus0: average(rows.filter((row) => row.upgrade === 0), (row) => row.tactical.winRate),
    plus10: average(rows.filter((row) => row.upgrade === 10), (row) => row.tactical.winRate),
  }];
}));
const curveRows = [];
for (let chapter = 1; chapter <= 14; chapter += 1) {
  for (const curve of ["under", "on", "over"]) {
    for (let compositionIndex = 0; compositionIndex < CLASS_COMPOSITIONS.length; compositionIndex += 1) {
      const composition = CLASS_COMPOSITIONS[compositionIndex];
      const teamFactory = (selectedCurve) => makeCompositionTeam(chapter, composition, "event", selectedCurve);
      curveRows.push({
        chapter,
        curve,
        result: simulateTeam({ chapter, teamFactory, curve, tactical: true, iterations: 4, seedSalt: compositionIndex + (curve === "under" ? 1000 : curve === "over" ? 2000 : 0) }),
      });
    }
  }
}

console.log(JSON.stringify({
  coverage: {
    ...coverage,
    classes: CLASS_KEYS.length,
    classCompositions: CLASS_COMPOSITIONS.length,
    weapons: ALL_WEAPONS.length,
    weaponCategories: Object.fromEntries(Object.entries(WEAPON_CATEGORIES).map(([key, values]) => [key, values.length])),
    levels: LEVELS,
    rarities: RARITIES,
    upgrades: UPGRADES,
    compositionFightProfiles: compositionRows.length,
    individualWeaponProfiles: weaponRows.length,
  },
  coreAverages: {
    naive: average(compositionRows, (row) => row.naive.winRate),
    tactical: average(compositionRows, (row) => row.tactical.winRate),
    tacticalGain: average(compositionRows, (row) => row.tactical.winRate - row.naive.winRate),
  },
  chapters,
  classes: classSummary,
  weaponCategories: categorySummary,
  septemberGacha: gachaSummary,
  progressionCurves: Array.from({ length: 14 }, (_, index) => {
    const chapter = index + 1;
    return Object.fromEntries(["under", "on", "over"].map((curve) => [
      curve,
      average(curveRows.filter((row) => row.chapter === chapter && row.curve === curve), (row) => row.result.winRate),
    ]));
  }),
}, null, 2));
