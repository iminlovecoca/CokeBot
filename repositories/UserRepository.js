const BaseRepository = require('./BaseRepository');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async getByUserId(userId) {
    return this.model.findOne({ userId }).exec();
  }

  async getOrCreate(userId) {
    let user = await this.model.findOne({ userId }).exec();
    if (!user) {
      user = new this.model({
        userId,
        level: 1,
        xp: 0,
        coke: 0,
        dailyXp: 0,
        dailyStreak: 0,
      });
      await user.save();
    }
    return user;
  }
}

module.exports = UserRepository;
