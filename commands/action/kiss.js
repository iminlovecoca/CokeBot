const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

const gifs = [
  "https://media1.tenor.com/m/JmphmnN1y3kAAAAC/kiss.gif",
  "https://media1.tenor.com/m/BZyWzw2d5tAAAAAC/hyakkano-100-girlfriends.gif",
  "https://media1.tenor.com/m/LWwxh8RIiVEAAAAC/s6.gif",
  "https://media1.tenor.com/m/YHxJ9NvLYKsAAAAC/anime-kiss.gif",
  "https://media1.tenor.com/m/6l_1S34ErxMAAAAd/sena-aijisai-watanare.gif",
  "https://media1.tenor.com/m/L-NTpww8HTUAAAAC/kiss-anime-anime-kiss.gif",
  "https://media1.tenor.com/m/5jhwSnExvoEAAAAC/baiser-animes.gif",
  "https://media1.tenor.com/m/U4YIaKPyS4cAAAAd/umibe-no-%C3%A9tranger-kiss.gif",
  "https://media1.tenor.com/m/zUTrh58kH50AAAAC/vegeta-anime.gif",
  "https://media1.tenor.com/m/NZUQilMD3IIAAAAC/horimiya-izumi-miyamura.gif",
  "https://media1.tenor.com/m/IYm_z25wOHMAAAAC/ayla-soft-kiss.gif",
  "https://media1.tenor.com/m/Fyq9izHlreQAAAAC/my-little-monster-haru-yoshida.gif",
  "https://media1.tenor.com/m/FoUR5FPFYyoAAAAC/darker-than-black-dtb-hei.gif",
  "https://media1.tenor.com/m/ErAPuiWY46QAAAAC/kiss-anime.gif",
  "https://media1.tenor.com/m/ibHBbBdai8AAAAAC/lesbian.gif",
  "https://media1.tenor.com/m/UyhucXktku0AAAAC/love-kiss.gif"
];

class KissCommand extends BaseCommand {
  constructor() {
    super({
      name: 'kiss',
      aliases: ['okiss'],
      description: 'Hôn một người dùng',
      usage: `${config.prefix}kiss @user`,
      examples: [
        { intent: 'Hôn một người dùng', command: `${config.prefix}kiss @user` }
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
      throw new UserFriendlyError(`${config.emoji.no} Bạn không thể tự hôn chính mình!`);
    }

    const senderName = message.member?.displayName || message.author.username;
    const targetMember = message.mentions.members.first() || message.guild?.members.cache.get(userMention.id);
    const targetName = targetMember?.displayName || userMention.username;
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${senderName} kisses ${targetName}! So sweet! ❤`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setImage(randomGif)
      .setColor('#3498db');

    await message.channel.send({ embeds: [embed] });
  }
}

module.exports = new KissCommand();
