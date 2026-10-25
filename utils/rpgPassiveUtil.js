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
  [PASSIVE_TYPES.POISON]: EMOJIS.poisonous,
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
      if ((target.ccImmunityRounds || 0) > 0) break;
      target.freezeRounds = (target.freezeRounds || 0) + rounds;
      target.ccImmunityRounds = Math.max(target.ccImmunityRounds || 0, 2);
      break;
    case "frostbite":
      target.frostbiteRounds = (target.frostbiteRounds || 0) + rounds;
      if (options.damage) target.frostbiteDamage = options.damage;
      break;
    case "stun":
      if ((target.ccImmunityRounds || 0) > 0) break;
      target.stunRounds = (target.stunRounds || 0) + rounds;
      target.ccImmunityRounds = Math.max(target.ccImmunityRounds || 0, 2);
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

  if (target.ccImmunityRounds && target.ccImmunityRounds > 0) {
    target.ccImmunityRounds -= 1;
  }

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
    case PASSIVE_TYPES.POISON: {
      if (!hasTriggered) break;
      const poisonDmg = calcScaling(passive.scaling);
      applyStatusEffect(enemy, "poison", passive.rounds, { damage: poisonDmg });
      addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      for (const extraEffect of passive.extraEffects || []) {
        if (extraEffect.type !== PASSIVE_TYPES.ARMOR_SHRED) continue;
        const amount = extraEffect.amount || 0.10;
        const cap = extraEffect.cap || 0.40;
        const currentReduced = enemy._armorReduced || 0;
        const applied = Math.min(amount, Math.max(0, cap - currentReduced));
        if (applied <= 0) continue;
        enemy._armorReduced = currentReduced + applied;
        enemy.armor = Math.max(0, Math.floor((enemy.armor || 0) * (1 - applied)));
        if (!isMagical) {
          result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
        }
        if (extraEffect.alsoShredMR) {
          enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
        }
      }
      break;
    }

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
        if (!isMagical) {
          result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
        }
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
      if (passive.damageMult) {
        result.damage = Math.floor(result.damage * passive.damageMult);
      }
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
      if ((enemy.ccImmunityRounds || 0) <= 0 && Math.random() < chance) {
        applyStatusEffect(enemy, "freeze", passive.rounds);
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      }
      break;
    }

    case PASSIVE_TYPES.STUN: {
      if (!hasTriggered) break;
      if (passive.damageMult) {
        result.damage = Math.floor(result.damage * passive.damageMult);
      }
      if ((enemy.ccImmunityRounds || 0) <= 0) {
        applyStatusEffect(enemy, "stun", passive.rounds);
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      }
      break;
    }

    case PASSIVE_TYPES.HEAL_BAN: {
      if (!hasTriggered) break;
      applyStatusEffect(enemy, "heal_ban", passive.rounds);
      if (passive.executeThreshold && enemy.maxHp && (enemy.hp / enemy.maxHp) <= passive.executeThreshold) {
        result.damage = Math.floor(result.damage * (1 + (passive.executeBonus || 0.40)));
      }
      if (passive.lifestealPct) {
        result.healAmount = Math.max(1, Math.floor(result.damage * passive.lifestealPct));
      }
      addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      break;
    }

    case PASSIVE_TYPES.LIFESTEAL: {
      if (!hasTriggered) break;
      if (passive.executeThreshold && enemy.maxHp && (enemy.hp / enemy.maxHp) <= passive.executeThreshold) {
        result.damage = Math.floor(result.damage * (1 + (passive.executeBonus || 0.25)));
      }
      if (passive.damageMult) {
        result.damage = Math.floor(result.damage * passive.damageMult);
      }
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
        if (passive.mrPierce) {
          result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - passive.mrPierce)));
        }
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
      let applied = amount;
      if (passive.cap) {
        const currentReduced = enemy._armorReduced || 0;
        applied = Math.min(amount, Math.max(0, passive.cap - currentReduced));
        enemy._armorReduced = currentReduced + applied;
      }
      if (applied <= 0) break;
      enemy.armor = Math.max(0, Math.floor(enemy.armor * (1 - applied)));
      if (!isMagical) {
        result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
      }
      if (passive.alsoShredMR) {
        enemy.magicResist = Math.max(0, Math.floor(enemy.magicResist * (1 - applied)));
        if (isMagical) {
          result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
        }
      }
      if (passive.damageMult) {
        result.damage = Math.floor(result.damage * passive.damageMult);
      }
      if (passive.healPctMaxHp) {
        result.healAmount = Math.max(1, Math.floor((player.maxHp || 100) * passive.healPctMaxHp));
      }
      addPassiveLog(passive.log ? passive.log(enemy.name, {
        armor: enemy.armor,
        mr: enemy.magicResist || 0,
        totalReduced: enemy._armorReduced || amount,
      }) : "");
      break;
    }

    case PASSIVE_TYPES.MR_SHRED: {
      if (!hasTriggered) break;
      const amount = passive.amount || 0.25;
      let applied = amount;
      if (passive.cap) {
        const currentReduced = enemy._mrReduced || 0;
        applied = Math.min(amount, Math.max(0, passive.cap - currentReduced));
        enemy._mrReduced = currentReduced + applied;
      }
      if (applied <= 0) break;
      enemy.magicResist = Math.max(0, Math.floor((enemy.magicResist || 0) * (1 - applied)));
      if (isMagical) {
        result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
      }
      addPassiveLog(passive.log ? passive.log(enemy.name) : "");
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
          const amount = chosen.amount || 0.15;
          const cap = chosen.cap || 0.40;
          const currentReduced = enemy._armorReduced || 0;
          const applied = Math.min(amount, Math.max(0, cap - currentReduced));
          if (applied <= 0) break;
          enemy._armorReduced = currentReduced + applied;
          enemy.armor = Math.max(0, Math.floor(enemy.armor * (1 - applied)));
          if (!isMagical) {
            result.mrOrArmor = Math.max(0, Math.floor(result.mrOrArmor * (1 - applied)));
          }
          addPassiveLog(`⚔️ **[${passiveDef.name}]** Lời nguyền phá giáp!`, chosen.type);
          break;
        }
        case PASSIVE_TYPES.MR_PIERCE: {
          result.mrOrArmor = Math.floor(result.mrOrArmor * (1 - (chosen.amount || 0.25)));
          addPassiveLog(`❄️ **[${passiveDef.name}]** Lời nguyền xuyên kháng phép!`, chosen.type);
          break;
        }
        case PASSIVE_TYPES.STUN: {
          if ((enemy.ccImmunityRounds || 0) <= 0) {
            applyStatusEffect(enemy, "stun", chosen.rounds || 1);
            addPassiveLog(`⚡ **[${passiveDef.name}]** Lời nguyền làm choáng!`, chosen.type);
          }
          break;
        }
      }
      break;
    }

    case PASSIVE_TYPES.DEFLECT: {
      break;
    }

    case PASSIVE_TYPES.NONE:
      if (hasTriggered) {
        if (passive.damageMult) {
          result.damage = Math.floor(result.damage * passive.damageMult);
        }
        if (passive.targetAtkDown) {
          applyStatusEffect(enemy, "atkdown", 2);
        }
        addPassiveLog(passive.log ? passive.log(enemy.name) : "");
      }
      break;
    default:
      break;
  }

  if (passive.selfDamageReduce) {
    result.selfDamageReduce = passive.selfDamageReduce;
  }

  // Resolve Random Variable Passive (OwO-style dual passive)
  const randPassive = player.weapon?.randomPassive;
  if (randPassive && typeof randPassive === "object") {
    const randTriggered = Math.random() < 0.45;
    if (randTriggered) {
      switch (randPassive.type) {
        case "lifesteal": {
          const heal = Math.floor(result.damage * (randPassive.value || 0.1));
          if (heal > 0) {
            result.healAmount = (result.healAmount || 0) + heal;
            result.logs.push(`${randPassive.emoji || "💖"} **[${randPassive.name}]** Hút máu hồi **+${heal.toLocaleString()}** HP!`);
          }
          break;
        }
        case "armor_pierce":
        case "mr_pierce": {
          const shred = randPassive.value || 0.15;
          result.mrOrArmor = Math.max(0, result.mrOrArmor * (1 - shred));
          result.logs.push(`${randPassive.emoji || "🗡️"} **[${randPassive.name}]** Bỏ qua ${Math.round(shred * 100)}% phòng ngự!`);
          break;
        }
        case "bleed": {
          const dotDmg = Math.max(10, Math.floor(result.damage * (randPassive.value || 0.12)));
          applyStatusEffect(enemy, "bleed", 2, { damage: dotDmg });
          result.logs.push(`${randPassive.emoji || "<:bleed:1521938497642958889>"} **[${randPassive.name}]** Gây chảy máu lên **${enemy.name}**!`);
          break;
        }
        case "burn": {
          const dotDmg = Math.max(10, Math.floor(result.damage * (randPassive.value || 0.12)));
          applyStatusEffect(enemy, "burn", 2, { damage: dotDmg });
          result.logs.push(`${randPassive.emoji || "<:burn:1521938494094835774>"} **[${randPassive.name}]** Thiêu đốt **${enemy.name}**!`);
          break;
        }
        case "freeze": {
          applyStatusEffect(enemy, "freeze", 1);
          result.logs.push(`${randPassive.emoji || "<:freeze:1521938500478566639>"} **[${randPassive.name}]** Đóng băng **${enemy.name}** 1 lượt!`);
          break;
        }
        case "stun": {
          applyStatusEffect(enemy, "stun", 1);
          result.logs.push(`${randPassive.emoji || "<:stun:1521938490605178910>"} **[${randPassive.name}]** Làm choáng **${enemy.name}** 1 lượt!`);
          break;
        }
        case "crit": {
          const critMult = 1 + (randPassive.value || 0.25);
          result.damage = Math.floor(result.damage * critMult);
          result.logs.push(`${randPassive.emoji || "💥"} **[${randPassive.name}]** Đòn đánh bạo kích gia tăng sát thương!`);
          break;
        }
        case "double_hit": {
          result.doubleHitTriggered = true;
          const extraDmg = Math.floor(result.damage * (randPassive.value || 0.35));
          result.damage += extraDmg;
          result.logs.push(`${randPassive.emoji || "⚡"} **[${randPassive.name}]** Tấn công kép gây thêm **+${extraDmg.toLocaleString()}** sát thương!`);
          break;
        }
        default:
          break;
      }
    }
  }

  return result;
};

function rollRandomWeaponPassive(rarity = "Common", quality = 50) {
  const PASSIVE_POOL = [
    { type: "lifesteal", name: "Hút Máu", emoji: "<:LifeSteal:1563844557026893924>", baseMin: 0.04, baseMax: 0.08 },
    { type: "armor_pierce", name: "Xuyên Giáp", emoji: "<:ArmorPierce:1563844554728276018>", baseMin: 0.06, baseMax: 0.12 },
    { type: "mr_pierce", name: "Xuyên Kháng Phép", emoji: "🔮", baseMin: 0.06, baseMax: 0.12 },
    { type: "bleed", name: "Chảy Máu", emoji: "<:bleed:1521938497642958889>", baseMin: 0.05, baseMax: 0.10 },
    { type: "burn", name: "Thiêu Đốt", emoji: "<:burn:1521938494094835774>", baseMin: 0.05, baseMax: 0.10 },
    { type: "crit", name: "Bạo Kích", emoji: "💥", baseMin: 0.08, baseMax: 0.15 },
    { type: "double_hit", name: "Đòn Kép", emoji: "⚡", baseMin: 0.05, baseMax: 0.10 },
    { type: "stun", name: "Làm Choáng", emoji: "<:stun:1521938490605178910>", baseMin: 0.03, baseMax: 0.06 },
  ];

  const picked = PASSIVE_POOL[Math.floor(Math.random() * PASSIVE_POOL.length)];
  const rarityMultipliers = {
    Common: 1.0,
    Rare: 1.25,
    Epic: 1.6,
    Legendary: 2.1,
    Mythic: 2.7,
    Ancient: 3.4,
    Divine: 4.2,
  };
  const mult = rarityMultipliers[rarity] || 1.0;
  const qualityFactor = 0.85 + (Math.max(0, Math.min(105, quality)) / 100) * 0.3;
  const baseVal = picked.baseMin + Math.random() * (picked.baseMax - picked.baseMin);
  const finalValue = Math.round(baseVal * mult * qualityFactor * 1000) / 1000;
  const percentText = `${Math.round(finalValue * 100)}%`;

  return {
    type: picked.type,
    name: picked.name,
    emoji: picked.emoji,
    value: finalValue,
    description: `${picked.emoji} **${picked.name}**: +${percentText}`,
  };
}

const resolveShieldhexDefense = (target, damage, activeDungeon) => {
  const playerSubType = target.weapon?.subType
    ? target.weapon.subType.toLowerCase().replace(/\s+/g, "")
    : "";
  if (!playerSubType.includes("shieldhex")) return { damage, absorbed: 0, shouldReflect: false };

  if (!target.effects) target.effects = {};
  const absorbPct = Number(config.rpg?.balance?.pvp?.shieldhex_absorb_pct) || 0.15;
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
  const passiveProbeDamage = Math.max(100, damage || 0);
  const player = {
    weapon: participant?.weapon || { subType: cleanSubType, rarity: participant?.weapon?.rarity },
    stats: participant.effectiveStats || {},
    power: participant.gearPower || 0,
    hp: participant.hp || 0,
    maxHp: participant.maxHp || 0,
  };
  for (const key of Object.keys(participant || {})) {
    if (key.endsWith("Hits")) player[key] = participant[key];
  }
  const enemy = {
    armor: activeBoss.boss?.armor || 0,
    magicResist: activeBoss.boss?.magicResist || 0,
    name: activeBoss.boss?.name || "Boss",
  };

  const result = resolveWeaponPassive(player, enemy, {
    mode: "boss",
    rawDamage: passiveProbeDamage,
    isMagical: false,
  });

  passiveTriggers.push(...result.logs);

  for (const key of Object.keys(player)) {
    if (key.endsWith("Hits")) participant[key] = player[key];
  }

  return {
    blueStaffPierce: result.pierceFlags.blueStaff,
    crimsonDaggerPierce: result.pierceFlags.crimsonDagger,
    sunbowPierce: result.pierceFlags.sunbow,
    holySwordDouble: result.damage > passiveProbeDamage,
    damageMultiplier: result.damage / passiveProbeDamage,
    riverofbloodTriggered: result.healAmount > 0,
    controlTriggered: Boolean(enemy.freezeRounds > 0 || enemy.stunRounds > 0),
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
  rollRandomWeaponPassive,
};
