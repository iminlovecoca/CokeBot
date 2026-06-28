class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id) {
    return this.model.findById(id).exec();
  }

  async findOne(query) {
    return this.model.findOne(query).exec();
  }

  async create(data) {
    return this.model.create(data);
  }

  async updateOne(query, update, options = {}) {
    return this.model.updateOne(query, update, options).exec();
  }

  async deleteOne(query) {
    return this.model.deleteOne(query).exec();
  }
}

module.exports = BaseRepository;
