const BaseService = require('./BaseService');

class GambleService extends BaseService {
  constructor(locator) {
    super(locator);
  }

  async getDebuffPercentage(userId) {
    const config = require('../data/config');
    let debuffPercentage = 0;
    
    if (config.gamble_settings.enable_special_treatment) {
      
      const { getTotalCoke } = require('../utils/userUtil');
      const totalCoke = await getTotalCoke(userId);
      if (totalCoke > 10000000) {
        debuffPercentage = 0.35;
      } else if (totalCoke > 5000000) {
        debuffPercentage = 0.25;
      }
    }
    
    return debuffPercentage;
  }

  async getWinProbability(userId, baseProbability = 0.5) {
    const debuff = await this.getDebuffPercentage(userId);
    return baseProbability * (1 - debuff);
  }
}

module.exports = GambleService;
