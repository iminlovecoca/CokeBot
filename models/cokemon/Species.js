const mongoose = require('mongoose')

const validTypes = [
	'Fire', 'Water', 'Grass', 'Electric', 'Flying', 'Rock',
	'Dragon', 'Bug', 'Fighting', 'Psychic', 'Ground', 'Steel'
]

const evolutionDetailSchema = new mongoose.Schema({
	species_id: { // ID of the species it evolves into
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Species',
		required: true
	},
	method: {
		type: String,
		required: true,
		enum: ['level', 'item', 'trade']
	},
	level: Number, // Only required if method is 'level'
	item_id: String // Only required if method is 'item'
}, { _id: false })


const speciesSchema = new mongoose.Schema({
	dex_id: {
		type: Number,
		required: true,
		unique: true,
		index: true
	},
	name: {
		type: String,
		required: true,
		unique: true
	},
	type: {
		type: [String],
		required: true,
		enum: validTypes
	},
	tier: {
		type: String,
		required: true,
		enum: ['Common', 'Rare', 'Epic', 'Ancient', 'Legendary', 'Mythical']
	},
	base_stats: {
		hp: { type: Number, required: true },
		atk: { type: Number, required: true },
		def: { type: Number, required: true },
		spd: { type: Number, required: true },
	},
	catch_rate: {
		type: Number,
		required: true
	},
	flee_rate: {
		type: Number,
		required: true,
	},
	available_genders: {
		type: [String],
		required: true,
		enum: ['Male', 'Female', 'Genderless']
	},
	image_file: String,
	shiny_image_file: String,
	icon_file: String,
	shiny_icon_file: String,
	emoji: String,
	shiny_emoji: String,

	preevolution_species_id: { // What it evolved from
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Species',
		default: null
	},
	evolution: [evolutionDetailSchema]
})

module.exports = mongoose.model('Species', speciesSchema)