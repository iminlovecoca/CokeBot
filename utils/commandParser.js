const { UserFriendlyError } = require('./errors')
const config = require('../data/config')


const parseCommandArgs = (rawArgs) => {
	const processedArgs = []
	let inQuote = false
	let currentQuotedArg = ''

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i]
		if (arg.startsWith('"') && arg.endsWith('"') && arg.length > 1 && !inQuote) {
			
			processedArgs.push(arg.substring(1, arg.length - 1))
		} else if (arg.startsWith('"') && !inQuote) {
			
			inQuote = true
			currentQuotedArg = arg.substring(1)
		} else if (arg.endsWith('"') && inQuote) {
			
			currentQuotedArg += ` ${arg.substring(0, arg.length - 1)}`
			inQuote = false
			processedArgs.push(currentQuotedArg)
			currentQuotedArg = ''
		} else if (inQuote) {
			
			currentQuotedArg += ` ${arg}`
		} else {
			
			processedArgs.push(arg)
		}
	}

	if (inQuote) {
		throw new UserFriendlyError(`${config.emoji.no} Lỗi cú pháp: Dấu nháy đôi chưa đóng.`)
	}
	return processedArgs
}

module.exports = { parseCommandArgs }