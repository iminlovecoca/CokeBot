require('dotenv').config()
const mongoose = require("mongoose")
const { GoogleGenerativeAI } = require("@google/generative-ai")
const Knowledge = require("../models/Knowledge")
const config = require("../data/config")
const fs = require('fs')
const path = require('path')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const embedModel = genAI.getGenerativeModel({ model: config.ai.embedding_model })


const vectorizeAndSave = async (text, metadata) => {
    try {
        const result = await embedModel.embedContent({
            content: { parts: [{ text: text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: config.ai.embedding_dimensions
        })
        const embedding = result.embedding.values
        await Knowledge.create({
            content: text,
            embedding: embedding,
            metadata: metadata
        })
    } catch (err) {
        console.error(`Error vectorizing: ${text.substring(0, 30)}...`, err.message)
    }
}

const seedKnowledge = async () => {
    try {
        console.log('Preparing to seed knowledge base...')
        await Knowledge.deleteMany({})

        console.log('Seeding metadata...')
        await Knowledge.create({
            content: '__METADATA__',
            embedding: new Array(config.ai.embedding_dimensions).fill(0), 
            metadata: {
                source_id: 'metadata',
                model_used: config.ai.embedding_model,
                dimensions: config.ai.embedding_dimensions
            }
        })

        console.log('Reading manual rules from data/knowledge.js...')
        const { getKnowledgeData } = require('../data/knowledge')
        const manualData = getKnowledgeData()
        for (const item of manualData) {
            console.log(`- Manual rule: ${item.id}`)
            await vectorizeAndSave(item.content, { category: item.category, source_id: item.id })
        }

        console.log('Scanning commands for self-documentation...')
        const commandDir = path.join(__dirname, '../commands')
        const scanDir = async dir => {
            const items = fs.readdirSync(dir, { withFileTypes: true })
            for (const item of items) {
                const fullPath = path.join(dir, item.name)
                if (item.isDirectory()) {
                    await scanDir(fullPath)
                } else if (item.name.endsWith('.js')) {
                    const cmd = require(fullPath)
                    if (cmd.name && cmd.description) {
                        const usageText = cmd.usage ? ` Cách dùng: ${cmd.usage}` : ''
                        let content = `Lệnh: !${cmd.name}\n- Mô tả: ${cmd.description}\n- ${usageText}`
                        
                        if (Array.isArray(cmd.examples)) {
                            content += `\n- Hướng dẫn lọc và ví dụ mẫu:`
                            cmd.examples.forEach(ex => {
                                content += `\n  + Nhóm: "${ex.intent}"\n    Cách dùng mẫu: \`${ex.command}\``
                            })
                        } else if (cmd.examples) {
                            content += `\n- Ví dụ: ${cmd.examples}`
                        }

                        console.log(`- Command doc: ${cmd.name}`)
                        await vectorizeAndSave(content, { category: 'command', source_id: cmd.name })
                    }
                }
            }
        }
        if (fs.existsSync(commandDir)) {
            await scanDir(commandDir)
        }

        console.log('✅ Knowledge Base seeded successfully!')
    } catch (error) {
        console.error('❌ Error seeding knowledge:', error)
    }
}

if (require.main === module) {
    (async () => {
        try {
            await mongoose.connect(process.env.MONGO_URI)
            await seedKnowledge()
        } catch (err) {
            console.error('Connection error:', err)
        } finally {
            await mongoose.disconnect()
            process.exit(0)
        }
    })()
}

module.exports = seedKnowledge