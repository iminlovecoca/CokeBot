const mongoose = require('mongoose')
const Drop = require('../models/Drop')

const getDrop = async channelId => await Drop.findOne({ channelId })

const addDrop = async (channelId, amount, duration) => {
	await Drop.insertOne({
		channelId,
		amount,
		picked: [],
		expireAt: new Date(Date.now() + duration)
	})
}

const delDrop = async channelId => Drop.deleteOne({ channelId })

const updateDrop = async (channelId, amount, userId) => {
	await Drop.updateOne(
		{ channelId },
		{
			$inc: { amount: -amount},
			$push: { picked: userId }
		}
	)
}

module.exports = {
	getDrop, addDrop, delDrop, updateDrop
}