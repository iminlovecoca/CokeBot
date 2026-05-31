const mongoose = require('mongoose')
const config = require('../../data/config')

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
  original_owner_id: {
    type: String,
    required: true,
    index: true
  },
  catch_method: {
    type: String,
    enum: ['manual', 'net', 'gifted', 'traded'],
    default: 'manual'
  },
  species_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Species',
    required: true,
    index: true
  },
  nickname: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Genderless'],
    index: true
  },
  ivs: {
    hp: { type: Number, required: true },
    atk: { type: Number, required: true },
    def: { type: Number, required: true },
    spatk: { type: Number, required: true },
    spdef: { type: Number, required: true },
    spd: { type: Number, required: true },
  },
  iv_percent: {
    type: Number,
    required: true,
    index: true
  },
  ability: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ability',
    required: true,
    index: true
  },
  level: {
    type: Number,
    default: 1,
    index: true
  },
  experience: {
    type: Number,
    default: 0
  },
  is_shiny: {
    type: Boolean,
    default: false,
    index: true
  },
  moves: {
    type: [String],
    default: []
  },
  nature: {
    type: String,
    enum: Object.keys(config.natures),
    default: 'Hardy',
    index: true
  },
  is_favorite: {
    type: Boolean,
    default: false,
    index: true
  },
  friendship: {
    type: Number,
    default: config.cokemon_settings.base_friendship
  },
  held_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    default: null
  },
  acquiredAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

cokemonSchema.pre('save', (next) => {
  if (this.isNew) {
    this.acquiredAt = this.createdAt
  }
  next()
})

module.exports = mongoose.model('Cokemon', cokemonSchema)