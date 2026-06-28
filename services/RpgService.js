const BaseService = require('./BaseService');
const rpgUtil = require('../utils/rpgUtil');

class RpgService extends BaseService {
  constructor(locator) {
    super(locator);
  }

  getRpgClass(classKey) {
    return rpgUtil.getRpgClass(classKey);
  }

  getRpgXpNeeded(level) {
    return rpgUtil.getRpgXpNeeded(level);
  }

  getRpgRank(level) {
    return rpgUtil.getRpgRank(level);
  }

  getRpgItems(user) {
    return rpgUtil.getRpgItems(user);
  }

  getEquippedItems(user) {
    return rpgUtil.getEquippedItems(user);
  }

  calculateRpgPower(user) {
    return rpgUtil.calculateRpgPower(user);
  }

  hasRpgCharacter(user) {
    return rpgUtil.hasRpgCharacter(user);
  }

  async requireRpgCharacter(userId) {
    return rpgUtil.requireRpgCharacter(userId);
  }

  pickRpgHuntGround() {
    return rpgUtil.pickRpgHuntGround();
  }

  getEffectiveRpgStats(user) {
    return rpgUtil.getEffectiveRpgStats(user);
  }

  async generateRpgGearDrop(user) {
    return rpgUtil.generateRpgGearDrop(user);
  }

  addRpgGearToUser(user, gear) {
    return rpgUtil.addRpgGearToUser(user, gear);
  }

  addRpgExp(rpgData, exp) {
    return rpgUtil.addRpgExp(rpgData, exp);
  }

  getWeaponPower(item, stats) {
    return rpgUtil.getWeaponPower(item, stats);
  }

  getGearDisplayName(item) {
    return rpgUtil.getGearDisplayName(item);
  }

  async equipRpgItem(userId, itemId) {
    return rpgUtil.equipRpgItem(userId, itemId);
  }

  async unequipRpgSlot(userId, slot) {
    return rpgUtil.unequipRpgSlot(userId, slot);
  }

  getItemImageFile(item) {
    return rpgUtil.getItemImageFile(item);
  }
}

module.exports = RpgService;
