const mongoose = require('mongoose')
const readline = require('readline')
require('dotenv').config()
const Species = require('../models/cokemon/Species')
const Item = require('../models/cokemon/Item')
const Ability = require('../models/cokemon/Ability')
const User = require('../models/User')
const Cokemon = require('../models/cokemon/Cokemon')

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

const WIPE_REFUNDS = {
	COKEMON_BASE: 100,
	LEGENDARY_COKEMON: 50000,
}

const wipeDatabase = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URL)
		console.log('✅ Database connected successfully for wiping.')

		console.log('Calculating refunds for all users...')
		const allCokemon = await Cokemon.find({}).populate('species_id')
		const allUsers = await User.find({})
		const allItems = await Item.find({})
		const itemPriceMap = new Map(allItems.map(item => [item.item_id, item.price]))
		const refunds = new Map()

		for (const cokemon of allCokemon) {
			const ownerId = cokemon.owner_id
			let refundAmount = WIPE_REFUNDS.COKEMON_BASE
			if (cokemon.species_id.tier === 'Legendary') {
				refundAmount = WIPE_REFUNDS.LEGENDARY_COKEMON
			}
			refunds.set(ownerId, (refunds.get(ownerId) || 0) + refundAmount)
		}

		for (const user of allUsers) {
			let itemRefund = 0
			const inventory = user.inventory || new Map()
			for (const [itemId, quantity] of inventory.entries()) {
				const price = itemPriceMap.get(itemId) || 0
				itemRefund += quantity * price
			}
			refunds.set(user.userId, (refunds.get(user.userId) || 0) + itemRefund)
		}

		const refundOps = []
		for (const [userId, amount] of refunds.entries()) {
			if (amount > 0) {
				refundOps.push({
					updateOne: {
						filter: { userId: userId },
						update: { $inc: { coke: amount } }
					}
				})
			}
		}

		if (refundOps.length > 0) {
			await User.bulkWrite(refundOps)
			console.log(`✅ Applied refunds to ${refundOps.length} users.`)
		}

		console.log("Deleting all caught cokemon from the 'cokemon' collection...")
		const cokemonResult = await Cokemon.deleteMany({})
		console.log(`✅ Successfully deleted ${cokemonResult.deletedCount} cokemon documents.`)

		console.log("Resetting inventory, cokedex, and ID counters for all users...")
		const userResult = await User.updateMany(
			{},
			{ 
				$set: {
					inventory: {},
					cokedex: {},
					last_cokemon_id: 0
				}
			}
    	)
		console.log(`✅ Successfully reset ${userResult.modifiedCount} user profiles.`)
		console.log('✅ All user cokemon data has been wiped successfully.')
	} catch (error) {
		console.error('❌ Error wiping user data:', error)
	} finally {
		await mongoose.disconnect()
		console.log('✅ Database disconnected.')
	}
}

console.log('⚠️ This script will permanently delete all user cokemon data and cant be undone.')
rl.question("Type 'YES' in all caps to confirm you want to proceed: ", (answer) => {
	if (answer === 'YES') {
		console.log('Confirmation received. Wiping data...')
		wipeDatabase()
	} else {
		console.log('Confirmation failed. Aborting script.')
		process.exit(0)
	}
	rl.close()
})