const { Events } = require("discord.js");
const { getOrCreateUser } = require("../utils/userUtil");
const { formatDuration } = require("../utils/miscUtil");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      
      const user = await getOrCreateUser(interaction.user.id);
      if (user.bannedUntil && user.bannedUntil > new Date()) {
        const remainingMs = new Date(user.bannedUntil).getTime() - Date.now();
        const replyOptions = {
          content: `🚫 Bạn đang bị cấm sử dụng bot trong ${formatDuration(Math.floor(remainingMs / 1000))} còn lại.`,
          flags: 64, 
        };
        if (interaction.deferred || interaction.replied) {
          return interaction.followUp(replyOptions).catch(() => {});
        }
        return interaction.reply(replyOptions).catch(() => {});
      }

      if (interaction.isButton()) {
        if (interaction.customId.startsWith("rpg_boss_fight:")) {
          const bossCommand = client.commands.get("boss");
          if (bossCommand?.handleFightInteraction) {
            await bossCommand.handleFightInteraction(interaction);
          }
        } else if (interaction.customId.startsWith("rpg_boss_revive:")) {
          const bossCommand = client.commands.get("boss");
          if (bossCommand?.handleReviveInteraction) {
            await bossCommand.handleReviveInteraction(interaction);
          }
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        const originalReply = interaction.reply.bind(interaction);
        const originalFollowUp = interaction.followUp.bind(interaction);
        interaction.reply = async (options) => {
          const payload =
            options && typeof options === "object" && options.ephemeral
              ? { ...options, flags: 64, ephemeral: undefined }
              : options;

          if (interaction.replied || interaction.deferred) {
            return originalFollowUp(payload);
          }

          try {
            return await originalReply(payload);
          } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
              return originalFollowUp(payload).catch(() => {});
            }
            throw error;
          }
        };

        const command =
          client.commands.get(interaction.commandName) ||
          client.noituCommands.get(interaction.commandName);
        if (!command || !command.data) return;
        await command.execute(interaction, client);
        return;
      }
    } catch (error) {
      console.error(
        `Interaction Error${interaction.commandName ? ` [/${interaction.commandName}]` : ""}:`,
        error,
      );
      const payload = {
        content: "An error occurred while executing this command!",
        flags: 64,
      };

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(payload).catch(() => {});
      }
      return interaction.reply(payload).catch(() => {});
    }
  },
};
