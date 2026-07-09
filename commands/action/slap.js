const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const { updateQuestProgress } = require('../../utils/questUtil');
const config = require('../../data/config');

const gifs = [
  "https://files.catbox.moe/4pjo5p.gif",
  "https://files.catbox.moe/tbmwbk.gif",
  "https://files.catbox.moe/fqqm6x.gif",
  "https://files.catbox.moe/c8mi7x.gif",
  "https://files.catbox.moe/fef11d.gif",
  "https://files.catbox.moe/e1jd71.gif",
  "https://files.catbox.moe/a6oc48.gif",
  "https://files.catbox.moe/it9hnk.gif",
  "https://files.catbox.moe/z36pc7.gif",
  "https://files.catbox.moe/6ju7vr.gif",
  "https://files.catbox.moe/c0zw52.gif",
  "https://files.catbox.moe/n7vt0c.gif",
  "https://files.catbox.moe/u50uq4.gif",
  "https://files.catbox.moe/o9b1y5.gif",
  "https://files.catbox.moe/uava1m.gif",
  "https://files.catbox.moe/ocaq63.gif",
  "https://files.catbox.moe/xcilvm.gif",
  "https://files.catbox.moe/9uuf2s.gif",
  "https://files.catbox.moe/qsj4pu.gif",
  "https://files.catbox.moe/u7a6dl.gif"
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
      cooldown: 5
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

    await updateQuestProgress(message.author.id, 'slap', 1, message.channel);
    await updateQuestProgress(userMention.id, 'slap_received', 1, message.channel);
  }
}

module.exports = new SlapCommand();
