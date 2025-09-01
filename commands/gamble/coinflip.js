const { decBalance, incBalance } = require('../../utils/userUtil')
const {
	setCooldown,
	getRemainingCooldown,
	notifyCooldown
} = require('../../utils/cooldown')
const { getBetAmount } = require('../../utils/gameUtil')
const config = require('../../data/config.json')
const emoji = config.emoji

const maxBet = 250000
const minBet = 1
const cooldownSeconds = 15

module.exports = {
	name: 'cf',
	aliases: ['coinflip', 'coin', 'flip'],
	description: 'Chơi coinflip!',
	async execute(message, args) {
		try {
			const userId = message.author.id;
			let choice
			if (args.length == 0) {
				choice = 'h';
				return await message.reply('❌ | Cú pháp: `!cf <heads/tails> <số tiền|all>`')
			} else {
				choice = args[0].toLowerCase();
				if (['heads', 'h', 'head'].includes(choice)) {
					choice = 'h'
				} else if (['tails', 't', 'tail'].includes(choice)) {
					choice = 't'
				} else {
					return await message.reply('❌ | Bạn phải chọn `heads` hoặc `tails`!')
				}
			}
			let bet = args.length == 1 ? 'min' : args[1]
			const betAmount = await getBetAmount(bet, userId, maxBet, minBet)

			const cooldown = getRemainingCooldown(userId, 'coinflip')
			if (cooldown > 0) return notifyCooldown(message, cooldown)
			setCooldown(userId, 'coinflip', cooldownSeconds)

			let text = `**${message.member?.displayName || message.author.username}** đã cược **${betAmount.toLocaleString()} coke** và chọn ${choice === 'h' ? '**heads**' : '**tails**'}\n`
			text += `Đồng xu quay... ${emoji.coinflip}`;
			const msg = await message.reply(text);
			const rand = Math.random() < 0.5 ? 't' : 'h';
			let win = rand === choice;
			const sign = win ? 1 : -1
			await incBalance(userId, sign * betAmount)

			setTimeout(async () => {
				let resultEmoji = rand === 'h' ? emoji.heads : emoji.tails;
				let resultText = `Đồng xu quay... ${resultEmoji} và bạn `;
				if (win) {
					resultText += `thắng **${(betAmount * 2).toLocaleString()} coke**!!`;
				} else {
					resultText += 'thua hết... :c';
				}
				await msg.edit(`**${message.member?.displayName || message.author.username}** đã cược **${betAmount.toLocaleString()} coke** và chọn ${choice === 'h' ? '**heads**' : '**tails**'}\n${resultText}`)
			}, 2000)
		} catch (error) {
			return await message.reply(error.message)
		}
	}
}