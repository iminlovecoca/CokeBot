const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const { updateQuestProgress } = require('../../utils/questUtil');
const { getActionGif } = require('../../utils/actionGifUtil');
const config = require('../../data/config');

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
      cooldown: 3
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
    const randomGif = await getActionGif('kiss');

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
