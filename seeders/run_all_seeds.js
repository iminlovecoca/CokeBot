const mongoose = require('mongoose')
require('dotenv').config()
const seedAbilities = require('./abilities')
const seedItems = require('./items')
const seedSpecies = require('./species')
const seedKnowledge = require('./knowledge')

const runAllSeeders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected...")
        await seedAbilities()
        await seedItems()
        await seedSpecies()
        await seedKnowledge()
    } catch (error) {
        console.error("❌ An error occurred during the seeding process:", error)
    } finally {
        await mongoose.disconnect()
        console.log("MongoDB disconnected.")
    }
}

runAllSeeders()