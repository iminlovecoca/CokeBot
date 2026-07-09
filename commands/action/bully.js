const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const { updateQuestProgress } = require('../../utils/questUtil');
const config = require('../../data/config');

const gifs = [
  "https://files.catbox.moe/5wm7ns.gif",
  "https://files.catbox.moe/emzrr6.gif",
  "https://files.catbox.moe/e52bb1.gif",
  "https://files.catbox.moe/s1ml4o.gif",
  "https://files.catbox.moe/zfkczg.gif",
  "https://files.catbox.moe/eadhlc.gif",
  "https://files.catbox.moe/qh9ewv.gif",
  "https://files.catbox.moe/n4icmo.gif",
  "https://files.catbox.moe/4okxba.gif",
  "https://files.catbox.moe/n29em0.gif",
  "https://files.catbox.moe/5392ne.gif",
  "https://files.catbox.moe/4db3v0.gif",
  "https://files.catbox.moe/4dwcnv.gif",
  "https://files.catbox.moe/c9al40.gif",
  "https://files.catbox.moe/ex60yi.gif",
  "https://files.catbox.moe/jk8m9n.gif",
  "https://files.catbox.moe/4o2ryd.gif",
  "https://files.catbox.moe/zsr73s.gif",
  "https://files.catbox.moe/vtv2rn.gif",
  "https://files.catbox.moe/x6o5bb.gif",
  "https://files.catbox.moe/zj3bcq.gif",
  "https://files.catbox.moe/u3o2tk.gif",
  "https://files.catbox.moe/il65p3.gif",
  "https://files.catbox.moe/7jys4v.gif",
  "https://files.catbox.moe/nz233w.gif",
  "https://files.catbox.moe/olkivs.gif",
  "https://files.catbox.moe/drcgio.gif",
  "https://files.catbox.moe/q5ucye.gif",
  "https://files.catbox.moe/tacq9p.gif"
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
      cooldown: 5
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

    await updateQuestProgress(message.author.id, 'bully', 1, message.channel);
    await updateQuestProgress(userMention.id, 'bully_received', 1, message.channel);
  }
}

module.exports = new BullyCommand();
