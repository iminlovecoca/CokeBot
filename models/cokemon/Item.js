const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
    item_id: { 
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: { 
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
        
        
        enum: ['lure', 'tool', 'evolution_stone', 'key_item', 'gem']
    },
    price: {
        type: Number,
        default: null 
    },
    
    effects: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    emoji: String
})

module.exports = mongoose.model('Item', itemSchema)
