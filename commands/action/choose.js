module.exports = {
    name: 'choose',
    description: 'Chọn ngẫu nhiên 1 lựa chọn từ danh sách',
    execute(message, args) {
        const msgs = [
            'Tôi chọn ?!',
            'Tôi thích ?!',
            'Tôi yêu ?!',
            '? là lựa chọn tốt nhất',
            'Chắc chắn là ?!',
            '? 100%',
        ];

        if (!args.length) {
            return message.reply('❌ Bạn phải nhập ít nhất 1 lựa chọn, ví dụ: `!choose táo, cam, chuối`');
        }

        const choices = args.join(' ').split(',').map(c => c.trim()).filter(c => c.length > 0);

        if (choices.length < 2) {
            return message.reply('❌ Bạn cần ít nhất 2 lựa chọn để tôi chọn!');
        }

        const choice = choices[Math.floor(Math.random() * choices.length)];

        let msgTemplate = msgs[Math.floor(Math.random() * msgs.length)];
        msgTemplate = msgTemplate.replace('?', choice);

        message.channel.send(`🎲 **|** **${message.author.username}**, ${msgTemplate}`);
    }
};
