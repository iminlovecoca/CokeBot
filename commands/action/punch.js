const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require('discord.js');
const { UserFriendlyError } = require('../../utils/errors');
const { updateQuestProgress } = require('../../utils/questUtil');
const { getActionGif } = require('../../utils/actionGifUtil');
const config = require('../../data/config');

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
      cooldown: 3
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
    const randomGif = await getActionGif('punch');

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
