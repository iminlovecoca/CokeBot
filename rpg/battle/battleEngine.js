const {
  getEffectiveRpgStats,
  getWeaponPower,
  getEquippedItems,
  getRpgClass,
  getWeaponSetBonus,
  petAttackDamage,
  getPetAttackLog,
  calculateRpgPower,
} = require("../../utils/rpgUtil");
const config = require("../../data/config");
const {
  resolveWeaponPassive,
  resolveShieldhexDefense,
  applyStatusEffect,
  tickStatusEffects,
} = require("../../utils/rpgPassiveUtil");

const STATUS_FIELDS = [
  "poisonRounds",
  "bleedRounds",
  "burnRounds",
  "freezeRounds",
  "frostbiteRounds",
  "stunRounds",
  "breakRounds",
  "healBanRounds",
  "tauntRounds",
  "ccImmunityRounds",
];

const STATUS_VALUE_FIELDS = [
  "poisonDamage",
  "bleedDamage",
  "burnDamage",
  "frostbiteDamage",
];

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

      // Player weapon power must match the value used by the RPG sheet: base
      // power + upgrade + scaling. Battle bots already store their final
      // weapon power and use deliberately expanded stats, so keep their
      // legacy raw value to avoid applying the upgrade formula twice.
      const isBattleBot = Boolean(user?.isBattleBot || user?.userId?.startsWith?.("bot_pvp_"));
      const gearPower = weapon
        ? isBattleBot
          ? weapon.power || 0
          : getWeaponPower(weapon, stats)
        : 0;

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
      const classConfig = getRpgClass(classKey);

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
        pvpDefense: Math.min(0.15, classConfig?.bonuses?.pvpDefense || 0),
        critRateBonus: classConfig?.bonuses?.critRate || 0,
        // Anti-sustain is a short combat window, not a permanent class
        // advantage. Assassin pressure must be maintained through hits.
        classHealReduction: Math.min(0.35, classConfig?.bonuses?.healReduction || 0),
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
          healReduced: 0,
          healReducedRounds: 0,
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

    // Bot PvP catch-up: battle bots scale toward the challenger's power so
    // endgame players always meet a worthy opponent. Snapshot-only — the
    // database document is never modified here.
    const isBotUser = (user) => Boolean(user?.isBattleBot || user?.userId?.startsWith?.("bot_pvp_"));
    const applyBotCatchup = (botC, playerC, botUser, playerUser) => {
      const cfg = config.rpg?.balance?.pvp_bot_catchup || {};
      if (cfg.enabled === false) return;
      let botPower = 0;
      let playerPower = 0;
      try {
        botPower = Math.max(0, Math.floor(Number(calculateRpgPower(botUser)) || 0));
        playerPower = Math.max(0, Math.floor(Number(calculateRpgPower(playerUser)) || 0));
      } catch {
        return;
      }
      if (playerPower <= 0 || botPower >= playerPower) return;
      const ratioMin = Number(cfg.target_ratio_min) || 0.90;
      const ratioMax = Math.max(ratioMin, Number(cfg.target_ratio_max) || 1.05);
      const maxCatchup = Math.max(1, Number(cfg.max_catchup) || 3.0);
      const target = playerPower * (ratioMin + Math.random() * (ratioMax - ratioMin));
      const factor = Math.min(maxCatchup, Math.max(1, target / Math.max(1, botPower)));
      if (factor <= 1) return;
      const scaledStats = {};
      for (const [key, value] of Object.entries(botC.effectiveStats || {})) {
        scaledStats[key] = typeof value === "number"
          ? Math.min(999, Math.max(1, Math.floor(value * factor)))
          : value;
      }
      botC.effectiveStats = scaledStats;
      botC.gearPower = Math.floor((botC.gearPower || 0) * factor);
      botC.defensePower = Math.floor((botC.defensePower || 0) * factor);
      const BOT_CATCHUP_HP_MULT = {
        paladin: 1.45, warrior: 1.20, archer: 1.00,
        assassin: 0.95, mage: 0.90, wretch: 1.05,
      };
      const classHpMult = BOT_CATCHUP_HP_MULT[botC.classKey] || 1.0;
      const baseHp = 1200
        + (scaledStats.vigor || 10) * 45
        + (botC.level || 1) * 35
        + (botC.defensePower || 0) * 2;
      let maxHp = Math.floor(baseHp * classHpMult);
      if (botC.setBonus?.bonus?.maxHp) {
        maxHp += Math.floor(baseHp * botC.setBonus.bonus.maxHp);
      }
      if (botC.pet) {
        maxHp += Math.floor(baseHp * ((botC.pet.level || 1) * 0.005));
      }
      botC.maxHp = Math.floor(maxHp);
      botC.hp = Math.floor(maxHp);
      logs.push(`🤖 **${botC.name}** cảm nhận sức mạnh của **${playerC.name}** và bộc phát toàn lực! (x${factor.toFixed(2)})`);
    };
    const p1IsBot = isBotUser(user1);
    const p2IsBot = isBotUser(user2);
    if (p1IsBot && !p2IsBot) applyBotCatchup(p1, p2, user1, user2);
    else if (p2IsBot && !p1IsBot) applyBotCatchup(p2, p1, user2, user1);

    const snapshotEffects = (combatant) => {
      const effects = { ...combatant.effects };
      for (const field of STATUS_FIELDS) {
        if (combatant[field] > 0) effects[field] = combatant[field];
      }
      return effects;
    };

    const saveState = (currentTurn) => {
      history.push({
        turn: currentTurn,
        p1: {
          hp: Math.max(0, p1.hp),
          rage: p1.rage,
          effects: snapshotEffects(p1),
        },
        p2: {
          hp: Math.max(0, p2.hp),
          rage: p2.rage,
          effects: snapshotEffects(p2),
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

      // Resolve shared status effects before the actor spends a turn. This
      // keeps weapon CC/DoT behavior consistent with Dungeon and prevents a
      // passive from becoming log-only in PvP.
      const statusResult = tickStatusEffects(attacker, null);
      if (statusResult.logs.length > 0) logs.push(...statusResult.logs);
      if (attacker.healBanRounds > 0) attacker.healBanRounds -= 1;
      if (statusResult.skipTurn) {
        saveState(turn);
        turnOrder = [defender, attacker];
        turn += 1;
        continue;
      }
      if (attacker.hp <= 0) break;

      // Handle Heal Reduction countdown
      if (attacker.effects.healReducedRounds > 0) {
        attacker.effects.healReducedRounds -= 1;
        if (attacker.effects.healReducedRounds <= 0) {
          attacker.effects.healReduced = 0;
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
            // Use the shared root status fields so Archer's anti-tank pressure
            // is actually processed by tickStatusEffects in the next turns.
            const bleedDamage = Math.min(
              Math.floor(defender.maxHp * 0.06),
              Math.max(
                Math.floor(defender.maxHp * 0.04),
                Math.floor((attacker.effectiveStats.dex || 10) * 8)
              )
            );
            applyStatusEffect(defender, "bleed", 2, { damage: bleedDamage });
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
          const healReduction = Math.min(
            0.55,
            Math.max(
              attacker.healBanRounds > 0 ? 0.30 : 0,
              Number(attacker.effects.healReduced) || 0
            )
          );
          const healReduceFactor = 1 - healReduction;
          const finalHealAmt = Math.floor(healAmt * healReduceFactor);
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + finalHealAmt);
        } else if (classKey === "wretch") {
          skillName = "Cú Đập May Rủi";
          skillMult = 0.85 + Math.random() * 0.75;
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
        0.25,
        Math.min(
          0.20,
          ((defender.effectiveStats.dex || 0) * 0.08 + (defender.effectiveStats.arc || 0) * 0.04) / 100
        ) + (defender.setBonus?.bonus?.evasion || 0)
      );
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
            0.65,
            0.05 + ((attacker.effectiveStats.arc || 0) * 0.15 + (attacker.effectiveStats.dex || 0) * 0.1) / 100 + attacker.critRateBonus + (attacker.setBonus?.bonus?.critRate || 0)
          );
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
        const baseArmor = (defender.effectiveStats.pr || 10) * 10 + defender.defensePower * 1.5;
        const baseMagicResist = (defender.effectiveStats.mr || 10) * 10 + defender.defensePower * 1.5;
        const passiveEnemy = {
          armor: baseArmor * (1 - (defender.effects.armorReduced || 0)),
          magicResist: baseMagicResist,
          name: defender.name,
          _armorReduced: defender.effects.armorReduced || 0,
        };
        for (const field of STATUS_FIELDS) passiveEnemy[field] = defender[field] || 0;
        for (const field of STATUS_VALUE_FIELDS) passiveEnemy[field] = defender[field] || 0;
        const passiveResult = resolveWeaponPassive(passivePlayer, passiveEnemy, {
          mode: "pvp",
          rawDamage,
          isMagical,
          isSecondHit: false,
          isSkill: isCastingSkill,
        });

        rawDamage = passiveResult.damage;

        defender.effects.armorReduced = passiveEnemy._armorReduced || defender.effects.armorReduced || 0;
        for (const field of STATUS_FIELDS) defender[field] = passiveEnemy[field] || 0;
        for (const field of STATUS_VALUE_FIELDS) defender[field] = passiveEnemy[field] || 0;

        // Sync hit counters back
        if (passivePlayer._clawhexHits !== undefined) attacker._clawhexHits = passivePlayer._clawhexHits;
        if (passivePlayer._holyswordHits !== undefined) attacker.holySwordHits = passivePlayer._holyswordHits;

        // Apply next attack mult from passive
        if (passiveResult.nextAttackMult > 1.0) {
          attacker.nextAttackMult = passiveResult.nextAttackMult;
        }

        // Apply heal from passive (lifesteal / green staff)
        if (passiveResult.healAmount > 0) {
          const healReduction = Math.min(
            0.55,
            Math.max(
              attacker.healBanRounds > 0 ? 0.30 : 0,
              Number(attacker.effects.healReduced) || 0
            )
          );
          const healReduceFactor = 1 - healReduction;
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
          let mr = passiveResult.mrOrArmor;
          if (skillIgnoreMR) mr *= 0.60;
          defenderMitigation = mr / (mr + 150 + defender.level * 2);
        } else {
          let armor = passiveResult.mrOrArmor;
          if (defender.effects.armorBoostedRounds > 0) {
            armor *= 1 + (defender.effects.armorBoosted || 0);
          }
          defenderMitigation = armor / (armor + 150 + defender.level * 2);
        }

        // PvP needs a bounded damage floor. Gear-heavy tank builds should
        // still outlast burst, but 97-98% mitigation made every matchup a
        // draw and erased the value of bleed, anti-heal, and mage pressure.
        defenderMitigation = Math.min(0.96, defenderMitigation);
        if (skillIgnoreMR) {
          // Mage's burst is a timed anti-tank window. It bypasses the global
          // mitigation ceiling only while the skill is being cast.
          defenderMitigation = Math.min(0.85, defenderMitigation);
        }

        // Apply Class Counter (+2% bonus damage)
        let counterMult = 1.0;
        if (CLASS_COUNTERS[attacker.classKey] === defender.classKey) {
          counterMult = 1.02;
        }

        let finalMult = (1 - defenderMitigation) * counterMult;
        finalMult *= 1 - (defender.pvpDefense || 0);
        if (poisonMult > 1.0) finalMult *= poisonMult;
        if (attacker.setBonus?.bonus?.pvpDamage) finalMult *= 1 + attacker.setBonus.bonus.pvpDamage;

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

        // Assassin is a sustain counter only while it keeps connecting. The
        // stronger reduction wins, but reductions do not stack into a hard
        // heal lock when combined with a weapon passive.
        if (attacker.classHealReduction > 0 && defender.hp > 0) {
          defender.effects.healReduced = Math.max(
            Number(defender.effects.healReduced) || 0,
            attacker.classHealReduction
          );
          // The countdown is consumed at the start of the target's turns;
          // three ticks preserve two full target actions after this hit.
          defender.effects.healReducedRounds = Math.max(
            defender.effects.healReducedRounds || 0,
            3
          );
        }

        let logMsg = "";
        if (isCastingSkill) {
          logMsg = `Lượt ${turn}: **${attacker.name}** dùng kỹ năng [${skillName}] gây **${damage.toLocaleString()}** sát thương`;
          if (isCrit) logMsg += " (Chí mạng!)";
          if (attacker.classKey === "warrior") logMsg += " và tăng 25% Giáp";
          if (attacker.classKey === "archer" && defender.bleedRounds > 0) logMsg += " và gây Chảy máu";
          if (attacker.classKey === "paladin") logMsg += " và hồi máu";
        } else {
          logMsg = `Lượt ${turn}: **${attacker.name}** tấn công thường gây **${damage.toLocaleString()}** sát thương`;
          if (isCrit) logMsg += " (Chí mạng!)";
        }
        if (attacker.classHealReduction > 0 && defender.hp > 0) {
          logMsg += ` và <:healreduction:1523340558855045190> áp chế ${Math.round(attacker.classHealReduction * 100)}% hồi máu`;
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
