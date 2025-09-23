const mongoose = require('mongoose')
require('dotenv').config()
const Cokemon = require('../models/cokemon/Cokemon')
const { calculateIVPercentage } = require('./CokemonUtil')

// Migrate IV percentages for existing cokemon.
const migrateIVs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log('✅ Database connected successfully for migration.')

        const filter = { iv_percent: { $exists: false } }
        const totalToMigrate = await Cokemon.countDocuments(filter)

        if (totalToMigrate === 0) {
            console.log('✅ No cokemon need migration. All documents are up-to-date.')
            return
        }

        console.log(`Found ${totalToMigrate} cokemon to migrate. Starting process...`)
        const BATCH_SIZE = 100
        let processedCount = 0
        for (let i = 0; i < totalToMigrate; i += BATCH_SIZE) {
            const cokemonBatch = await Cokemon.find(filter).limit(BATCH_SIZE)
            const bulkOps = []
            for (const cokemon of cokemonBatch) {
                const ivPercent = calculateIVPercentage(cokemon.ivs)
                bulkOps.push({
                    updateOne: {
                        filter: { _id: cokemon._id },
                        update: { $set: { iv_percent: ivPercent } }
                    }
                })
            }

            if (bulkOps.length > 0) {
                await Cokemon.bulkWrite(bulkOps)
                processedCount += bulkOps.length
                console.log(`Processed ${processedCount} / ${totalToMigrate} cokemon...`)
            }
        }
        console.log('✅ IV percentage migration complete!')
    } catch (error) {
        console.error('❌ Error during IV migration:', error)
    } finally {
        await mongoose.disconnect();
        console.log('✅ Database disconnected.')
    }
}

migrateIVs()