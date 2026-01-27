const { UserFriendlyError } = require('./errors')
const config = require('../data/config')

// Parses command arguments, respecting double quotes for multi-word values
const parseCommandArgs = (rawArgs) => {
	const processedArgs = []
	let inQuote = false
	let currentQuotedArg = ''

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i]
		if (arg.startsWith('"') && arg.endsWith('"') && arg.length > 1 && !inQuote) {
			// Self-contained quoted argument: "--tier "common""
			processedArgs.push(arg.substring(1, arg.length - 1))
		} else if (arg.startsWith('"') && !inQuote) {
			// Start of a multi-word quoted argument
			inQuote = true
			currentQuotedArg = arg.substring(1)
		} else if (arg.endsWith('"') && inQuote) {
			// End of a multi-word quoted argument
			currentQuotedArg += ` ${arg.substring(0, arg.length - 1)}`
			inQuote = false
			processedArgs.push(currentQuotedArg)
			currentQuotedArg = ''
		} else if (inQuote) {
			// Middle of a multi-word quoted argument
			currentQuotedArg += ` ${arg}`
		} else {
			// Regular unquoted argument
			processedArgs.push(arg)
		}
	}

	if (inQuote) {
		throw new UserFriendlyError(`${config.emoji.no} Lỗi cú pháp: Dấu nháy đôi chưa đóng.`)
	}
	return processedArgs
}

module.exports = { parseCommandArgs }