const mongoose = require('mongoose')
const readline = require('readline')
require('dotenv').config()

const User = require('./models/User')
const Cokemon = require('./models/cokemon/Cokemon')

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

const wipeDatabase = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URL)
		console.log('✅ Database connected successfully for wiping.')

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