const { getEffectiveRpgStats, getWeaponPower, getEquippedItems } = require("../../utils/rpgUtil");

/**
 * Pure Battle Simulator Engine for PvP RPG Battles.
 */
class BattleEngine {
  /**
   * Run a full turn-based battle simulation between Player 1 and Player 2.
   *
   * @param {Object} user1 - Mongoose User document for Player 1
   * @param {Object} user2 - Mongoose User document for Player 2
   * @param {Object} [options={}] - Options { maxTurns: 30 }
   * @returns {Object} Simulation Result { turns, isDraw, winner, loser, logs, history }
   */
  static simulateBattle(user1, user2, options = {}) {
    const maxTurns = options.maxTurns || 30;

    const buildCombatant = (user) => {
      const stats = getEffectiveRpgStats(user);
      const equipped = getEquippedItems(user);
      const weapon = equipped.weapon || null;

      const baseHp = (stats.vigor || 10) * 20 + (user.rpg.level || 1) * 15 + 150;
      let hp = baseHp;
      let atk = (stats.str || 5) * 4 + (stats.dex || 5) * 2 + (user.rpg.level || 1) * 3;
      let def = (stats.pr || 5) * 3 + (stats.mr || 5) * 2 + (user.rpg.level || 1) * 2;

      // Add Pet Stat Bonuses (% HP, % ATK, % DEF) if pet is equipped
      const pet = user.rpg.equippedPet;
      if (pet) {
        const petLvl = pet.level || 1;
        const hpBonusPct = petLvl * 0.005;
        const atkBonusPct = petLvl * 0.004;
        const defBonusPct = petLvl * 0.0035;

        hp += Math.floor(baseHp * hpBonusPct);
        atk += Math.floor(atk * atkBonusPct);
        def += Math.floor(def * defBonusPct);
      }

      let weaponPower = 0;
      if (weapon) {
        weaponPower = getWeaponPower(weapon, stats);
        atk += Math.floor(weaponPower * 0.25);
      }

      const critRate = Math.min(0.75, 0.05 + (stats.critRate || 0) + (stats.arc || 0) * 0.002);

      return {
        id: user.userId,
        name: user.rpg.name || "Warrior",
        level: user.rpg.level || 1,
        rpgClass: user.rpg.classKey || "warrior",
        stats,
        weapon,
        pet,
        maxHp: Math.floor(hp),
        hp: Math.floor(hp),
        atk: Math.floor(atk),
        def: Math.floor(def),
        critRate,
        rage: 0,
        effects: {
          bleedRounds: 0,
          healReduced: false,
          armorReduced: 0,
          armorBoosted: 0,
        },
        dbUser: user,
      };
    };

    const p1 = buildCombatant(user1);
    const p2 = buildCombatant(user2);

    const logs = [];
    const history = [];

    const recordState = (turnNum) => {
      history.push({
        turn: turnNum,
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

    let turn = 0;
    recordState(0);

    while (turn < maxTurns && p1.hp > 0 && p2.hp > 0) {
      turn++;

      // Player 1 attacks Player 2
      this.executeTurn(p1, p2, turn, logs);
      recordState(turn);
      if (p2.hp <= 0) break;

      // Player 2 attacks Player 1
      this.executeTurn(p2, p1, turn, logs);
      recordState(turn);
      if (p1.hp <= 0) break;
    }

    const isDraw = p1.hp > 0 && p2.hp > 0;
    let winner = null;
    let loser = null;

    if (!isDraw) {
      winner = p1.hp > 0 ? p1 : p2;
      loser = p1.hp > 0 ? p2 : p1;
    }

    return {
      turns: turn,
      isDraw,
      winner,
      loser,
      p1,
      p2,
      logs,
      history,
    };
  }

  static executeTurn(attacker, defender, turn, logs) {
    const isCrit = Math.random() < attacker.critRate;
    const baseDamage = Math.max(10, attacker.atk - Math.floor(defender.def * 0.4));
    const variance = 0.9 + Math.random() * 0.2;
    let finalDamage = Math.floor(baseDamage * variance * (isCrit ? 1.5 : 1.0));

    defender.hp = Math.max(0, defender.hp - finalDamage);
    attacker.rage = Math.min(100, attacker.rage + 15);
    defender.rage = Math.min(100, defender.rage + 10);

    const critIcon = isCrit ? " 💥 CHÍ MẠNG!" : "";
    logs.push(
      `Lượt ${turn}: **${attacker.name}** tấn công **${defender.name}** gây **${finalDamage.toLocaleString()}** sát thương!${critIcon}`
    );
  }
}

module.exports = BattleEngine;
