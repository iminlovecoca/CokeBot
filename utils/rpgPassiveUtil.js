const config = require("../data/config");

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

const getActiveStatusString = (target) => {
  if (!target) return "";
  const parts = [];
  
  if (target.poisonRounds && target.poisonRounds > 0) {
    parts.push(`${EMOJIS.poisonous}(${target.poisonRounds}L)`);
  }
  if (target.bleedRounds && target.bleedRounds > 0) {
    parts.push(`${EMOJIS.bleed}(${target.bleedRounds}L)`);
  }
  if (target.burnRounds && target.burnRounds > 0) {
    parts.push(`${EMOJIS.burn}(${target.burnRounds}L)`);
  }
  if (target.freezeRounds && target.freezeRounds > 0) {
    parts.push(`${EMOJIS.freeze}(${target.freezeRounds}L)`);
  }
  if (target.frostbiteRounds && target.frostbiteRounds > 0) {
    parts.push(`${EMOJIS.frostbite}(${target.frostbiteRounds}L)`);
  }
  if (target.stunRounds && target.stunRounds > 0) {
    parts.push(`${EMOJIS.stun}(${target.stunRounds}L)`);
  }
  if (target.breakRounds && target.breakRounds > 0) {
    parts.push(`${EMOJIS.break}(${target.breakRounds}L)`);
  }
  if (target.healBanRounds && target.healBanRounds > 0) {
    parts.push(`${EMOJIS.healreduction}(${target.healBanRounds}L)`);
  }
  if (target.tauntRounds && target.tauntRounds > 0) {
    parts.push(`${EMOJIS.taunt}(${target.tauntRounds}L)`);
  }
  if (target.atkUp) {
    parts.push(EMOJIS.atkup);
  }
  if (target.atkDown) {
    parts.push(EMOJIS.atkdown);
  }
  
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
    
    if (target.breakRounds && target.breakRounds > 0) {
      target.breakRounds -= 1;
    }
    
    return { skipTurn: true, logs };
  }
  
  if (target.breakRounds && target.breakRounds > 0) {
    target.breakRounds -= 1;
  }
  
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
    if (target.freezeRounds && target.freezeRounds > 0) {
      dmg *= 2;
    }
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
    activeDungeon.totalDamageTaken = (activeDungeon.totalDamageTaken || 0) + actualDmg;
    
    if (target.hp <= 0) {
      logs.push(`💀 **${target.name}** đã tử nạn do sát thương DoT duy trì!`);
    }
  }
  
  return { skipTurn: false, logs };
};

const triggerWeaponPassiveOnAttack = (player, enemy, activeDungeon, rawDamage, isMagical, isSecondHit, multiplier, isSkill) => {
  const pWeaponSubType = player.weapon?.subType ? player.weapon.subType.toLowerCase().replace(/\s+/g, "") : "";
  const hasWeaponTriggered = Math.random() < 0.45;
  const logs = [];
  let finalDamage = rawDamage;
  let doubleHitTriggered = false;
  
  
  if (pWeaponSubType === "clawhex" && hasWeaponTriggered) {
    applyStatusEffect(enemy, "bleed", 3, {
      damage: Math.floor(player.stats.str * 0.5 + player.stats.dex * 0.5)
    });
    enemy.clawhexBleed = true;
    finalDamage *= 1.15;
    logs.push(`🛡️ **[Clawhex]** Gây sát thương chảy máu lên mục tiêu và tăng thêm 15% sát thương!`);
  } else if (enemy.bleedRounds && enemy.bleedRounds > 0 && enemy.clawhexBleed) {
    finalDamage *= 1.15;
  }
  
  
  if (pWeaponSubType === "axesnake" && hasWeaponTriggered) {
    enemy.armor = Math.max(0, Math.floor(enemy.armor * 0.90));
    enemy.magicResist = Math.max(0, Math.floor(enemy.magicResist * 0.90));
    logs.push(`🐍 **[Axesnake]** Phá hủy 10% giáp vật lý và phép của đối thủ! Giáp còn: ${enemy.armor.toLocaleString()} PR / ${enemy.magicResist.toLocaleString()} MR.`);
  }
  
  
  let mrOrArmor = isMagical ? enemy.magicResist : enemy.armor;
  
  if (isMagical && pWeaponSubType === "bluestaff" && hasWeaponTriggered) {
    mrOrArmor = Math.floor(mrOrArmor * 0.75); 
    if (Math.random() < 0.25) {
      applyStatusEffect(enemy, "freeze", 1);
      logs.push(`❄️ **[Blue Staff]** Giải phóng băng hàn làm đóng băng **${enemy.name}**!`);
    }
  }
  if (!isMagical && pWeaponSubType === "crimsondagger" && hasWeaponTriggered) {
    mrOrArmor = Math.floor(mrOrArmor * 0.50); 
  }
  if (!isMagical && pWeaponSubType === "spearhex" && hasWeaponTriggered) {
    mrOrArmor = Math.floor(mrOrArmor * 0.90);
  }
  if (pWeaponSubType === "sunbow" && hasWeaponTriggered) {
    mrOrArmor = Math.floor(mrOrArmor * 0.90);
  }
  
  
  if (pWeaponSubType === "firesword" && hasWeaponTriggered) {
    applyStatusEffect(enemy, "burn", 2, {
      damage: Math.floor(player.stats.str * 0.4 + player.stats.dex * 0.4)
    });
    applyStatusEffect(enemy, "heal_ban", 2);
    logs.push(`🔥 **[Fire Sword]** Đòn chém rực lửa gây Thiêu Đốt và Giảm Hồi Máu lên đối thủ!`);
  }
  
  
  if (pWeaponSubType === "gravitybow" && hasWeaponTriggered) {
    applyStatusEffect(enemy, "stun", 1);
    logs.push(`⚡ **[Gravity Bow]** Bắn ra mũi tên trọng lực làm choáng **${enemy.name}** trong 1 lượt!`);
  }
  
  
  if (pWeaponSubType === "duskanddawn" && !isSecondHit && enemy.hp > 0) {
    if (Math.random() < 0.30) {
      doubleHitTriggered = true;
    }
  }
  
  return {
    damage: finalDamage,
    mrOrArmor,
    doubleHitTriggered,
    logs
  };
};

const triggerWorldBossPassive = (cleanSubType, participant, activeBoss, passiveTriggers, damage) => {
  let blueStaffPierce = false;
  let crimsonDaggerPierce = false;
  let holySwordDouble = false;
  let riverofbloodTriggered = false;

  if (cleanSubType === "riverofblood") {
    riverofbloodTriggered = true;
    passiveTriggers.push(`⚔️ **[River of Blood]** Chém hồi máu bằng 5% sát thương gây ra.`);
  } else if (cleanSubType === "shadowdagger") {
    activeBoss.effects.armorReduced = 0.30;
    passiveTriggers.push(`⚔️ **[Shadow Dagger]** Đã phá giáp boss! Phòng ngự vật lý của boss giảm 30% cho đến hết trận đấu.`);
  } else if (cleanSubType === "poisondagger") {
    participant.nextAttackMult = 1.5;
    passiveTriggers.push(`⚔️ **[Poison Dagger]** Sát khí hội tụ! Đòn đánh tiếp theo của bạn sẽ gây thêm 50% sát thương.`);
  } else if (cleanSubType === "firesword") {
    activeBoss.effects.healReduced = true;
    activeBoss.effects.healReducedUntil = Date.now() + 30 * 1000;
    passiveTriggers.push(`⚔️ **[Fire Sword]** Thiêu đốt boss! Giảm 30% hồi máu của boss trong 30 giây.`);
  } else if (cleanSubType === "bluestaff") {
    blueStaffPierce = true;
    passiveTriggers.push(`⚔️ **[Blue Staff]** Đòn đánh xuyên 50% kháng phép của boss.`);
  } else if (cleanSubType === "crimsondagger") {
    crimsonDaggerPierce = true;
    passiveTriggers.push(`⚔️ **[Crimson Dagger]** Đòn đánh xuyên 50% phòng ngự vật lý của boss.`);
  } else if (cleanSubType === "holysword") {
    participant.holySwordHits = (participant.holySwordHits || 0) + 1;
    if (participant.holySwordHits >= 3) {
      participant.holySwordHits = 0;
      holySwordDouble = true;
      passiveTriggers.push(`⚔️ **[Holy Sword]** Đòn đánh thứ 3 được ban phước! Gây gấp đôi sát thương.`);
    }
  } else if (cleanSubType === "darksword") {
    participant.bossDamageReduced = true;
    passiveTriggers.push(`⚔️ **[Dark Sword]** Yếu khí bao phủ! Boss bị giảm 30% sát thương gây ra lên bạn lượt này.`);
  } else if (cleanSubType === "darkstaff") {
    const effects = ["burn", "weakness", "pierce"];
    const chosenEffect = effects[Math.floor(Math.random() * effects.length)];
    if (chosenEffect === "burn") {
      activeBoss.effects.healReduced = true;
      activeBoss.effects.healReducedUntil = Date.now() + 30 * 1000;
      passiveTriggers.push(`⚔️ **[Dark Staff]** Hắc ám thiêu đốt! Giảm 30% hồi máu của boss trong 30 giây.`);
    } else if (chosenEffect === "weakness") {
      activeBoss.effects.armorReduced = 0.30;
      passiveTriggers.push(`⚔️ **[Dark Staff]** Hắc ám phá giáp! Phòng ngự vật lý của boss giảm 30% cho đến hết trận đấu.`);
    } else if (chosenEffect === "pierce") {
      blueStaffPierce = true;
      passiveTriggers.push(`⚔️ **[Dark Staff]** Hắc ám thấu xương! Đòn đánh xuyên 50% kháng phép của boss.`);
    }
  }

  return {
    blueStaffPierce,
    crimsonDaggerPierce,
    holySwordDouble,
    riverofbloodTriggered
  };
};

module.exports = {
  EMOJIS,
  getActiveStatusString,
  applyStatusEffect,
  tickStatusEffects,
  triggerWeaponPassiveOnAttack,
  triggerWorldBossPassive,
};
