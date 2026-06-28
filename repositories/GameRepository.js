const BaseRepository = require('./BaseRepository');
const BlackJackGame = require('../models/BlackJackGame');

class GameRepository extends BaseRepository {
  constructor() {
    super(BlackJackGame);
  }

  async getActiveGame(userId) {
    return this.model.findOne({ userId }).lean().exec();
  }

  async createGame(userId, bet, player, dealer, deck) {
    return this.create({ userId, bet, player, dealer, deck, status: 'active' });
  }

  async deleteGame(userId) {
    return this.deleteOne({ userId });
  }

  async addCardToPlayer(userId, card) {
    return this.updateOne(
      { userId },
      { $push: { player: card } }
    );
  }

  async setGameProcessing(userId) {
    return this.model.findOneAndUpdate(
      { userId: userId, status: 'active' },
      { $set: { status: 'processing' } }
    ).exec();
  }
}

module.exports = GameRepository;
