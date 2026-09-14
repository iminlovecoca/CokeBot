const cron = require("node-cron");
const { DateTime } = require("luxon");
const config = require("../data/config");
const User = require("../models/User");
const BattleSeason = require("../models/BattleSeason");
const BattleRankService = require("./battleRankService");
const { getHonorSkinFile, getGenderFromCharacterAsset } = require("../data/rpg/skins");

const SEASON_KEY = "battle_rank";
const DEFAULT_DURATION_DAYS = 30;
const getSettings = () => config.battle_rank || {};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFirstResetAt = () => {
  const settings = getSettings();
  const configured = toValidDate(process.env.BATTLE_RANK_FIRST_RESET_AT || settings.first_reset_at);
  if (configured) return configured;

  const timezone = settings.reset_timezone || "Asia/Ho_Chi_Minh";
  return DateTime.now().setZone(timezone).plus({ days: 1 }).startOf("day").toUTC().toJSDate();
};

const getDurationMs = () => {
  const days = Number(getSettings().season_duration_days) || DEFAULT_DURATION_DAYS;
  return Math.max(1, days) * 24 * 60 * 60 * 1000;
};

const makeSeasonId = (startedAt) => `battle-${startedAt.toISOString()}`;

class BattleSeasonService {
  constructor() {
    this.rankService = new BattleRankService();
    this.resetTask = null;
    this.resetRunning = false;
  }

  async ensureCurrentSeason() {
    let season = await BattleSeason.findOne({ key: SEASON_KEY }).exec();
    if (season) return season;

    const endsAt = getFirstResetAt();
    const startedAt = new Date(endsAt.getTime() - getDurationMs());
    const seasonId = makeSeasonId(startedAt);

    try {
      season = await BattleSeason.create({
        key: SEASON_KEY,
        seasonId,
        startedAt,
        endsAt,
      });
    } catch (error) {
      // Two PM2 workers can race on first boot; use the winner's record.
      if (error?.code !== 11000) throw error;
      season = await BattleSeason.findOne({ key: SEASON_KEY }).exec();
    }
    return season;
  }

  async initialize() {
    if (this.resetTask) this.resetTask.stop();

    const settings = getSettings();
    const timezone = settings.reset_timezone || "Asia/Ho_Chi_Minh";
    await this.repairLegacyHonorRewards();
    await this.resetIfDue(new Date());
    // Check every minute so a restart, brief outage, or a delayed event-loop
    // does not make the midnight boundary disappear. resetIfDue is idempotent
    // and uses the Mongo lock, so this remains safe with multiple workers.
    this.resetTask = cron.schedule("* * * * *", () => {
      this.resetIfDue(new Date()).catch((error) => {
        console.error("[BATTLE_SEASON] Scheduled reset failed:", error);
      });
    }, { timezone });

    const current = await this.ensureCurrentSeason();
    console.log(`[BATTLE_SEASON] Active season ${current.seasonId}, ends ${current.endsAt.toISOString()}.`);
    return current;
  }

  async repairLegacyHonorRewards() {
    let repaired = 0;
    const cursor = User.find({
      isBattleBot: { $ne: true },
      "rpg.classKey": { $ne: null },
      "rpg.lastBattleSeasonRank": { $in: ["Legendary", "Mythic", "Ancient", "Divine"] },
    }).cursor();

    for await (const user of cursor) {
      const rpg = user.rpg;
      const reward = rpg.lastBattleSeasonReward;
      if (!reward || reward.honorSkin) continue;

      const honorSkin = getHonorSkinFile(
        rpg.classKey,
        rpg.lastBattleSeasonRank,
        getGenderFromCharacterAsset(rpg.characterAsset),
      );
      if (!honorSkin) continue;

      if (!Array.isArray(rpg.ownedSkins)) rpg.ownedSkins = [];
      if (!rpg.ownedSkins.includes(honorSkin)) rpg.ownedSkins.push(honorSkin);
      reward.honorSkin = honorSkin;
      reward.honorSkins = [honorSkin];
      rpg.lastHonorSkin = honorSkin;
      user.markModified("rpg");
      await user.save();
      repaired += 1;
    }

    if (repaired) {
      console.log(`[BATTLE_SEASON] Repaired ${repaired} legacy honor skin rewards.`);
    }
    return repaired;
  }

  async resetIfDue(now = new Date()) {
    if (this.resetRunning) return { reset: false, reason: "already_running" };
    this.resetRunning = true;

    try {
      const season = await this.ensureCurrentSeason();
      if (!season || now < season.endsAt) {
        return { reset: false, seasonId: season?.seasonId || null, endsAt: season?.endsAt || null };
      }

      const currentSeasonId = season.seasonId;
      const nextStartedAt = new Date(season.endsAt);
      const nextEndsAt = new Date(nextStartedAt.getTime() + getDurationMs());
      const nextSeasonId = makeSeasonId(nextStartedAt);
      const lockId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const staleLockAt = new Date(now.getTime() - 10 * 60 * 1000);
      const claimedSeason = await BattleSeason.findOneAndUpdate(
        {
          key: SEASON_KEY,
          seasonId: currentSeasonId,
          endsAt: { $lte: now },
          $or: [
            { resetLockId: null },
            { resetLockAt: { $lt: staleLockAt } },
          ],
        },
        { $set: { resetLockId: lockId, resetLockAt: now } },
        { new: true },
      ).exec();
      if (!claimedSeason) {
        return { reset: false, reason: "reset_claimed_by_another_worker", seasonId: currentSeasonId };
      }

      let processed = 0;
      let rewarded = 0;
      let honorSkinCount = 0;

      try {
        const cursor = User.find({
          isBattleBot: { $ne: true },
          "rpg.classKey": { $ne: null },
        }).cursor();

        for await (const user of cursor) {
          const rpg = user.rpg;
          const finalRank = this.rankService.getRankNameByIndex(
            this.rankService.getRankTierIndex(rpg.battleRank),
          );
          const finalLp = Math.max(0, Number(rpg.battleLp) || 0);
          const wins = Math.max(0, Number(rpg.seasonWins) || 0);
          const losses = Math.max(0, Number(rpg.seasonLosses) || 0);
          const alreadySettled = rpg.lastBattleSeasonId === currentSeasonId;

          if (!alreadySettled) {
            const reward = this.rankService.getSeasonRewards(finalRank);
            const honorSkin = reward.honorSkin
              ? getHonorSkinFile(
                rpg.classKey,
                finalRank,
                getGenderFromCharacterAsset(rpg.characterAsset),
              )
              : null;

            user.coke = (Number(user.coke) || 0) + reward.coke;
            if (reward.wc > 0) {
              if (!user.inventory || typeof user.inventory.get !== "function") {
                user.inventory = new Map(Object.entries(user.inventory || {}));
              }
              user.inventory.set("wc", (user.inventory.get("wc") || 0) + reward.wc);
              user.markModified("inventory");
            }
            if (honorSkin) {
              if (!Array.isArray(rpg.ownedSkins)) rpg.ownedSkins = [];
              if (!rpg.ownedSkins.includes(honorSkin)) rpg.ownedSkins.push(honorSkin);
              honorSkinCount += 1;
            }

            rpg.lastBattleSeasonId = currentSeasonId;
            rpg.lastBattleSeasonRank = finalRank;
            rpg.lastBattleSeasonLp = finalLp;
            rpg.lastBattleSeasonReward = {
              coke: reward.coke,
              wc: reward.wc,
              honorSkin,
              honorSkins: honorSkin ? [honorSkin] : [],
            };
            rpg.lastBattleSeasonEndedAt = season.endsAt;
            rpg.lastHonorSkin = honorSkin;
            rewarded += 1;
          }

          const participated = finalRank !== "Unranked" || wins + losses > 0;
          rpg.battleRank = participated ? "Common" : "Unranked";
          rpg.battleLp = 0;
          rpg.seasonWins = 0;
          rpg.seasonLosses = 0;
          rpg.pvpStreak = 0;
          rpg.loseStreak = 0;
          rpg.seasonRewardClaimed = false;
          rpg.battleSeasonId = nextSeasonId;
          rpg.battleSeasonStartedAt = nextStartedAt;
          rpg.battleSeasonEndsAt = nextEndsAt;
          user.markModified("rpg");
          await user.save();
          processed += 1;
        }

        const updatedSeason = await BattleSeason.findOneAndUpdate(
          { key: SEASON_KEY, seasonId: currentSeasonId, resetLockId: lockId },
          {
            $set: {
              seasonId: nextSeasonId,
              startedAt: nextStartedAt,
              endsAt: nextEndsAt,
              lastResetAt: now,
              resetLockId: null,
              resetLockAt: null,
            },
          },
          { new: true },
        ).exec();

        if (!updatedSeason) {
          return { reset: false, reason: "season_changed_during_reset" };
        }

        console.log(`[BATTLE_SEASON] Reset ${currentSeasonId}: ${processed} players, ${rewarded} rewards, ${honorSkinCount} honor skins.`);
        return {
          reset: true,
          seasonId: currentSeasonId,
          nextSeasonId,
          processed,
          rewarded,
          honorSkins: honorSkinCount,
        };
      } catch (error) {
        await BattleSeason.updateOne(
          { key: SEASON_KEY, seasonId: currentSeasonId, resetLockId: lockId },
          { $set: { resetLockId: null, resetLockAt: null } },
        ).exec().catch(() => {});
        throw error;
      }
    } finally {
      this.resetRunning = false;
    }
  }
}

module.exports = BattleSeasonService;
