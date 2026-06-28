const BaseCommand = require('../../core/BaseCommand');
const { answerQuestion, getThreadHistory } = require('../../utils/qaSystem');
const { UserFriendlyError } = require('../../utils/errors');
const config = require('../../data/config');

class AskCommand extends BaseCommand {
  constructor() {
    super({
      name: 'ask',
      description: 'Bắt đầu cuộc trò chuyện với trợ lý AI.',
      usage: `${config.prefix}ask [câu hỏi]`,
      cooldown: 0
    });
  }

  async execute(message, args) {
    const client = message.client;
    const userId = message.author.id;

    const isBotThread = message.channel.isThread() && message.channel.ownerId === client.user.id;
    const isDebug = args.includes('--debug') && config.permissions.dev_ids.includes(userId);
    if (message.channel.isThread() && !isBotThread) {
        throw new UserFriendlyError(`${config.emoji.no} Bạn đã ở trong một cuộc hội thoại rồi. Hãy đặt câu hỏi trực tiếp tại đây!`);
    }

    if (!client.askCooldowns) {
        client.askCooldowns = new Map();
    }
    const now = Date.now();
    if (client.askCooldowns.has(userId)) {
        const expirationTime = client.askCooldowns.get(userId) + config.ai.ask_cooldown_ms;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            throw new UserFriendlyError(`${config.emoji.no} Vui lòng đợi **${timeLeft.toFixed(1)} giây** trước khi mở cuộc hội thoại mới.`);
        }
    }
    client.askCooldowns.set(userId, now);

    try {
        if (message.channel.threads) {
            const fetchedThreads = await message.channel.threads.fetchActive();
            const oldAIThreads = fetchedThreads.threads.filter(t =>
                t.ownerId === client.user.id &&
                t.name.includes(message.author.username)
            );

            for (const [id, oldThread] of oldAIThreads) {
                try {
                    await oldThread.send(`${config.emoji.warning} Bạn đã mở một luồng hỗ trợ mới. Luồng này sẽ được tự động đóng lại.`);
                    await oldThread.setArchived(true);
                } catch (error) {
                    console.error(`Failed to close old thread ${id}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Channel thread cleanup failed:', error);
    }

    const cleanArgs = args.filter(a => a !== '--debug');
    const question = cleanArgs.join(' ');

    const processAIResponse = async (targetChannel, prompt, history, replyToMsg, isResumption) => {
        const thinkingText = isResumption
            ? '🤔 *Đang tra cứu lại thông tin...*'
            : `🤔 <@${userId}> ơi, đợi tôi tìm hiểu một chút về câu hỏi: *"${prompt}"*...`;
        const thinkingMsg = replyToMsg
            ? await replyToMsg.reply(thinkingText)
            : await targetChannel.send(thinkingText);

        try {
            const { answer, sources } = await answerQuestion(prompt, client, history, userId);
            let finalContent = answer;
            if (isDebug) {
                const sourceList = sources.map((s, i) =>
                   `**[${i+1}]** \`${s.metadata.source_id}\` (Score: ${s.score.toFixed(3)})`
                ).join('\n');
                finalContent += `\n\n---\n🛠️ **DEBUG:**\n${sourceList}`;
            }
            await thinkingMsg.edit(finalContent);
        } catch (error) {
            console.error(isResumption ? 'AI Resumption Error:' : 'AI First Answer Error:', error);
            const errorText = isResumption
                ? `${config.emoji.no} Lỗi khi tiếp tục hội thoại.`
                : `${config.emoji.no} Lỗi khi xử lý câu hỏi đầu tiên. Bạn có thể thử đặt câu hỏi khác ngay tại thread này.`;
            await thinkingMsg.edit(errorText);
        }
    };

    if (isBotThread) {
        if (!question) {
            return message.reply('Hội thoại đã được làm mới! Tôi có thể giúp gì thêm cho bạn?');
        }
        const history = await getThreadHistory(message.channel, [message.id], client);
        return await processAIResponse(message.channel, question, history, message, true);
    }

    const thread = await message.channel.threads.create({
        name: `${config.ai.thread_name_prefix} ${message.author.username}`,
        autoArchiveDuration: config.ai.thread_archive_minutes,
        reason: 'AI Support session',
    });
    await thread.members.add(userId);

    if (!question) {
        return thread.send(`👋🏿 Xin chào <@${userId}>! Tôi có thể giúp gì cho bạn không?`);
    } else {
        return await processAIResponse(thread, question, "", null, false);
    }
  }
}

module.exports = new AskCommand();