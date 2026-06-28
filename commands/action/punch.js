const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

const gifs = [
  "https://media1.tenor.com/m/lWmjgII6fcgAAAAd/saki-saki-mukai-naoya.gif",
  "https://media1.tenor.com/m/qDDsivB4UEkAAAAC/anime-fight.gif",
  "https://media1.tenor.com/m/FAEF_H8BFC8AAAAC/punch.gif",
  "https://media1.tenor.com/m/ZJpW9TXNlCIAAAAC/ora-oraora.gif",
  "https://media.tenor.com/yA_KtmPI1EMAAAAM/hxh-hunter-x-hunter.gif",
  "https://media1.tenor.com/m/i3hP7zju5JYAAAAd/higurashi-sotsu.gif",
  "https://i.imgur.com/e4bi40y.gif",
  "https://i.imgur.com/Op0Pu0J.gif",
  "https://i.imgur.com/FCXJydZ.gif",
  "https://i.imgur.com/jznCcr2.gif",
  "https://i.imgur.com/y8dqJmY.gif",
  "https://i.imgur.com/BYAHeVB.gif",
  "https://media1.tenor.com/m/rf95MNM-96MAAAAd/luffy-one-piece.gif",
  "https://media1.tenor.com/m/UK-nHsdngT0AAAAd/sakura-punch-naruto.gif"
];

class PunchCommand extends BaseCommand {
  constructor() {
    super({
      name: 'punch',
      aliases: ['opunch'],
      description: 'Đấm một người dùng',
      usage: `${config.prefix}punch @user`,
      examples: [
        { intent: 'Đấm một người dùng', command: `${config.prefix}punch @user` }
      ],
      cooldown: 0
    });
  }

  async execute(message, args) {
    const userMention = message.mentions.users.first();
    if (!userMention) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn phải tag một người dùng!`);
    }

    if (userMention.id === message.author.id) {
      throw new UserFriendlyError(`${config.emoji.no} Bạn không thể tự đấm chính mình!`);
    }

    const senderName = message.member?.displayName || message.author.username;
    const targetMember = message.mentions.members.first() || message.guild?.members.cache.get(userMention.id);
    const targetName = targetMember?.displayName || userMention.username;
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${senderName} gives ${targetName} a punch! Ouch!`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setImage(randomGif)
      .setColor('#3498db');

    await message.channel.send({ embeds: [embed] });
  }
}

module.exports = new PunchCommand();
