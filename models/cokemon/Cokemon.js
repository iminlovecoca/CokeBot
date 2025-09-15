const mongoose = require('mongoose')

const cokemonSchema = new mongoose.Schema({
  uid: {
    type: Number,
    required: true,
    index: true
  },
  owner_id: {
    type: String,
    required: true,
    index: true
  },
  species_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Species',
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Genderless']
  },
  ivs: {
    hp: { type: Number, required: true },
    atk: { type: Number, required: true },
    def: { type: Number, required: true },
    spd: { type: Number, required: true },
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  is_shiny: {
    type: Boolean,
    default: false
  },
  moves: {
    type: [String],
    default: []
  },
  nature: {
    type: String,
    enum: ['Hardy', 'Lonely', 'Brave', 'Bold', 'Relaxed', 'Timid', 'Hasty'],
    default: 'Hardy'
  },
  is_favorite: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

module.exports = mongoose.model('Cokemon', cokemonSchema)