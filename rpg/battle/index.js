const BattleEngine = require("./battleEngine");
const BattleCanvas = require("./battleCanvas");
const BattleRewards = require("./battleRewards");

module.exports = {
  BattleEngine,
  BattleCanvas,
  BattleRewards,
  simulateBattle: BattleEngine.simulateBattle.bind(BattleEngine),
  renderPvPImage: BattleCanvas.renderPvPImage.bind(BattleCanvas),
  processRewards: BattleRewards.processRewards.bind(BattleRewards),
};
