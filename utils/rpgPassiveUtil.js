const config = require("../data/config");
const {
  WEAPON_PASSIVE_TRIGGER_RATE,
  PASSIVE_TYPES,
  WEAPON_PASSIVES,
  LOCKED_WEAPONS,
  getWeaponPassive,
  isLockedWeapon,
  getPassiveForMode,
} = require("../data/rpg/weaponPassives");

const EMOJIS = {
  healreduction: "<:healreduction:1523340558855045190>",
  poisonous: "<:poisonous:1522374367542247424>",
  taunt: "<:taunt:1521938510485917796>",
  frostbite: "<:frostbite:1521938506425958431>",
  freeze: "<:freeze:1521938500478566639>",
  bleed: "<:bleed:1521938497642958889>",
  burn: "<:burn:1521938494094835774>",
  stun: "<:stun:1521938490605178910>",
  heal: "<:heal:1521938487907975198>",
  dispe: "<:dispe:1521938483730710578>",
  break: "<:break:1521938480337391736>",
  atkup: "<:atkup:1521938477359300648>",
  atkdown: "<:atkdown:1521938474587000913>",
};

const PASSIVE_EMOJIS = {
  [PASSIVE_TYPES.BLEED]: EMOJIS.bleed,
  [PASSIVE_TYPES.BURN]: EMOJIS.burn,
  [PASSIVE_TYPES.FREEZE]: EMOJIS.freeze,
  [PASSIVE_TYPES.STUN]: EMOJIS.stun,
  [PASSIVE_TYPES.HEAL_BAN]: EMOJIS.healreduction,
  [PASSIVE_TYPES.LIFESTEAL]: EMOJIS.heal,
  [PASSIVE_TYPES.DAMAGE_MULT]: EMOJIS.atkup,
  [PASSIVE_TYPES.ARMOR_PIERCE]: EMOJIS.break,
  [PASSIVE_TYPES.MR_PIERCE]: EMOJIS.break,
  [PASSIVE_TYPES.ARMOR_SHRED]: EMOJIS.break,
  [PASSIVE_TYPES.MR_SHRED]: EMOJIS.break,
  [PASSIVE_TYPES.DOUBLE_HIT]: EMOJIS.atkup,
  [PASSIVE_TYPES.HEAL_ON_SKILL]: EMOJIS.heal,
  [PASSIVE_TYPES.NEXT_ATTACK_MULT]: EMOJIS.atkup,
  [PASSIVE_TYPES.REFLECT]: EMOJIS.break,
  [PASSIVE_TYPES.DEFLECT]: EMOJIS.break,
  [PASSIVE_TYPES.RANDOM_EFFECT]: `${EMOJIS.burn} ${EMOJIS.break} ${EMOJIS.stun}`,
};

const getPassiveEmoji = (passiveType) => PASSIVE_EMOJIS[passiveType] || "✨";

const formatPassiveLog = (message, passiveType) => {
  if (!message) return "";
  const emoji = getPassiveEmoji(passiveType);
  return message.startsWith(emoji) ? message : `${emoji} ${message}`;
};

const getWeaponPassiveEmoji = (subType, mode = "dungeon") => {
  const passive = getPassiveForMode(subType, mode);
  return passive ? getPassiveEmoji(passive.type) : "";
};

const getActiveStatusString = (target) => {
  if (!target) return "";
  const parts = [];
  if (target.poisonRounds && target.poisonRounds > 0) parts.push(`${EMOJIS.poisonous}(${target.poisonRounds}L)`);
  if (target.bleedRounds && target.bleedRounds > 0) parts.push(`${EMOJIS.bleed}(${target.bleedRounds}L)`);
  if (target.burnRounds && target.burnRounds > 0) parts.push(`${EMOJIS.burn}(${target.burnRounds}L)`);
  if (target.freezeRounds && target.freezeRounds > 0) parts.push(`${EMOJIS.freeze}(${target.freezeRounds}L)`);
  if (target.frostbiteRounds && target.frostbiteRounds > 0) parts.push(`${EMOJIS.frostbite}(${target.frostbiteRounds}L)`);
  if (target.stunRounds && target.stunRounds > 0) parts.push(`${EMOJIS.stun}(${target.stunRounds}L)`);
  if (target.breakRounds && target.breakRounds > 0) parts.push(`${EMOJIS.break}(${target.breakRounds}L)`);
  if (target.healBanRounds && target.healBanRounds > 0) parts.push(`${EMOJIS.healreduction}(${target.healBanRounds}L)`);
  if (target.tauntRounds && target.tauntRounds > 0) parts.push(`${EMOJIS.taunt}(${target.tauntRounds}L)`);
  if (target.atkUp) parts.push(EMOJIS.atkup);
  if (target.atkDown) parts.push(EMOJIS.atkdown);
  return parts.length > 0 ? parts.join(" ") : "";
};

const applyStatusEffect = (target, effectType, rounds, options = {}) => {
  if (!target) return;
  switch (effectType) {
    case "poison":
      target.poisonRounds = (target.poisonRounds || 0) + rounds;
      if (options.damage) target.poisonDamage = options.damage;
      break;
    case "bleed":
      target.bleedRounds = (target.bleedRounds || 0) + rounds;
      if (options.damage) target.bleedDamage = options.damage;
      break;
    case "burn":
      target.burnRounds = (target.burnRounds || 0) + rounds;
      if (options.damage) target.burnDamage = options.damage;
      break;
    case "freeze":
      target.freezeRounds = (target.freezeRounds || 0) + rounds;
      break;
    case "frostbite":
      target.frostbiteRounds = (target.frostbiteRounds || 0) + rounds;
      if (options.damage) target.frostbiteDamage = options.damage;
      break;
    case "stun":
      target.stunRounds = (target.stunRounds || 0) + rounds;
      break;
    case "break":
      target.breakRounds = (target.breakRounds || 0) + rounds;
      break;
    case "heal_ban":
      target.healBanRounds = (target.healBanRounds || 0) + rounds;
      break;
    case "taunt":
      target.tauntRounds = (target.tauntRounds || 0) + rounds;
      break;
    case "atkup":
      target.atkUp = true;
      break;
    case "atkdown":
      target.atkDown = true;
      break;
  }
};

const tickStatusEffects = (target, activeDungeon) => {
  if (!target) return { skipTurn: false, logs: [] };
  const logs = [];

  const isStunned = target.stunRounds && target.stunRounds > 0;
  const isFrozen = target.freezeRounds && target.freezeRounds > 0;
  if (isStunned || isFrozen) {
    const skipReason = isFrozen ? `ĐÓNG BĂNG ${EMOJIS.freeze}` : `CHOÁNG ${EMOJIS.stun}`;
    logs.push(`⚠️ **${target.name}** đang bị ${skipReason} — mất lượt hành động!`);
    if (isFrozen) {
      target.freezeRounds -= 1;
      if (target.freezeRounds === 0) logs.push(`❄️ **${target.name}** giải đóng băng.`);
    }
    if (isStunned) {
      target.stunRounds -= 1;
      if (target.stunRounds === 0) logs.push(`⚡ **${target.name}** hết choáng.`);
    }
    if (target.breakRounds && target.breakRounds > 0) target.breakRounds -= 1;
    return { skipTurn: true, logs };
  }

  if (target.breakRounds && target.breakRounds > 0) target.breakRounds -= 1;

  let totalDotDmg = 0;
  if (target.poisonRounds && target.poisonRounds > 0) {
    const dmg = target.poisonDamage || Math.floor(target.maxHp * 0.05);
    target.poisonRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.poisonous} **${target.name}** mất **${dmg.toLocaleString()}** HP do Độc (Còn ${target.poisonRounds} lượt).`);
  }
  if (target.bleedRounds && target.bleedRounds > 0) {
    const dmg = target.bleedDamage || Math.floor(target.maxHp * 0.05);
    target.bleedRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.bleed} **${target.name}** mất **${dmg.toLocaleString()}** HP do Chảy Máu (Còn ${target.bleedRounds} lượt).`);
  }
  if (target.burnRounds && target.burnRounds > 0) {
    let dmg = target.burnDamage || Math.floor(target.maxHp * 0.04);
    if (target.freezeRounds && target.freezeRounds > 0) dmg *= 2;
    target.burnRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.burn} **${target.name}** mất **${dmg.toLocaleString()}** HP do Thiêu Đốt (Còn ${target.burnRounds} lượt).`);
  }
  if (target.frostbiteRounds && target.frostbiteRounds > 0) {
    const dmg = target.frostbiteDamage || Math.floor(target.maxHp * 0.045);
    target.frostbiteRounds -= 1;
    totalDotDmg += dmg;
    logs.push(`${EMOJIS.frostbite} **${target.name}** mất **${dmg.toLocaleString()}** HP do Frostbite (Còn ${target.frostbiteRounds} lượt).`);
  }
  if (totalDotDmg > 0) {
    const actualDmg = Math.min(target.hp, totalDotDmg);
    target.hp = Math.max(0, target.hp - totalDotDmg);
    if (activeDungeon) {
      activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;
    }
    if (target.hp <= 0) logs.push(`💀 **${target.name}** đã tử nạn do sát thương DoT duy trì!`);
  }

  return { skipTurn: false, logs };
};

const resolveWeaponPassive = (player, enemy, context = {}) => {
  const { mode = "dungeon", rawDamage = 0, isMagical = false, isSecondHit = false, isSkill = false } = context;

  const pWeaponSubType = player.weapon?.subType
    ? player.weapon.subType.toLowerCase().replace(/\s+/g, "")
    : "";

  const pWeaponRarity = player.weapon?.rarity || "";

  const result = {
    damage: rawDamage,
    mrOrArmor: isMagical ? (enemy.magicResist || 0) : (enemy.armor || 0),
    doubleHitTriggered: false,
    logs: [],
    bleedDamage: 0,
    healAmount: 0,
    nextAttackMult: 1.0,
    hitCounterInc: false,
    hitCountReached: false,
    absorbedDamage: 0,
    shouldReflect: false,
    reflectDamage: 0,
    selfDamageReduce: 0,
    pierceFlags: { blueStaff: false, crimsonDagger: false, sunbow: false, spearhex: false },
  };

  if (isLockedWeapon(pWeaponSubType)) return result;

  if (String(pWeaponRarity).toLowerCase() === "common") return result;

  const passiveDef = getWeaponPassive(pWeaponSubType);
  if (!passiveDef) return result;

  const passive = passiveDef.mode[mode];
  if (!passive) return result;

  const addPassiveLog = (message, passiveType = passive.type) => {
    const formatted = formatPassiveLog(message, passiveType);
    if (formatted) result.logs.push(formatted);
  };

  const hasTriggered = Math.random() < WEAPON_PASSIVE_TRIGGER_RATE;
  const stats = player.stats || {};
  const power = player.power || 0;

  const calcScaling = (scalingFn) => {
    if (typeof scalingFn === "function") return Math.floor(scalingFn(stats, power));
    return 0;
  };

  switch (passive.type) {
    case PASSIVE_TYPES.BLEED: {
      if (!hasTriggered) break;
      const bleedDmg = calcScaling(passive.scaling);
      applyStatusEffect(enemy, "bleed", passive.rounds, { damage: bleedDmg });
      result.bleedDamage = bleedDmg;
      if (passive.damageMult) {
        result.damage = Math.floor(result.damage * passive.damageMult);
      }
      addPassiveLog(passive.log
        ? passive.log(enemy.name)
        : (passiveDef.name
          ? `🛡️ **[${passiveDef.name}]** Gây chảy máu ${passive.rounds} lượt${passive.damageMult ? ` + ${Math.round((passive.damageMult - 1) * 100)}% sát thương` : ""}!`
          : ""), passive.type);
      for (const extraEffect of passive.extraEffects || []) {
        if (extraEffect.type !== PASSIVE_TYPES.ARMOR_SHRED) continue;
        const amount = extraEffect.amount || 0.10;
        const cap = extraEffect.cap || 0.40;
        const currentReduced = enemy._armorReduced || 0;
        const applied = Math.min(amount, Math.max(0, cap - currentReduced));
        if (applied <= 0) continue;
        enemy._armorReduced = currentReduced + applied;
        enemy.armor = Math.max(0, Math.floor((enemy.armor || 0) * (1 - applied)));
        if (extraEffect.alsoShredMR) {
          enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
        }
      }
      break;
    }

    case PASSIVE_TYPES.BURN: {
      if (!hasTriggered) break;
      const burnDmg = calcScaling(passive.scaling);
      applyStatusEffect(enemy, "burn", passive.rounds, { damage: burnDmg });
      if (passive.alsoApplies) {
        if (passive.alsoApplies.type === PASSIVE_TYPES.HEAL_BAN) {
          applyStatusEffect(enemy, "heal_ban", passive.alsoApplies.rounds);
        }
      }
      addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      break;
    }

    case PASSIVE_TYPES.FREEZE: {
      if (!hasTriggered) break;
      const chance = passive.chance || 1.0;
      if (Math.random() < chance) {
        applyStatusEffect(enemy, "freeze", passive.rounds);
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      }
      break;
    }

    case PASSIVE_TYPES.STUN: {
      if (!hasTriggered) break;
      applyStatusEffect(enemy, "stun", passive.rounds);
      addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      break;
    }

    case PASSIVE_TYPES.HEAL_BAN: {
      if (!hasTriggered) break;
      applyStatusEffect(enemy, "heal_ban", passive.rounds);
      addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      break;
    }

    case PASSIVE_TYPES.LIFESTEAL: {
      if (!hasTriggered) break;
      let healBase = 0;
      if (passive.healType === "damage") {
        healBase = Math.max(1, Math.floor(result.damage * passive.pct));
      } else if (passive.healType === "missing_hp") {
        const missing = (player.maxHp || 0) - (player.hp || 0);
        healBase = Math.floor(missing * passive.pct);
      }
      result.healAmount = healBase;
      addPassiveLog(passive.log ? passive.log(player.name, healBase) : "");
      break;
    }

    case PASSIVE_TYPES.DAMAGE_MULT: {
      const hitCounterKey = `_${pWeaponSubType}Hits`;
      player[hitCounterKey] = (player[hitCounterKey] || 0) + 1;
      if (player[hitCounterKey] >= (passive.hitCount || 3)) {
        player[hitCounterKey] = 0;
        result.damage = Math.floor(result.damage * passive.mult);
        addPassiveLog(passive.log ? passive.log() : "");
      }
      break;
    }

    case PASSIVE_TYPES.ARMOR_PIERCE: {
      if (!hasTriggered) break;
      const amount = passive.amount || 0.10;
      if (pWeaponSubType === "crimsondagger") result.pierceFlags.crimsonDagger = true;
      if (pWeaponSubType === "spearhex") result.pierceFlags.spearhex = true;
      if (passive.alsoPierceMR) {
        if (pWeaponSubType === "sunbow") result.pierceFlags.sunbow = true;
        result.mrOrArmor = Math.floor(result.mrOrArmor * (1 - amount));
      } else {
        result.mrOrArmor = Math.floor(result.mrOrArmor * (1 - amount));
      }
      addPassiveLog(passive.log ? passive.log() : "");
      break;
    }

    case PASSIVE_TYPES.MR_PIERCE: {
      if (!hasTriggered) break;
      const amount = passive.amount || 0.25;
      if (pWeaponSubType === "bluestaff") result.pierceFlags.blueStaff = true;
      result.mrOrArmor = Math.floor(result.mrOrArmor * (1 - amount));
      if (passive.alsoRoll) {
        if (Math.random() < (passive.alsoRoll.chance || 0.25)) {
          applyStatusEffect(enemy, "freeze", passive.alsoRoll.rounds || 1);
          addPassiveLog(`**[Blue Staff]** Làm đóng băng **${enemy.name}**!`, PASSIVE_TYPES.FREEZE);
        }
      }
      addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      break;
    }

    case PASSIVE_TYPES.ARMOR_SHRED: {
      if (!hasTriggered) break;
      const amount = passive.amount || 0.10;
      if (passive.cap) {
        const currentReduced = enemy._armorReduced || 0;
        const newReduced = Math.min(passive.cap, currentReduced + amount);
        enemy._armorReduced = newReduced;
      }
      enemy.armor = Math.max(0, Math.floor(enemy.armor * (1 - amount)));
      if (passive.alsoShredMR) {
        enemy.magicResist = Math.max(0, Math.floor(enemy.magicResist * (1 - amount)));
      }
      addPassiveLog(passive.log ? passive.log(enemy.name, {
        armor: enemy.armor,
        mr: enemy.magicResist || 0,
        totalReduced: enemy._armorReduced || amount,
      }) : "");
      break;
    }

    case PASSIVE_TYPES.DOUBLE_HIT: {
      if (isSecondHit) break;
      if (enemy.hp > 0 && Math.random() < (passive.chance || 0.30)) {
        result.doubleHitTriggered = true;
        addPassiveLog(passive.log ? passive.log() : "");
      }
      break;
    }

    case PASSIVE_TYPES.REFLECT: {
      const shieldSub = "shieldhex";
      if (pWeaponSubType.includes(shieldSub)) {
        result.mrOrArmor = result.mrOrArmor;
      }
      break;
    }

    case PASSIVE_TYPES.HEAL_ON_SKILL: {
      if (isSkill) {
        const missing = (player.maxHp || 0) - (player.hp || 0);
        const healAmt = Math.max(1, Math.floor(missing * 0.10));
        result.healAmount = healAmt;
        addPassiveLog(passive.log ? passive.log(player.name, healAmt) : "");
      }
      break;
    }

    case PASSIVE_TYPES.NEXT_ATTACK_MULT: {
      if (hasTriggered) {
        result.nextAttackMult = passive.mult || 1.4;
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      }
      break;
    }

    case PASSIVE_TYPES.RANDOM_EFFECT: {
      if (!hasTriggered) break;
      const effects = passive.effects || [];
      if (effects.length === 0) break;
      const chosen = effects[Math.floor(Math.random() * effects.length)];
      switch (chosen.type) {
        case PASSIVE_TYPES.BLEED: {
          const bleedDmg = calcScaling(chosen.scaling);
          applyStatusEffect(enemy, "bleed", chosen.rounds || 2, { damage: bleedDmg });
          addPassiveLog(`🔮 **[${passiveDef.name}]** Lời nguyền gây chảy máu!`, chosen.type);
          break;
        }
        case PASSIVE_TYPES.BURN: {
          const burnDmg = calcScaling(chosen.scaling);
          applyStatusEffect(enemy, "burn", chosen.rounds || 2, { damage: burnDmg });
          addPassiveLog(`🔥 **[${passiveDef.name}]** Lời nguyền thiêu đốt!`, chosen.type);
          break;
        }
        case PASSIVE_TYPES.ARMOR_SHRED: {
          enemy.armor = Math.max(0, Math.floor(enemy.armor * (1 - (chosen.amount || 0.15))));
          addPassiveLog(`⚔️ **[${passiveDef.name}]** Lời nguyền phá giáp!`, chosen.type);
          break;
        }
        case PASSIVE_TYPES.MR_PIERCE: {
          result.mrOrArmor = Math.floor(result.mrOrArmor * (1 - (chosen.amount || 0.25)));
          addPassiveLog(`❄️ **[${passiveDef.name}]** Lời nguyền xuyên kháng phép!`, chosen.type);
          break;
        }
        case PASSIVE_TYPES.STUN: {
          applyStatusEffect(enemy, "stun", chosen.rounds || 1);
          addPassiveLog(`⚡ **[${passiveDef.name}]** Lời nguyền làm choáng!`, chosen.type);
          break;
        }
      }
      break;
    }

    case PASSIVE_TYPES.DEFLECT: {
      break;
    }

    case PASSIVE_TYPES.NONE:
    default:
      break;
  }

  if (passive.selfDamageReduce) {
    result.selfDamageReduce = passive.selfDamageReduce;
  }

  return result;
};

const resolveShieldhexDefense = (target, damage, activeDungeon) => {
  const playerSubType = target.weapon?.subType
    ? target.weapon.subType.toLowerCase().replace(/\s+/g, "")
    : "";
  if (!playerSubType.includes("shieldhex")) return { damage, absorbed: 0, shouldReflect: false };

  if (!target.effects) target.effects = {};
  const absorbPct = 0.20;
  const absorbed = Math.floor(damage * absorbPct);
  const reducedDamage = damage - absorbed;

  target.effects.shieldhexAbsorbed = (target.effects.shieldhexAbsorbed || 0) + absorbed;
  target.effects.shieldhexRounds = (target.effects.shieldhexRounds || 0) + 1;

  return { damage: reducedDamage, absorbed, shouldReflect: false, reflectDamage: 0 };
};

const triggerWeaponPassiveOnAttack = (player, enemy, activeDungeon, rawDamage, isMagical, isSecondHit, multiplier, isSkill) => {
  const result = resolveWeaponPassive(player, enemy, {
    mode: "dungeon",
    rawDamage,
    isMagical,
    isSecondHit,
    isSkill,
  });

  if (result.healAmount > 0 && player.hp !== undefined && player.maxHp !== undefined) {
    player.hp = Math.min(player.maxHp, player.hp + result.healAmount);
  }

  return {
    damage: result.damage,
    mrOrArmor: result.mrOrArmor,
    doubleHitTriggered: result.doubleHitTriggered,
    logs: result.logs,
  };
};

const triggerWorldBossPassive = (cleanSubType, participant, activeBoss, passiveTriggers, damage) => {
  const player = {
    weapon: { subType: cleanSubType, rarity: participant?.weapon?.rarity },
    stats: participant.effectiveStats || {},
    power: participant.gearPower || 0,
    hp: participant.hp || 0,
    maxHp: participant.maxHp || 0,
  };
  const enemy = {
    armor: activeBoss.boss?.armor || 0,
    magicResist: activeBoss.boss?.magicResist || 0,
    name: activeBoss.boss?.name || "Boss",
  };

  const result = resolveWeaponPassive(player, enemy, {
    mode: "boss",
    rawDamage: damage,
    isMagical: false,
  });

  passiveTriggers.push(...result.logs);

  return {
    blueStaffPierce: result.pierceFlags.blueStaff,
    crimsonDaggerPierce: result.pierceFlags.crimsonDagger,
    sunbowPierce: result.pierceFlags.sunbow,
    holySwordDouble: result.damage > damage,
    riverofbloodTriggered: result.healAmount > 0,
  };
};

module.exports = {
  EMOJIS,
  getPassiveEmoji,
  getWeaponPassiveEmoji,
  PASSIVE_TYPES,
  WEAPON_PASSIVE_TRIGGER_RATE,
  getActiveStatusString,
  applyStatusEffect,
  tickStatusEffects,
  resolveWeaponPassive,
  resolveShieldhexDefense,
  triggerWeaponPassiveOnAttack,
  triggerWorldBossPassive,
  getWeaponPassive,
  isLockedWeapon,
  getPassiveForMode,
};
