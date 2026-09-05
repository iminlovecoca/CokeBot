const { Events } = require("discord.js");
const { getOrCreateUser } = require("../utils/userUtil");
const { formatDuration } = require("../utils/miscUtil");
const { getErrorCode, isTransientNetworkError } = require("../utils/networkErrors");

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
        const command =
          client.commands.get(interaction.commandName) ||
          client.noituCommands.get(interaction.commandName);
        if (!command || !command.data) return;
        await command.execute(interaction, client);
        return;
      }
    } catch (error) {
      if (isTransientNetworkError(error)) {
        console.warn(
          `[TRANSIENT_INTERACTION_ERROR] ${interaction.commandName || interaction.customId || "unknown"} (${getErrorCode(error)}):`,
          error?.message || error,
        );
        return;
      }
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
