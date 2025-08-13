const User = require('../../models/User');
const cooldowns = new Map();

const COOLDOWN = 5 * 60 * 1000;

async function getUserLuck(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId, luck: 0 });
        await user.save();
    }
    return user;
}

module.exports = {
    name: 'pray',
    alias: ['opray'],
    description: 'Cầu may cho bản thân hoặc người khác',
    async execute(message, args) {
        const now = Date.now();
        const authorId = message.author.id;

        if (cooldowns.has(authorId)) {
            const diff = now - cooldowns.get(authorId);
            if (diff < COOLDOWN) {
                const remainMs = COOLDOWN - diff;
                const remainSeconds = Math.ceil(remainMs / 1000);
                const minutes = Math.floor(remainSeconds / 60);
                const seconds = remainSeconds % 60;

                let timeString = '';
                if (minutes > 0) timeString += `${minutes} phút`;
                if (minutes > 0 && seconds > 0) timeString += ' và ';
                if (seconds > 0) timeString += `${seconds} giây`;

                return message.reply(`⏱ | **${message.member.displayName}**! Vui lòng chờ và thử lại sau **${timeString}**`);
            }
        }

        let target = message.mentions.users.first() || message.author;

        let authorUser = await getUserLuck(authorId);
        let targetUser = await getUserLuck(target.id);

        let reply;

        if (target.id === authorId) {
            // Cầu may cho chính mình: tăng luck
            authorUser.luck += 1;
            await authorUser.save();

            const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;

            reply = `🙏 | **${authorDisplayName}** đã cầu may cho chính mình! Chúc bạn luôn may mắn\n<:blank:1403928807395819671> | Bạn có **${authorUser.luck}** điểm may mắn.`;
        } else {
            // Cầu may cho người khác: giảm luck bản thân, tăng luck target
            authorUser.luck -= 1;
            targetUser.luck += 1;

            await authorUser.save();
            await targetUser.save();

            const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;
            const targetDisplayName = message.guild.members.cache.get(target.id)?.displayName || target.username;

            reply = `🙏 | **${authorDisplayName}** cầu may cho **${targetDisplayName}**... Chúc bạn may mắn!\n` +
                    `<:blank:1403928807395819671> | Bạn hiện có **${authorUser.luck}** điểm may mắn.`;
        }

        message.channel.send(reply);

        cooldowns.set(authorId, now);
    }
};
