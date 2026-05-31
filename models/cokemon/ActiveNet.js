const mongoose = require('mongoose')

const activeNetSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    uses: {
        type: Number,
        required: true
    },
    caught: {
        type: Map,
        of: new mongoose.Schema({
            name: String,
            emoji: String,
            shiny_emoji: String,
            normal_caught: { type: Number, default: 0 },
            shiny_caught: { type: Number, default: 0 }
        }, { _id: false })
    }
})

module.exports = mongoose.model('ActiveNet', activeNetSchema)
