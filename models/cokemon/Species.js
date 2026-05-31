const mongoose = require('mongoose')
const config = require('../../data/config')

const evolutionConditionSchema = new mongoose.Schema({
	type: {
		type: String,
		required: true,
		enum: [
			'level_up',
			'item',
			'held_item',
			'trade',
			'trade_item',
			'friendship',
			'time_of_day',
			'gender',
			'location',
			'personality',
			'stat_comparison',
			'move_known',
			'other'
		]
	},
	value: {
		type: mongoose.Schema.Types.Mixed,
		required: true
	}
}, { _id: false })


const evolutionDetailSchema = new mongoose.Schema({
	species_id: { // ID of the species it evolves into
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Species',
		required: true
	},
	conditions: [evolutionConditionSchema]
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
		enum: Object.keys(config.type_colors)
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
		spatk: { type: Number, required: true },
		spdef: { type: Number, required: true },
		spd: { type: Number, required: true },
	},
	available_abilities: [{
		ability: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Ability'
		},
		is_hidden: {
			type: Boolean,
			default: false
		}
	}],
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
	appearance: {
		height: Number,   // in meters
		weight: Number    // in kilograms
	},
	description: {
		type: String,
		default: 'Mô tả cho loài này chưa được viết.'
	},
	image_file: String,
	shiny_image_file: String,
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
