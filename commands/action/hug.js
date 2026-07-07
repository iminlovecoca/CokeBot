const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const { updateQuestProgress } = require('../../utils/questUtil');
const config = require('../../data/config');

const gifs = [
  "https://files.catbox.moe/a7crzx.gif",
  "https://files.catbox.moe/qp5gk5.gif",
  "https://files.catbox.moe/5fmdt0.gif",
  "https://files.catbox.moe/2u0wkh.gif",
  "https://files.catbox.moe/5umxzp.gif",
  "https://files.catbox.moe/hggwol.gif",
  "https://files.catbox.moe/y94ww0.gif",
  "https://files.catbox.moe/9fj25w.gif",
  "https://files.catbox.moe/epruvi.gif",
  "https://files.catbox.moe/bqh05o.gif",
  "https://files.catbox.moe/x4ledc.gif"
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
      cooldown: 5
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

    await updateQuestProgress(message.author.id, 'hug', 1, message.channel);
    await updateQuestProgress(userMention.id, 'hug_received', 1, message.channel);
  }
}

module.exports = new HugCommand();
