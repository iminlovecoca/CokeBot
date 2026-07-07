const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const { updateQuestProgress } = require('../../utils/questUtil');
const config = require('../../data/config');

const gifs = [
  "https://files.catbox.moe/3xm60t.gif",
  "https://files.catbox.moe/7dicm2.gif",
  "https://files.catbox.moe/ke30bl.gif",
  "https://files.catbox.moe/t5eprq.gif",
  "https://files.catbox.moe/8wiy0d.gif",
  "https://files.catbox.moe/6xll7q.gif",
  "https://files.catbox.moe/kxf4zo.gif",
  "https://files.catbox.moe/zoni5k.gif",
  "https://files.catbox.moe/0lf69c.gif",
  "https://files.catbox.moe/e52tfh.gif",
  "https://files.catbox.moe/qrbho8.gif",
  "https://files.catbox.moe/tkpkfz.gif",
  "https://files.catbox.moe/mrk1xf.gif",
  "https://files.catbox.moe/admn6j.gif"
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
      cooldown: 5
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

    await updateQuestProgress(message.author.id, 'punch', 1, message.channel);
    await updateQuestProgress(userMention.id, 'punch_received', 1, message.channel);
  }
}

module.exports = new PunchCommand();
