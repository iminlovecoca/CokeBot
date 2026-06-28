const BaseCommand = require('../../core/BaseCommand');
const config = require('../../data/config');

const messages = [
    'Một ngày thật may mắn!',
    'Một ngày thật xui xẻo...',
    'Tuyệt vời!',
    'Ôi không',
    'Ôi trời...',
    'Chết rồi',
    'Hoan hô!',
    'Tuyệt diệu!',
    'Đúng rồi!',
    'Ôi!',
    'Ôi trời ơi.',
    'May mắn quá!',
    'Ối dồi ôi ối dồi ôi ...',
    'Chán quá...',
];

class DiceCommand extends BaseCommand {
  constructor() {
    super({
      name: 'roll',
      description: 'Lắc xúc xắc N mặt!',
      usage: `${config.prefix}roll [số mặt]`,
      examples: [
        { intent: 'Lắc xúc xắc 6 mặt (mặc định)', command: `${config.prefix}roll` },
        { intent: 'Lắc xúc xắc 20 mặt', command: `${config.prefix}roll 20` }
      ],
      cooldown: 3
    });
  }

  async execute(message, args) {
    let sides = 6; 

    if (message.content.startsWith('!d20')) sides = 20;

    if (args.length > 0 && !isNaN(args[0])) {
        sides = parseInt(args[0]);
        if (sides < 2) sides = 2; 
    }

    const resultNum = Math.ceil(Math.random() * sides);
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];

    const reply = `**🎲 | ${message.author.username}** lắc xúc xắc ${sides} mặt.\n**<:blank:427371936482328596> |**  ${randomMsg} Kết quả là **${resultNum}**!`;

    message.channel.send(reply);
  }
}

module.exports = new DiceCommand();
