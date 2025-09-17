const mongoose = require('mongoose')
require('dotenv').config()
const User = require('../models/User')

const LEGACY_ITEM_IDS = ['lure-ocean']

const removeLegacyItems = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log('✅ Database connected successfully.')

        const updateOperation = { $unset: {} }
        LEGACY_ITEM_IDS.forEach(id => {
            updateOperation.$unset[`inventory.${id}`] = ""
        })

        console.log(`Preparing to remove the following items from all inventories: ${LEGACY_ITEM_IDS.join(', ')}`)
        const result = await User.updateMany({}, updateOperation)
        console.log('✅ Item removal complete!')
        console.log(`Found and potentially modified ${result.matchedCount} user documents.`)
        console.log(`✅ Successfully updated ${result.modifiedCount} user documents.`)
    } catch (error) {
        console.error('❌ Error removing legacy items:', error)
    } finally {
        await mongoose.disconnect()
        console.log('✅ Database disconnected.')
    }
}

removeLegacyItems()