const random = require('random-number-csprng');
const { decBalance, incBalance } = require('../../utils/userUtil')
const { getDebuffPercentage } = require('../../utils/miscUtil')
const { checkAndSetCooldown, notifyCooldown } = require('../../utils/cooldown')
const { getBetAmount } = require('../../utils/gameUtil')
const { UserFriendlyError } = require('../../utils/errors')
const config = require('../../data/config')
const emoji = config.emoji
const settings = config.gamble_settings

module.exports = {
	name: 'cf',
	aliases: ['coinflip', 'flip'],
	description: 'Chơi tung đồng xu!',
	usage: '`!cf <h/t> [tiền cược|all]`',
	examples: '`!cf t`\n`!coinflip h all`',
	async execute(message, args) {
		const userId = message.author.id;
		let choice
		if (args.length == 0) {
			choice = 'h';
			throw new UserFriendlyError(`${emoji.no} Cú pháp: \`!cf <heads/tails> <số tiền|all>\``)
		} else {
			choice = args[0].toLowerCase();
			if (['heads', 'h', 'head'].includes(choice)) {
				choice = 'h'
			} else if (['tails', 't', 'tail'].includes(choice)) {
				choice = 't'
			} else {
				throw new UserFriendlyError(`${emoji.no} Bạn phải chọn \`heads\` hoặc \`tails\`!`)
			}
		}
		let bet = args.length == 1 ? 'min' : args[1]
		const betAmount = await getBetAmount(bet, userId, settings.max_bet, settings.min_bet)

		const remainingCooldown = checkAndSetCooldown(userId, 'cf', settings.cooldown_second)
			if (remainingCooldown > 0) {
			return notifyCooldown(message, remainingCooldown)
		}

		let text = `**${message.member?.displayName || message.author.username}** đã cược ${emoji.money} **${betAmount.toLocaleString()}** và chọn ${choice === 'h' ? '**heads**' : '**tails**'}\n`
		text += `Đồng xu quay... ${emoji.coinflip}`
		const msg = await message.reply(text)

		const debuffPercentage = await getDebuffPercentage(userId)
		const winProbability = 0.5 * (1 - debuffPercentage)
		const rand = await random(0, 100)
		const result = rand < winProbability * 100 ? choice : (choice === 'h' ? 't' : 'h')

		let win = result === choice
		const sign = win ? 1 : -1
		await incBalance(userId, sign * betAmount)

		setTimeout(async () => {
			let resultEmoji = result === 'h' ? emoji.heads : emoji.tails;
			let resultText = `Đồng xu quay... ${resultEmoji} và bạn `;
			if (win) {
				resultText += `thắng ${emoji.money} **${(betAmount * 2).toLocaleString()}**!!`;
			} else {
				resultText += 'thua hết... :c';
			}
			await msg.edit(`**${message.member?.displayName || message.author.username}** đã cược ${emoji.money} **${betAmount.toLocaleString()}** và chọn ${choice === 'h' ? '**heads**' : '**tails**'}\n${resultText}`)
		}, 2000)
	}
}