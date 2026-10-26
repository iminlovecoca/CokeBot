const { addRpgExp, calculateRpgPower } = require("../../utils/rpgUtil");
const { getBattleXp, addPetXp } = require("../../utils/petXpUtil");
const { updateQuestProgress } = require("../../utils/questUtil");

class BattleRewards {
  /**
   * Process battle rewards, win streaks, and 100% synchronized Pet EXP.
   *
   * @param {Object} user1 - Mongoose User document for Player 1
   * @param {Object} user2 - Mongoose User document for Player 2
   * @param {Object} battleResult - Result from BattleEngine.simulateBattle
   * @param {Object} [options={}] - Options { isTargeted: false, channel: null }
   * @returns {Object} Rewards Summary { petFooterInfo, p1Xp, p2Xp }
   */
  static async processRewards(user1, user2, battleResult, options = {}) {
    const isDraw = battleResult.isDraw;
    const isP1Winner = battleResult.winner && battleResult.winner.id === user1.userId;
    const isTargeted = options.isTargeted || false;
    const channel = options.channel || null;

    // 1. Update Win Streaks (Only active initiator user1 is tracked)
    if (!isTargeted && !isDraw) {
      if (isP1Winner) {
        user1.rpg.pvpStreak = (user1.rpg.pvpStreak || 0) + 1;
      } else {
        user1.rpg.pvpStreak = 0;
      }
    }

    // 2. Award Character EXP (Only active initiator user1)
    const p1PlayerXp = isDraw ? 50 : isP1Winner ? 200 : 50;
    const p2PlayerXp = 0;

    addRpgExp(user1.rpg, p1PlayerXp);
    user1.rpg.power = calculateRpgPower(user1);
    user1.markModified("rpg");

    // 3. Award & Synchronize Pet Battle XP (Only active initiator user1)
    const p1Result = isDraw ? "draw" : isP1Winner ? "win" : "lose";
    const p1Streak = isP1Winner ? user1.rpg.pvpStreak || 0 : 0;
    const p1LvlDiff = Math.max(0, user2.rpg.level - user1.rpg.level);

    const petXp1 = getBattleXp(p1Result, p1Streak, p1LvlDiff);
    const petXp2 = 0;

    let petFooterInfo = "";

    if (user1.rpg.equippedPet) {
      addPetXp(user1.rpg.equippedPet, petXp1, user1);
      petFooterInfo += ` | Linh thú: +${petXp1} Pet XP (Lvl.${user1.rpg.equippedPet.level})`;
    }

    // 4. Calculate Battle Rank LP. Random ranked PvP updates both documents:
    // the opponent loses the same LP amount the winner gains.
    let lpSummaryInfo = "";
    if (!isTargeted && !isDraw && battleResult.winner) {
      const BattleRankService = require("../../services/battleRankService");
      const rankService = new BattleRankService();
      const winnerUser = isP1Winner ? user1 : user2;
      const loserUser = isP1Winner ? user2 : user1;

      const lpResult = await rankService.processBattleLp(winnerUser, loserUser);

      if (isP1Winner) {
        const lpMaxText = lpResult.isDivine ? `${lpResult.newLp} LP` : `${lpResult.newLp}/100 LP`;
        lpSummaryInfo = ` | +${lpResult.lpGain} LP (${lpMaxText}) | Đối thủ -${lpResult.lpLoss} LP`;
        if (lpResult.promoted) {
          lpSummaryInfo += ` 🏆 THĂNG HẠNG: ${lpResult.newRank}!`;
        }
      } else {
        const loserIsDivine = (user1.rpg?.battleRank || '').toLowerCase() === 'divine';
        const loserLpText = loserIsDivine ? `${lpResult.loserLp} LP` : `${lpResult.loserLp}/100 LP`;
        lpSummaryInfo = ` | -${lpResult.lpLoss} LP (${loserLpText}) | Đối thủ +${lpResult.lpGain} LP`;
        if (lpResult.demoted) {
          lpSummaryInfo += ` 🔻 GIÁNG HẠNG: ${lpResult.loserRank}!`;
        } else if (lpResult.loseStreak >= 3) {
          lpSummaryInfo += ` ⚠️ Chuỗi thua ${lpResult.loseStreak}!`;
        }
      }
    } else if (isTargeted) {
      lpSummaryInfo = " | Giao hữu (Không tính LP)";
    }

    // 5. Daily Weapon Crate (wc) Drop Tracking (1st 100%, 2nd/3rd 5%, max 3/day)
    const todayDate = new Date().toISOString().slice(0, 10);
    if (!user1.rpg.dailyDrops || typeof user1.rpg.dailyDrops !== "object" || user1.rpg.dailyDrops.date !== todayDate) {
      user1.rpg.dailyDrops = {
        date: todayDate,
        huntLbCount: user1.rpg?.dailyDrops?.date === todayDate ? (user1.rpg.dailyDrops.huntLbCount || 0) : 0,
        battleWcCount: 0,
      };
    }

    let wcDropped = false;
    if (user1.rpg.dailyDrops.battleWcCount === 0) {
      wcDropped = true;
      user1.rpg.dailyDrops.battleWcCount = 1;
    } else if (user1.rpg.dailyDrops.battleWcCount < 3) {
      if (Math.random() < 0.05) {
        wcDropped = true;
        user1.rpg.dailyDrops.battleWcCount += 1;
      }
    }

    if (wcDropped) {
      if (!user1.inventory) user1.inventory = new Map();
      const curWc =
        user1.inventory instanceof Map
          ? user1.inventory.get("wc") || 0
          : user1.inventory.wc || 0;
      if (user1.inventory instanceof Map) {
        user1.inventory.set("wc", curWc + 1);
      } else {
        user1.inventory.wc = curWc + 1;
      }
      user1.markModified("inventory");
      user1.markModified("rpg");
    }

    // 6. Update Quest Progress
    if (channel) {
      const questPromises = [
        updateQuestProgress(user1, "exp_gain", p1PlayerXp, channel),
        updateQuestProgress(user2, "exp_gain", p2PlayerXp, channel),
      ];
      if (wcDropped) {
        questPromises.push(updateQuestProgress(user1, "hunt_loot", 1, channel, { rarity: "Epic" }));
      }
      if (user1.rpg?.equippedPet) {
        questPromises.push(updateQuestProgress(user1, "pet_level", user1.rpg.equippedPet.level, channel));
      }
      await Promise.all(questPromises);
    }

    // Save MongoDB documents
    await Promise.all([user1.save(), user2.save()]);

    return {
      petFooterInfo: petFooterInfo + lpSummaryInfo,
      p1Xp: p1PlayerXp,
      p2Xp: p2PlayerXp,
      petXp1,
      petXp2,
      wcDropped,
      wcCount: user1.rpg.dailyDrops?.battleWcCount || 1,
    };
  }
}

module.exports = BattleRewards;
