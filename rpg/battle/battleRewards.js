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

    // 4. Calculate Battle Rank LP (Only applies to active initiator user1 in random PvP)
    let lpSummaryInfo = "";
    if (!isTargeted && !isDraw && battleResult.winner) {
      const BattleRankService = require("../../services/battleRankService");
      const rankService = new BattleRankService();
      const winnerUser = isP1Winner ? user1 : user2;
      const loserUser = isP1Winner ? user2 : user1;

      const lpResult = await rankService.processBattleLp(winnerUser, loserUser, {
        updateOnlyInitiator: true,
        initiatorId: user1.userId
      });

      if (isP1Winner) {
        const lpMaxText = lpResult.isDivine ? `${lpResult.newLp} LP` : `${lpResult.newLp}/100 LP`;
        lpSummaryInfo = ` | +${lpResult.lpGain} LP (${lpMaxText})`;
        if (lpResult.promoted) {
          lpSummaryInfo += ` 🏆 THĂNG HẠNG: ${lpResult.newRank}!`;
        }
      } else {
        const loserIsDivine = (user1.rpg?.battleRank || '').toLowerCase() === 'divine';
        const loserLpText = loserIsDivine ? `${lpResult.loserLp} LP` : `${lpResult.loserLp}/100 LP`;
        lpSummaryInfo = ` | -${lpResult.lpLoss} LP (${loserLpText})`;
        if (lpResult.demoted) {
          lpSummaryInfo += ` 🔻 GIÁNG HẠNG: ${lpResult.loserRank}!`;
        } else if (lpResult.loseStreak >= 3) {
          lpSummaryInfo += ` ⚠️ Chuỗi thua ${lpResult.loseStreak}!`;
        }
      }
    } else if (isTargeted) {
      lpSummaryInfo = " | Giao hữu (Không tính LP)";
    }

    // 5. Update Quest Progress
    if (channel) {
      await Promise.all([
        updateQuestProgress(user1, "exp_gain", p1PlayerXp, channel),
        updateQuestProgress(user2, "exp_gain", p2PlayerXp, channel),
      ]);
    }

    // Save MongoDB documents
    await Promise.all([user1.save(), user2.save()]);

    return {
      petFooterInfo: petFooterInfo + lpSummaryInfo,
      p1Xp: p1PlayerXp,
      p2Xp: p2PlayerXp,
      petXp1,
      petXp2,
    };
  }
}

module.exports = BattleRewards;
