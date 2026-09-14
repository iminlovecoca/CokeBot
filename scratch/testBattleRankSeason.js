const assert = require("assert");
const fs = require("fs");
const path = require("path");
const BattleRankService = require("../services/battleRankService");
const {
  honorRanks,
  getHonorSkinFile,
  getHonorSkinFiles,
  getHonorSkinInfo,
  isHonorSkin,
} = require("../data/rpg/skins");
const classes = require("../data/rpg/classes");

const makeUser = (userId, rank, lp) => ({
  userId,
  rpg: {
    battleRank: rank,
    battleLp: lp,
    seasonWins: 0,
    seasonLosses: 0,
    loseStreak: 0,
  },
  markModified() {},
  async save() {},
});

const main = async () => {
  const rankService = new BattleRankService();
  for (const winnerRank of ["Unranked", "Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"]) {
    for (const loserRank of ["Unranked", "Common", "Rare", "Epic", "Legendary", "Mythic", "Ancient", "Divine"]) {
      assert.strictEqual(
        rankService.calculateLpLoss(loserRank, winnerRank, 99),
        rankService.calculateLpGain(winnerRank, loserRank),
        `${winnerRank} vs ${loserRank} must transfer the same LP`,
      );
    }
  }

  const winner = makeUser("winner", "Common", 99);
  const loser = makeUser("loser", "Common", 20);
  const result = await rankService.processBattleLp(winner, loser);
  assert.strictEqual(result.lpGain, 2);
  assert.strictEqual(result.lpLoss, 2);
  assert.strictEqual(winner.rpg.battleRank, "Rare");
  assert.strictEqual(winner.rpg.battleLp, 1);
  assert.strictEqual(loser.rpg.battleLp, 18);
  assert.strictEqual(winner.rpg.seasonWins, 1);
  assert.strictEqual(loser.rpg.seasonLosses, 1);

  const repoRoot = path.join(__dirname, "..");
  const classNames = Object.values(classes).map((entry) => entry.name);
  assert.strictEqual(classNames.length, 6);
  assert.strictEqual(honorRanks.length, 4);
  for (const className of classNames) {
    for (const rank of honorRanks) {
      const classKey = className.toLowerCase();
      const files = getHonorSkinFiles(classKey, rank);
      for (const gender of ["male", "female"]) {
        const fileName = files[gender];
        const assetPath = path.join(repoRoot, "assets", "skins", className, fileName);
        assert.strictEqual(fileName, getHonorSkinFile(classKey, rank, gender));
        assert.ok(isHonorSkin(fileName), `${fileName} must be recognized as an honor skin`);
        assert.strictEqual(getHonorSkinInfo(fileName).rank, rank);
        assert.strictEqual(getHonorSkinInfo(fileName).gender, gender);
        assert.ok(fs.existsSync(assetPath), `missing honor skin asset: ${assetPath}`);
      }
    }
  }

  assert.strictEqual(rankService.getSeasonRewards("Legendary").honorSkin, true);
  assert.strictEqual(rankService.getSeasonRewards("Divine").honorSkin, true);
  assert.strictEqual(rankService.getSeasonRewards("Epic").honorSkin, false);
  console.log("Battle rank LP symmetry and 48 gendered honor skin assets passed.");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
