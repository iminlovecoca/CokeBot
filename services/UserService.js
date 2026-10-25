const BaseService = require('./BaseService');
const config = require('../data/config');
const { isDev, isAdmin, isOwner } = require('../utils/userUtil');

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

  isOwner(userId) {
    return isOwner(userId);
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
    if (level <= 10) return "<:common:1530878565489311826>";
    if (level <= 20) return "<:rare:1530878574104547378>";
    if (level <= 30) return "<:epic:1530878567955566642>";
    if (level <= 35) return config.emoji?.ranks?.generation || "🇬";
    if (level <= 45) return "<:legendary:1530878570858287205>";
    if (level <= 55) return "<a:mythic:1530878614843686912>";
    if (level <= 65) return "<a:ancient:1530878606656540814>";
    if (level <= 80) return "<a:divine:1530878610515165365>";
    return config.emoji?.ranks?.secret || "🇸";
  }
}

module.exports = UserService;
