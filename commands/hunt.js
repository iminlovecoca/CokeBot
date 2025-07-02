// commands/hunt.js
const User = require('../models/User');
const { getRandomBeast } = require('../utils/beasts');
const { setCooldown, getRemainingCooldown } = require('../utils/cooldown');

module.exports = {
    name: 'h',
    aliases: ['hunt'],
    async execute(message, args) {
        const userId = message.author.id;
        const name = message.author.username;

        // Cooldown 15s
        const cooldownSeconds = 15;
        const remaining = getRemainingCooldown(userId, 'hunt');
        if (remaining > 0) {
            const msg = await message.reply(`⏱ | Vui lòng chờ **${remaining} giây**`);
            let count = remaining;
            const interval = setInterval(async () => {
                count--;
                if (count <= 0) {
                    clearInterval(interval);
                    msg.delete().catch(() => {});
                } else {
                    msg.edit(`⏱ | Vui lòng chờ **${count} giây**`);
                }
            }, 1000);
            return;
        }

        // Số lượt săn
        let times = 1;
        if (args[0] === 'all') {
            times = 10;
        } else if (!isNaN(args[0])) {
            const num = parseInt(args[0]);
            if (num > 0 && num <= 10) times = num;
        }

        // Lấy user
        let user = await User.findOne({ userId });
        if (!user || user.coke < 100 * times) {
            return message.reply(`🚫 | Không đủ coke để săn ${times} lần (cần ${100 * times} coke)`);
        }

        setCooldown(userId, 'hunt', cooldownSeconds);

        const caught = [];
        user.coke -= 100 * times;
        if (!user.beasts) user.beasts = {};

        for (let i = 0; i < times; i++) {
            const beast = getRandomBeast();
            caught.push(`${beast.emoji} **${beast.name}** (${beast.rarity})`);

            if (!user.beasts[beast.rarity]) user.beasts[beast.rarity] = {};
            if (!user.beasts[beast.rarity][beast.name]) {
                user.beasts[beast.rarity][beast.name] = 1;
            } else {
                user.beasts[beast.rarity][beast.name] += 1;
            }
        }

        await user.save();

        message.reply(`🎯 | **${name}** đã bắt được:
${caught.join('\n')}`);
    }
};
