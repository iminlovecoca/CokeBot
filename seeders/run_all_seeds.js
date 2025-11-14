const mongoose = require('mongoose')
require('dotenv').config()
const seedAbilities = require('./abilities.js')
const seedItems = require('./items.js')
const seedSpecies = require('./species.js')

const runAllSeeders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected...")
        await seedAbilities()
        await seedItems()
        await seedSpecies()
    } catch (error) {
        console.error("❌ An error occurred during the seeding process:", error)
    } finally {
        await mongoose.disconnect()
        console.log("MongoDB disconnected.")
    }
}

runAllSeeders()