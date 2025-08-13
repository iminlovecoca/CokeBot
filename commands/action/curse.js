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
    name: 'curse',
    alias: ['ocurse'],
    description: 'Nguyền rủa người khác hoặc chính mình, giảm điểm Luck',
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

        // Lấy user curse (người gửi) và user bị curse (target)
        let authorUser = await getUserLuck(authorId);
        let targetUser = await getUserLuck(target.id);

        if (target.id === authorId) {
            // Tự curse chính mình: chỉ trừ luck thôi
            targetUser.luck -= 1;
            await targetUser.save();

            const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;

            const reply = `👻 | **${authorDisplayName}** đã tự nguyền rủa chính mình. Hãy cẩn thận.!\n<:blank:1403928807395819671> | Bạn hiện có ${targetUser.luck} điểm may mắn.`;

            message.channel.send(reply);
        } else {
            // Curse người khác: trừ luck target, tăng luck author
            targetUser.luck -= 1;
            authorUser.luck += 1;

            await targetUser.save();
            await authorUser.save();

            const authorDisplayName = message.guild.members.cache.get(authorId)?.displayName || message.author.username;
            const targetDisplayName = message.guild.members.cache.get(target.id)?.displayName || target.username;

            const reply = `👻 | **${authorDisplayName}** đã nguyền rủa **${targetDisplayName}**... Hãy cẩn thận nhé!\n<:blank:1403928807395819671> | Bạn hiện có **${authorUser.luck}** điểm may mắn.`;

            message.channel.send(reply);
        }

        cooldowns.set(authorId, now);
    }
};
