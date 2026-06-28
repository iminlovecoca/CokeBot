const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

const gifs = [
  "https://media1.tenor.com/m/X2WGK2fbenEAAAAC/peak.gif",
  "https://media1.tenor.com/m/XiYuU9h44-AAAAAC/anime-slap-mad.gif",
  "https://media1.tenor.com/m/cfobWWgjG8wAAAAC/anime-kaguya-sama.gif",
  "https://media1.tenor.com/m/cpWuWnOU64MAAAAC/bofetada.gif",
  "https://media1.tenor.com/m/68_5cN3wpJcAAAAC/slap-anime-girl.gif",
  "https://media1.tenor.com/m/VlSXTbFcvDQAAAAC/naruto-anime.gif",
  "https://media1.tenor.com/m/Sv8LQZAoQmgAAAAC/chainsaw-man-csm.gif",
  "https://media1.tenor.com/m/TcBb6YDeidkAAAAd/bulma-vs-bils-slap.gif"
];

class SlapCommand extends BaseCommand {
  constructor() {
    super({
      name: 'slap',
      aliases: ['oslap'],
      description: 'Tát một người dùng',
      usage: `${config.prefix}slap @user`,
      examples: [
        { intent: 'Tát một người dùng', command: `${config.prefix}slap @user` }
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
      throw new UserFriendlyError(`${config.emoji.no} Bạn không thể tự tát chính mình!`);
    }

    const senderName = message.member?.displayName || message.author.username;
    const targetMember = message.mentions.members.first() || message.guild?.members.cache.get(userMention.id);
    const targetName = targetMember?.displayName || userMention.username;
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${senderName} slaps ${targetName}! Ouch!`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setImage(randomGif)
      .setColor('#3498db');

    await message.channel.send({ embeds: [embed] });
  }
}

module.exports = new SlapCommand();
