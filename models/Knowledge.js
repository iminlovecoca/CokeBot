const mongoose = require('mongoose')

const knowledgeSchema = new mongoose.Schema({
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: {
        category: String,
        source_id: String,
        model_used: String,
        dimensions: Number
    }
})

module.exports = mongoose.model('Knowledge', knowledgeSchema)