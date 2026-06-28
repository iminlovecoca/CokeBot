const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const { updateQuestProgress } = require('../../utils/questUtil');
const config = require('../../data/config');

const gifs = [
  "https://files.catbox.moe/fuqsua.gif",
  "https://files.catbox.moe/2l18rd.gif",
  "https://files.catbox.moe/io8tto.gif",
  "https://files.catbox.moe/k4l4e7.gif",
  "https://files.catbox.moe/t8wtmp.gif",
  "https://files.catbox.moe/xdkyap.gif",
  "https://files.catbox.moe/s5griu.gif",
  "https://files.catbox.moe/lpwg8e.gif",
  "https://files.catbox.moe/4jyw8s.gif",
  "https://files.catbox.moe/mgtr39.gif",
  "https://files.catbox.moe/tbshki.gif",
  "https://files.catbox.moe/vurvxc.gif",
  "https://files.catbox.moe/vekpy8.gif",
  "https://files.catbox.moe/s6i2ut.gif",
  "https://files.catbox.moe/t4ao7p.gif",
  "https://files.catbox.moe/i773y1.gif"
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

    await updateQuestProgress(message.author.id, 'kiss', 1, message.channel);
    await updateQuestProgress(userMention.id, 'kiss_received', 1, message.channel);
  }
}

module.exports = new KissCommand();
