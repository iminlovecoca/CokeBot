const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
    item_id: { // The unique string ID, e.g., "lure-standard", "fire-stone"
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: { // The user-facing name, e.g., "Bả Lửa"
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    item_type: {
        type: String,
        required: true,
        // key_item is uncessary for now but will possibly be used in the future
        // as one that cannot be bought, sell or thrown away
        enum: ['lure', 'tool', 'evolution_stone', 'key_item']
    },
    price: {
        type: Number,
        default: null // null means not for sale
    },
    // An object to store any special data about the item's effects
    effects: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    emoji: String
})

module.exports = mongoose.model('Item', itemSchema)
