const cron = require("node-cron");
const FootballBet = require("../models/FootballBet");
const { incBalance } = require("../utils/userUtil");
const {
  SCORE_MULTIPLIER,
  exactScoreWon,
  fetchFixtureResult,
  isFinalStatus,
  getWinningSide,
  resolveFixtureTeamSide,
  scoreBetWon,
  winnerBetWon,
} = require("../utils/footballBetApi");

let isRunning = false;

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("vi-VN");
}

async function notifyUser(client, userId, text) {
  if (!client?.users?.fetch) {
    return;
  }

  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    return;
  }

  await user.send(text).catch(() => {});
}

async function settlePendingBets(client) {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const pendingBets = await FootballBet.find({
      status: "pending",
      kickoffAt: { $lte: new Date() },
    })
      .sort({ kickoffAt: 1 })
      .limit(50)
      .lean();

    for (const bet of pendingBets) {
      const fixture = {
        matchId: bet.matchId,
        fixtureTag: bet.fixtureTag,
        competitionKey: bet.competitionKey || "",
        competitionName: bet.competitionName,
        homeTeam: bet.homeTeam,
        awayTeam: bet.awayTeam,
        kickoffAt: new Date(bet.kickoffAt),
      };

      let result = null;
      try {
        result = await fetchFixtureResult(fixture);
      } catch (error) {
        console.warn(
          `[Bet Settler] Could not fetch result for ${bet.fixtureTag}:`,
          error.message,
        );
        continue;
      }

      if (!result || !isFinalStatus(result.status)) {
        continue;
      }

      const won =
        bet.betType === "winner"
          ? winnerBetWon(bet.pickTeam || bet.prediction, fixture, result.score)
          : bet.betType === "score"
            ? scoreBetWon(
                bet.pickTeam || bet.prediction,
                bet.predictedScore,
                fixture,
                result.score,
              )
            : exactScoreWon(bet.prediction, result.score);
      const payout = won ? Math.round(bet.stake * SCORE_MULTIPLIER) : 0;
      const settledAt = new Date();

      await FootballBet.updateOne(
        { _id: bet._id, status: "pending" },
        {
          $set: {
            status: won ? "won" : "lost",
            payout,
            actualScore: result.score,
            resultStatus: result.status,
            settledAt,
          },
        },
      );

      if (won && payout > 0) {
        await incBalance(bet.userId, payout);
      }

      const actualScoreText = `${result.score.home}-${result.score.away}`;
      const betLabel = bet.betType === "winner" ? "kèo đội thắng" : "kèo tỉ số";
      const pickText = bet.prediction;
      const outcomeText = won
        ? `thắng ${formatMoney(payout)} coke`
        : "thua kèo";

      await notifyUser(
        client,
        bet.userId,
        `Kèo bóng đá của bạn (${betLabel}) cho trận **${bet.homeTeam} vs ${bet.awayTeam}** đã chốt. Lựa chọn: **${pickText}**. Tỉ số thực tế: **${actualScoreText}**. Bạn ${outcomeText}.`,
      );
    }
  } catch (error) {
    console.error("[Bet Settler] Unexpected error:", error);
  } finally {
    isRunning = false;
  }
}

function initialize(client) {
  cron.schedule("*/2 * * * *", () => {
    settlePendingBets(client).catch((error) => {
      console.error("[Bet Settler] Tick failed:", error);
    });
  });

  settlePendingBets(client).catch((error) => {
    console.error("[Bet Settler] Initial run failed:", error);
  });
}

module.exports = {
  initialize,
  settlePendingBets,
};
