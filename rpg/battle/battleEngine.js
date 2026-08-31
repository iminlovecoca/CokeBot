const {
  getEffectiveRpgStats,
  getWeaponPower,
  getEquippedItems,
  getWeaponSetBonus,
  petAttackDamage,
  getPetAttackLog,
} = require("../../utils/rpgUtil");
const {
  resolveWeaponPassive,
  resolveShieldhexDefense,
} = require("../../utils/rpgPassiveUtil");

const CLASS_COUNTERS = {
  warrior: "archer",
  archer: "paladin",
  paladin: "assassin",
  assassin: "mage",
  mage: "warrior",
};

const CLASS_ATTACK_TYPES = {
  warrior: "physical",
  archer: "physical",
  mage: "magical",
  assassin: "physical",
  paladin: "physical",
  wretch: "physical",
};

/**
 * Combat Simulator Engine for PvP RPG Battles.
 */
class BattleEngine {
  /**
   * Run a full turn-based battle simulation between Player 1 and Player 2.
   *
   * @param {Object} user1 - Mongoose User document for Player 1
   * @param {Object} user2 - Mongoose User document for Player 2
   * @param {Object} [options={}] - Options { maxTurns: 30 }
   * @returns {Object} Simulation Result { turns, isDraw, winner, loser, logs, history, p1, p2 }
   */
  static simulateBattle(user1, user2, options = {}) {
    const maxTurns = options.maxTurns || 30;

    const buildCombatant = (user) => {
      const stats = getEffectiveRpgStats(user);
      const equipped = getEquippedItems(user);
      const weapon = equipped.weapon || null;

      // Defense power from gear
      let defensePower = 0;
      if (equipped.armor) defensePower += equipped.armor.power || 0;
      if (equipped.helmet) defensePower += equipped.helmet.power || 0;
      if (equipped.boots) defensePower += equipped.boots.power || 0;

      let gearPower = weapon ? weapon.power || 0 : 0;

      // Scaled base HP (ensures fights last at least 4-15 turns)
      const baseHp = 1200 + (stats.vigor || 10) * 45 + (user.rpg.level || 1) * 35 + defensePower * 2;
      let maxHp = baseHp;

      // Weapon set bonus (character-weapon synergy)
      const setBonus = getWeaponSetBonus(user);
      if (setBonus?.bonus?.maxHp) {
        maxHp += Math.floor(baseHp * setBonus.bonus.maxHp);
      }

      // Pet bonuses
      const pet = user.rpg.equippedPet;
      if (pet) {
        const petLvl = pet.level || 1;
        const hpBonusPct = petLvl * 0.005;
        maxHp += Math.floor(baseHp * hpBonusPct);
      }

      const classKey = (user.rpg.classKey || "warrior").toLowerCase();

      // Class HP Multiplier (Paladin is frontline Tank with highest HP pool)
      const CLASS_HP_MULTIPLIERS = {
        paladin: 1.45,  // +45% Max HP (Tank / Guardian)
        warrior: 1.20,  // +20% Max HP (Bruiser / Fighter)
        archer: 1.00,   // Standard (Ranger)
        assassin: 0.95, // Glass Cannon (Stealth Burst)
        mage: 0.90,     // Glass Cannon (Spell Caster)
        wretch: 1.05    // Balanced
      };
      const classHpMult = CLASS_HP_MULTIPLIERS[classKey] || 1.0;
      maxHp = Math.floor(maxHp * classHpMult);

      return {
        id: user.userId,
        name: user.rpg.name || `Player #${user.userId.slice(-4)}`,
        level: user.rpg.level || 1,
        classKey,
        effectiveStats: stats,
        equipped,
        weapon,
        pet,
        gearPower,
        defensePower,
        setBonus,
        maxHp: Math.floor(maxHp),
        hp: Math.floor(maxHp),
        rage: 0,
        effects: {
          armorReduced: 0,
          healReduced: false,
          healReducedRounds: 0,
          bleedRounds: 0,
          bleedDamage: 0,
          shieldhexAbsorbed: 0,
          shieldhexRounds: 0,
          armorBoosted: 0,
          armorBoostedRounds: 0,
        },
        dbUser: user,
      };
    };

    const p1 = buildCombatant(user1);
    const p2 = buildCombatant(user2);

    const logs = [];
    const history = [];

    const saveState = (currentTurn) => {
      history.push({
        turn: currentTurn,
        p1: {
          hp: Math.max(0, p1.hp),
          rage: p1.rage,
          effects: { ...p1.effects },
        },
        p2: {
          hp: Math.max(0, p2.hp),
          rage: p2.rage,
          effects: { ...p2.effects },
        },
      });
    };
    const recordState = saveState;

    recordState(0);

    // Speed / Turn Order determination based on DEX
    let turnOrder =
      (p1.effectiveStats.dex || 0) > (p2.effectiveStats.dex || 0)
        ? [p1, p2]
        : (p1.effectiveStats.dex || 0) < (p2.effectiveStats.dex || 0)
        ? [p2, p1]
        : Math.random() < 0.5
        ? [p1, p2]
        : [p2, p1];

    let turn = 1;

    // Check Class Counter (+2% damage bonus for counter matchup)
    if (CLASS_COUNTERS[p1.classKey] === p2.classKey) {
      logs.push(`⚔️ **${p1.name}** (${p1.classKey.toUpperCase()}) có lợi thế khắc chế **${p2.name}** (${p2.classKey.toUpperCase()}) (+2% Sát thương)!`);
    } else if (CLASS_COUNTERS[p2.classKey] === p1.classKey) {
      logs.push(`⚔️ **${p2.name}** (${p2.classKey.toUpperCase()}) có lợi thế khắc chế **${p1.name}** (${p1.classKey.toUpperCase()}) (+2% Sát thương)!`);
    }

    while (turn <= maxTurns && p1.hp > 0 && p2.hp > 0) {
      const attacker = turnOrder[0];
      const defender = turnOrder[1];

      // Handle Bleed
      if (attacker.effects.bleedRounds > 0) {
        attacker.hp = Math.max(0, attacker.hp - attacker.effects.bleedDamage);
        attacker.effects.bleedRounds -= 1;
        logs.push(`<:bleed:1521938497642958889> **${attacker.name}** bị mất **${attacker.effects.bleedDamage.toLocaleString()}** HP do chảy máu!`);
        if (attacker.hp <= 0) break;
      }

      // Handle Heal Reduction countdown
      if (attacker.effects.healReducedRounds > 0) {
        attacker.effects.healReducedRounds -= 1;
        if (attacker.effects.healReducedRounds <= 0) {
          attacker.effects.healReduced = false;
        }
      }

      // Handle Armor Boost countdown
      if (attacker.effects.armorBoostedRounds > 0) {
        attacker.effects.armorBoostedRounds -= 1;
        if (attacker.effects.armorBoostedRounds <= 0) {
          attacker.effects.armorBoosted = 0;
        }
      }

      // Skill check
      const isCastingSkill = attacker.rage >= 100;
      let skillName = "";
      let skillMult = 1.0;
      let skillIgnoreMR = false;
      let skillForceCrit = false;

      if (isCastingSkill) {
        attacker.rage = 0;
        const classKey = attacker.classKey;
        if (classKey === "warrior") {
          skillName = "Đòn Đánh Cuồng Nộ";
          skillMult = 1.45;
          attacker.effects.armorBoosted = 0.25;
          attacker.effects.armorBoostedRounds = 2;
        } else if (classKey === "archer") {
          skillName = "Mưa Tên";
          skillMult = 1.35;
          if (Math.random() < 0.6) {
            defender.effects.bleedRounds = 2;
            defender.effects.bleedDamage = Math.floor((attacker.effectiveStats.dex || 10) * 8);
          }
        } else if (classKey === "mage") {
          skillName = "Bão Phép Thuật";
          skillMult = 1.65;
          skillIgnoreMR = true;
        } else if (classKey === "assassin") {
          skillName = "Ám Sát";
          skillMult = 1.4;
          skillForceCrit = true;
        } else if (classKey === "paladin") {
          skillName = "Thánh Lực Bảo Hộ";
          skillMult = 1.1;
          const healAmt = Math.floor(attacker.maxHp * 0.15);
          let healReduceFactor = attacker.effects.healReduced ? 0.7 : 1.0;
          const finalHealAmt = Math.floor(healAmt * healReduceFactor);
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + finalHealAmt);
        } else if (classKey === "wretch") {
          skillName = "Cú Đập May Rủi";
          skillMult = 0.6 + Math.random() * 1.6;
        }
      }

      // Shieldhex Reflect (pre-attack)
      const atkSubForShield = attacker.weapon?.subType
        ? attacker.weapon.subType.toLowerCase().replace(/\s+/g, "")
        : "";
      if (atkSubForShield.includes("shieldhex") && attacker.effects.shieldhexRounds >= 3) {
        const reflectDmg = Math.floor((attacker.effects.shieldhexAbsorbed || 0) * 0.75);
        defender.hp = Math.max(0, defender.hp - reflectDmg);
        attacker.effects.shieldhexAbsorbed = 0;
        attacker.effects.shieldhexRounds = 0;
        logs.push(`🛡️ **${attacker.name}** phản lại **${reflectDmg.toLocaleString()}** sát thương phản đòn lên **${defender.name}**!`);
        if (defender.hp <= 0) break;
      }

      // Evasion calculation
      const defenderEvasion = Math.min(
        0.20,
        ((defender.effectiveStats.dex || 0) * 0.08 + (defender.effectiveStats.arc || 0) * 0.04) / 100
      ) + (defender.setBonus?.bonus?.evasion || 0);
      const isEvaded = Math.random() < defenderEvasion;

      // Unified Weapon Passive Resolution
      let poisonMult = 1.0;

      if (attacker.nextAttackMult) {
        poisonMult = attacker.nextAttackMult;
        delete attacker.nextAttackMult;
      }

      if (isEvaded) {
        if (isCastingSkill) {
          logs.push(`Lượt ${turn}: **${attacker.name}** dùng kỹ năng [${skillName}] nhưng bị **${defender.name}** né mất!`);
        } else {
          logs.push(`Lượt ${turn}: **${attacker.name}** tấn công nhưng bị **${defender.name}** né mất!`);
        }
      } else {
        // Critical hit check
        let isCrit = false;
        if (skillForceCrit) {
          isCrit = true;
        } else {
          const attackerCritRate = Math.min(
            0.55,
            0.05 + ((attacker.effectiveStats.arc || 0) * 0.15 + (attacker.effectiveStats.dex || 0) * 0.1) / 100
          ) + (attacker.setBonus?.bonus?.critRate || 0);
          isCrit = Math.random() < attackerCritRate;
        }
        const critMult = 1.5 + (attacker.effectiveStats.dex || 0) * 0.002;

        // Base ATK
        const isMagical = CLASS_ATTACK_TYPES[attacker.classKey] === "magical";
        const baseAtk = isMagical
          ? (attacker.effectiveStats.int || 10) * 12 + (attacker.effectiveStats.arc || 10) * 6 + attacker.gearPower * 2.5 + attacker.level * 5
          : (attacker.effectiveStats.str || 10) * 12 + (attacker.effectiveStats.dex || 10) * 6 + attacker.gearPower * 2.5 + attacker.level * 5;

        let rawDamage = baseAtk;
        rawDamage *= 0.88 + Math.random() * 0.24;
        if (isCastingSkill) rawDamage *= skillMult;
        if (isCrit) rawDamage *= critMult;

        // Resolve weapon passive for this attack
        const passivePlayer = {
          weapon: attacker.weapon,
          stats: attacker.effectiveStats,
          power: attacker.gearPower,
          hp: attacker.hp,
          maxHp: attacker.maxHp,
          _clawhexHits: attacker._clawhexHits || 0,
          _holyswordHits: attacker.holySwordHits || 0,
        };
        const passiveEnemy = {
          armor: defender.defensePower || 0,
          magicResist: 0,
          name: defender.name,
          _armorReduced: defender.effects.armorReduced || 0,
        };
        const passiveResult = resolveWeaponPassive(passivePlayer, passiveEnemy, {
          mode: "pvp",
          rawDamage,
          isMagical,
          isSecondHit: false,
          isSkill: isCastingSkill,
        });

        rawDamage = passiveResult.damage;

        // Sync hit counters back
        if (passivePlayer._clawhexHits !== undefined) attacker._clawhexHits = passivePlayer._clawhexHits;
        if (passivePlayer._holyswordHits !== undefined) attacker.holySwordHits = passivePlayer._holyswordHits;

        // Apply bleed from passive
        if (passiveResult.bleedDamage > 0) {
          defender.effects.bleedRounds = 3;
          defender.effects.bleedDamage = passiveResult.bleedDamage;
        }

        // Apply next attack mult from passive
        if (passiveResult.nextAttackMult > 1.0) {
          attacker.nextAttackMult = passiveResult.nextAttackMult;
        }

        // Apply heal from passive (lifesteal / green staff)
        if (passiveResult.healAmount > 0) {
          let healReduceFactor = attacker.effects.healReduced ? 0.7 : 1.0;
          const finalHealAmt = Math.floor(passiveResult.healAmount * healReduceFactor);
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + finalHealAmt);
          logs.push(`✨ **${attacker.name}** hồi **${finalHealAmt.toLocaleString()}** HP từ hiệu ứng vũ khí!`);
        }

        // Log weapon passive triggers
        if (passiveResult.logs.length > 0) {
          for (const logMsg of passiveResult.logs) {
            if (logMsg) logs.push(logMsg);
          }
        }

        // Defense Mitigation Calculation
        let defenderMitigation = 0;
        if (isMagical) {
          let mr = (defender.effectiveStats.mr || 10) * 10 + defender.defensePower * 1.5;
          if (skillIgnoreMR) mr *= 0.60;
          defenderMitigation = mr / (mr + 150 + defender.level * 2);
        } else {
          let armor = (defender.effectiveStats.pr || 10) * 10 + defender.defensePower * 1.5;
          if (defender.effects.armorBoostedRounds > 0) {
            armor *= 1 + (defender.effects.armorBoosted || 0);
          }
          // Apply armor shred from passive (axesnake, shadowdagger, etc.)
          if (passiveEnemy._armorReduced > 0) {
            armor *= 1 - passiveEnemy._armorReduced;
          } else if (defender.effects.armorReduced) {
            armor *= 1 - defender.effects.armorReduced;
          }
          defenderMitigation = armor / (armor + 150 + defender.level * 2);
        }

        // Apply Class Counter (+2% bonus damage)
        let counterMult = 1.0;
        if (CLASS_COUNTERS[attacker.classKey] === defender.classKey) {
          counterMult = 1.02;
        }

        let finalMult = (1 - defenderMitigation) * counterMult;
        if (poisonMult > 1.0) finalMult *= poisonMult;
        if (attacker.setBonus?.bonus?.pvpDamage) finalMult *= 1 + attacker.setBonus.bonus.pvpDamage;
        if (attacker.setBonus?.bonus?.bossDamage) finalMult *= 1 + attacker.setBonus.bonus.bossDamage;

        if (attacker.effects.damageReduced) {
          finalMult *= 1 - attacker.effects.damageReduced;
          delete attacker.effects.damageReduced;
        }

        let damage = Math.max(25, Math.floor(rawDamage * finalMult));

        // Shieldhex Absorption (defense side)
        const shieldResult = resolveShieldhexDefense(defender, damage);
        damage = shieldResult.damage;
        if (shieldResult.absorbed > 0) {
          logs.push(`🛡️ **${defender.name}** hấp thụ **${shieldResult.absorbed.toLocaleString()}** sát thương từ Shieldhex!`);
        }

        defender.hp = Math.max(0, defender.hp - damage);
        defender.rage = Math.min(100, defender.rage + 15);

        let logMsg = "";
        if (isCastingSkill) {
          logMsg = `Lượt ${turn}: **${attacker.name}** dùng kỹ năng [${skillName}] gây **${damage.toLocaleString()}** sát thương`;
          if (isCrit) logMsg += " (Chí mạng!)";
          if (attacker.classKey === "warrior") logMsg += " và tăng 25% Giáp";
          if (attacker.classKey === "archer" && defender.effects.bleedRounds > 0) logMsg += " và gây Chảy máu";
          if (attacker.classKey === "paladin") logMsg += " và hồi máu";
        } else {
          logMsg = `Lượt ${turn}: **${attacker.name}** tấn công thường gây **${damage.toLocaleString()}** sát thương`;
          if (isCrit) logMsg += " (Chí mạng!)";
        }
        logs.push(logMsg + "!");
      }

      if (!isCastingSkill) {
        attacker.rage = Math.min(100, attacker.rage + 35);
      }

      saveState(turn);

      // Pet tham chiến: pet của attacker tấn công defender mỗi lượt
      if (attacker.pet && defender.hp > 0) {
        const petDmg = petAttackDamage(attacker.pet, "pvp");
        if (petDmg > 0) {
          defender.hp = Math.max(0, defender.hp - petDmg);
          logs.push(getPetAttackLog(attacker.pet, "pvp", petDmg));
        }
      }

      if (defender.hp <= 0) {
        break;
      }

      // Switch turn
      turnOrder = [defender, attacker];
      turn += 1;
    }

    const lastState = history[history.length - 1];
    if (!lastState || lastState.turn !== (turn - 1)) {
      saveState(turn - 1);
    }

    let winner = null;
    let loser = null;
    let isDraw = false;

    if (p1.hp <= 0) {
      winner = p2;
      loser = p1;
    } else if (p2.hp <= 0) {
      winner = p1;
      loser = p2;
    } else {
      isDraw = true;
    }

    const totalTurns = (p1.hp <= 0 || p2.hp <= 0) ? turn : (turn - 1);

    return {
      turns: totalTurns,
      isDraw,
      winner,
      loser,
      p1,
      p2,
      logs,
      history,
    };
  }
}

module.exports = BattleEngine;
