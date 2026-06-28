const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

const gifs = [
  "https://media1.tenor.com/m/p8y_fm-CAuUAAAAC/anime-haruhi-fujioka.gif",
  "https://media1.tenor.com/m/SYsRdiK-T7gAAAAC/hug-anime.gif",
  "https://media1.tenor.com/m/J7eGDvGeP9IAAAAC/enage-kiss-anime-hug.gif",
  "https://media1.tenor.com/m/YVSiUKjAvsMAAAAC/anime-nuzzle-k-on.gif",
  "https://media1.tenor.com/m/YapsPDvVKIAAAAAC/rikekoi-anime-nuzzle.gif",
  "https://media1.tenor.com/m/w5TTA_fLV6UAAAAC/anime-hug-hug.gif",
  "https://media1.tenor.com/m/oJydVqWFDUQAAAAC/natsu-lucy.gif",
  "https://media1.tenor.com/m/PlenvFTbCcAAAAAC/animehug.gif",
  "https://media1.tenor.com/m/FCBl9L-SO9QAAAAC/anime-lycoris-recoil.gif",
  "https://media1.tenor.com/m/omM3N60gsFcAAAAC/yakuzas-way-to-babysitting-anime-hug.gif",
  "https://media1.tenor.com/m/8Jk1ueYnyYUAAAAC/hug.gif"
];

class HugCommand extends BaseCommand {
  constructor() {
    super({
      name: 'hug',
      aliases: ['ohug'],
      description: 'Ôm một người dùng',
      usage: `${config.prefix}hug @user`,
      examples: [
        { intent: 'Ôm một người dùng', command: `${config.prefix}hug @user` }
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
      throw new UserFriendlyError(`${config.emoji.no} Bạn không thể tự ôm chính mình!`);
    }

    const senderName = message.member?.displayName || message.author.username;
    const targetMember = message.mentions.members.first() || message.guild?.members.cache.get(userMention.id);
    const targetName = targetMember?.displayName || userMention.username;
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${senderName} hugs ${targetName}! So warm! ❤`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setImage(randomGif)
      .setColor('#3498db');

    await message.channel.send({ embeds: [embed] });
  }
}

module.exports = new HugCommand();
