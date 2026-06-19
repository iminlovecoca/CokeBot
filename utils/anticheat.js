const { createCanvas, registerFont } = require('canvas')
const { isDev } = require('./userUtil')
const { calculateStd, formatDuration } = require('./miscUtil')
const path = require('path')
const config = require('../data/config')

try {
	const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'RobotoSlab-Regular.ttf')
	registerFont(fontPath, { family: 'Roboto Slab' })
	console.log('✅ Font registered.')
} catch (error) {
	console.error('❌ Failed to register font.')
}
// Structure: Map<userId, {
//	 spamBucket: { tokens: number, lastFill: number },
//   channelData: Map<channelId, { timestamps: number[], lastCommand: string, consecutive: number }>,
//   globalCommandHistory: { category: string }[]
// }>
const userBehaviorHistory = new Map()

const generateVerificationCode = () => {
	return Math.random().toString(36).substring(2, 2 + config.anticheat.verification_code_length).toUpperCase()
}

const generateCaptchaImage = code => {
	const canvas = createCanvas(220, 80)
	const ctx = canvas.getContext('2d')

	const bgColor = `hsl(${Math.random() * 360}, 100%, 95%)`
	ctx.fillStyle = bgColor
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	for (let i = 0; i < 10; i++) {
		ctx.strokeStyle = `hsla(${Math.random() * 360}, 70%, 50%, 0.4)`
		ctx.beginPath()
		ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
		ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
		ctx.stroke()
	}

	ctx.font = 'bold 30px "Roboto Slab"'
	ctx.fillStyle = '#2C3E50'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	const chars = code.split('')
	const charWidth = canvas.width / (chars.length + 1)
	chars.forEach((char, i) => {
		ctx.save()
		const yJitter = (Math.random() - 0.5) * 10
		ctx.translate(charWidth * (i + 1), canvas.height / 2 + yJitter)
		ctx.rotate(Math.random() - 0.5)
		ctx.fillText(char, 0, 0)
		ctx.restore()
	})
	return canvas.toBuffer()
}

const handleVerification = async (message, user) => {
	const expectedCode = user.anticheat?.verification_code
	if (!expectedCode) return

	let msg
	const providedCode = message.content.toUpperCase()
	if (providedCode === expectedCode) {
		user.anticheat.verification_code = null
		user.anticheat.last_flag_reason = null
		user.anticheat.verification_attempts = 0
		userBehaviorHistory.delete(user.userId)
		msg = `${config.emoji.yes} Cảm ơn bạn đã xác thực! Bạn có thể tiếp tục chơi.`
	} else {
		user.anticheat.verification_attempts = (user.anticheat.verification_attempts || 0) + 1
		if (user.anticheat.verification_attempts >= config.anticheat.verification_max_attempts) {
			const duration = config.anticheat.mute_duration_ms
			user.bannedUntil = new Date(Date.now() + duration)
			user.anticheat.verification_code = null
			user.anticheat.verification_attempts = 0

			let levelDeductedMsg = ""
			if (user.rpg && user.rpg.classKey) {
				const oldLevel = user.rpg.level || 1
				user.rpg.level = Math.max(1, oldLevel - 10)
				const { getRpgRank } = require('./rpgUtil')
				user.rpg.rank = getRpgRank(user.rpg.level)
				user.markModified('rpg')
				levelDeductedMsg = ` Đồng thời, cấp độ RPG của bạn bị giảm 10 cấp (Lvl ${oldLevel} → Lvl ${user.rpg.level}).`
			}

			msg = `${config.emoji.no} Xác thực không thành công sau nhiều lần thử. Bạn đã bị cấm sử dụng bot trong ${formatDuration(duration / 1000)}.${levelDeductedMsg}`
		} else {
			const attemptsLeft = config.anticheat.verification_max_attempts - user.anticheat.verification_attempts
			msg = `${config.emoji.no} Mã không chính xác. Bạn còn **${attemptsLeft}** lần thử.`
		}
	}
	await user.save()
	return message.reply(msg)
}

const checkMessage = message => {
	const { author, channel, content } = message
	const userId = author.id
	const username = author.username
	const channelId = channel.id

	if (isDev(userId) || config.permissions.anticheat_immune_ids.includes(userId)) {
		return { status: 'PROCESS', reason: null }
	}

	const now = Date.now()
	if (!userBehaviorHistory.has(userId)) {
		userBehaviorHistory.set(userId, {
			channelData: new Map(),
			globalCommandHistory: []
		})
	}
	const history = userBehaviorHistory.get(userId)

	// Burst spam
	if (config.anticheat.burst_enabled) {
		const bucket = history.spamBucket || { tokens: config.anticheat.burst_bucket_capacity, lastFill: now }
		const tokensToAdd = Math.floor((now - bucket.lastFill) / config.anticheat.burst_refill_rate_ms)
		if (tokensToAdd > 0) {
			bucket.tokens = Math.min(bucket.tokens + tokensToAdd, config.anticheat.burst_bucket_capacity)
			bucket.lastFill = now
		}
		history.spamBucket = bucket

		if (bucket.tokens < 1) {
			console.log(`[Anti-Cheat] User ${userId} (${username}) flagged for BURST SPAM.`)
			return { status: 'TRIGGER_VERIFICATION', reason: 'burst spam' }
		}
		bucket.tokens--
	}

	// Bot detection
	if (config.anticheat.bot_detection_enabled && content.startsWith(config.prefix)) {
		const command = content.slice(config.prefix.length).split(' ')[0].toLowerCase()

		// 1. Random verification check on high-value commands (0.6% chance)
		if (config.anticheat.focus_high_value_commands.includes(command)) {
			if (Math.random() < 0.006) {
				console.log(`[Anti-Cheat] User ${userId} (${username}) flagged by random validation check.`)
				return { status: 'TRIGGER_VERIFICATION', reason: 'random validation check' }
			}
		}

		// 2. Consecutive command play without a 2-minute break
		if (history.lastCommandTime && (now - history.lastCommandTime) > 2 * 60 * 1000) {
			history.consecutiveCommandsCount = 1
		} else {
			history.consecutiveCommandsCount = (history.consecutiveCommandsCount || 0) + 1
		}
		history.lastCommandTime = now

		if (history.consecutiveCommandsCount >= 200) {
			console.log(`[Anti-Cheat] User ${userId} (${username}) flagged for consecutive play (>200 commands without break).`)
			history.consecutiveCommandsCount = 0 // Reset
			return { status: 'TRIGGER_VERIFICATION', reason: 'consecutive play (>200 commands without break)' }
		}

		// Rhythm and Monotony (per-channel)
		if (!history.channelData.has(channelId)) {
			history.channelData.set(channelId, { timestamps: [], lastCommand: '', consecutive: 0 })
		}
		const channelHistory = history.channelData.get(channelId)

		// Monotony
		if (content.toLowerCase() === channelHistory.lastCommand) {
			channelHistory.consecutive++
		} else {
			channelHistory.lastCommand = content.toLowerCase()
			channelHistory.consecutive = 1
		}

		if (channelHistory.consecutive >= config.anticheat.monotony_threshold) {
			console.log(`[Anti-Cheat] User ${userId} (${username}) flagged for MONOTONY.`)
			return { status: 'TRIGGER_VERIFICATION', reason: 'monotony' }
		}

		// Rhythm
		channelHistory.timestamps.push(now)
		if (channelHistory.timestamps.length > config.anticheat.rhythm_history_length) {
			channelHistory.timestamps.shift()
		}
		if (channelHistory.timestamps.length >= config.anticheat.rhythm_min_messages) {
			const intervals = []
			for (let i = 1; i < channelHistory.timestamps.length; i++) {
				intervals.push(channelHistory.timestamps[i] - channelHistory.timestamps[i - 1])
			}

			// Calculate median of intervals to filter out outlier pauses/breaks
			const sortedIntervals = [...intervals].sort((a, b) => a - b)
			const mid = Math.floor(sortedIntervals.length / 2)
			const medianInterval = sortedIntervals.length % 2 !== 0 
				? sortedIntervals[mid] 
				: (sortedIntervals[mid - 1] + sortedIntervals[mid]) / 2

			// Filter out pauses (any interval > median * 2.5, minimum threshold of 35000ms)
			const activeIntervals = intervals.filter(val => val <= Math.max(35000, medianInterval * 2.5))

			if (activeIntervals.length >= 6) {
				const mean = activeIntervals.reduce((sum, val) => sum + val, 0) / activeIntervals.length
				const stdDev = calculateStd(activeIntervals)
				const cv = mean > 0 ? stdDev / mean : 0

				// Calculate differences of consecutive active intervals to detect alternating loops
				const diffs = []
				for (let i = 1; i < activeIntervals.length; i++) {
					diffs.push(Math.abs(activeIntervals[i] - activeIntervals[i - 1]))
				}
				const stdDevDiffs = diffs.length >= 4 ? calculateStd(diffs) : 99999

				const hasQuickCommands = activeIntervals.some(val => val < 3000)

				let isBot = false
				let flagReason = ''

				if (diffs.length >= 4 && stdDevDiffs < 80) {
					isBot = true
					flagReason = `step consistency (stdDevDiffs: ${stdDevDiffs.toFixed(0)}ms)`
				} else if (stdDev < config.anticheat.rhythm_std_dev_threshold_ms) {
					isBot = true
					flagReason = `absolute rhythm (stdDev: ${stdDev.toFixed(0)}ms)`
				} else if (cv < 0.04 && !hasQuickCommands) {
					isBot = true
					flagReason = `relative rhythm (cv: ${cv.toFixed(2)})`
				}

				if (isBot) {
					console.log(`[Anti-Cheat] User ${userId} (${username}) flagged for RHYTHM (${flagReason}).`)
					return { status: 'TRIGGER_VERIFICATION', reason: flagReason }
				}
			}
		}

		// Suspicious Focus (global)
		const category = config.anticheat.focus_high_value_commands.includes(command) ? 'high_value' : 'other'
		history.globalCommandHistory.push({ category })
		if (history.globalCommandHistory.length > config.anticheat.focus_history_length) {
			history.globalCommandHistory.shift()
		}

		if (history.globalCommandHistory.length >= config.anticheat.focus_min_commands) {
			const highValueCount = history.globalCommandHistory.filter(c => c.category === 'high_value').length
			const ratio = highValueCount / history.globalCommandHistory.length

			if (ratio >= config.anticheat.focus_ratio_threshold) {
				console.log(`[Anti-Cheat] User ${userId} (${username}) flagged for SUSPICIOUS FOCUS. Ratio: ${ratio.toFixed(2)}`)
				return { status: 'TRIGGER_VERIFICATION', reason: `suspicious focus (${ratio.toFixed(2)})` }
			}
		}
	}
	return { status: 'PROCESS', reason: null }
}

module.exports = {
	generateVerificationCode,
	generateCaptchaImage,
	handleVerification,
	checkMessage
}
