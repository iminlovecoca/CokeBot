const BaseService = require('./BaseService');
const config = require('../data/config');
const { isDev, isAdmin } = require('../utils/userUtil');

class UserService extends BaseService {
  constructor(locator) {
    super(locator);
  }

  get userRepo() {
    return this.locator.get('userRepository');
  }

  async getUser(userId) {
    return this.userRepo.getOrCreate(userId);
  }

  isDev(userId) {
    return isDev(userId);
  }

  isAdmin(userId) {
    return isAdmin(userId);
  }

  getUserXpNeeded(level) {
    return 2000 + (level - 1) * 1000;
  }

  getRankEmoji(level) {
    if (level <= 10) return "<:Common:1390024512774471902>";
    if (level <= 20) return "<:Uncommon:1390024590347997245>";
    if (level <= 30) return "<:Rare:1390024624380706916>";
    if (level <= 40) return "<:Epic:1390024749517770832>";
    if (level <= 50) return "<:Mysthic:1390024772200567026>";
    if (level <= 60) return "<:Legendary:1390024789279772833>";
    return "<:Ancient:1390024806535004333>";
  }
}

module.exports = UserService;
