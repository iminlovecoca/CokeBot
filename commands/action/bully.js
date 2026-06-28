const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

const gifs = [
  "https://i.imgur.com/3SsZUVT.gif",
  "https://i.imgur.com/g005tMV.gif",
  "https://i.imgur.com/wzn0ghV.gif",
  "https://i.imgur.com/D8SIe4Z.gif",
  "https://i.imgur.com/xmj8XRD.gif",
  "https://i.imgur.com/N10WUeF.gif",
  "https://i.imgur.com/pO2smzw.gif",
  "https://i.imgur.com/UYKs7Q1.gif",
  "https://i.imgur.com/aBQJPvZ.gif",
  "https://i.imgur.com/meZ0TDz.gif",
  "https://i.imgur.com/jI8zhH6.gif",
  "https://i.imgur.com/eP7NKy7.gif",
  "https://i.imgur.com/a3upumA.gif",
  "https://i.imgur.com/Lbzh24f.gif"
];

class BullyCommand extends BaseCommand {
  constructor() {
    super({
      name: 'bully',
      aliases: ['obully'],
      description: 'Bắt nạt một người dùng',
      usage: `${config.prefix}bully @user`,
      examples: [
        { intent: 'Bắt nạt một người dùng', command: `${config.prefix}bully @user` }
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
      throw new UserFriendlyError(`${config.emoji.no} Bạn không thể tự bắt nạt chính mình!`);
    }

    const senderName = message.member?.displayName || message.author.username;
    const targetMember = message.mentions.members.first() || message.guild?.members.cache.get(userMention.id);
    const targetName = targetMember?.displayName || userMention.username;
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${senderName} bullies ${targetName}!`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setImage(randomGif)
      .setColor('#3498db');

    await message.channel.send({ embeds: [embed] });
  }
}

module.exports = new BullyCommand();
