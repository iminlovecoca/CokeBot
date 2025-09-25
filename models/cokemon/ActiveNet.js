const mongoose = require('mongoose')

const activeNetSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    uses: {
        type: Number,
        required: true
    },
    caught: {
        type: Map,
        of: Number,
        default: {}
    }
})

module.exports = mongoose.model('ActiveNet', activeNetSchema)
