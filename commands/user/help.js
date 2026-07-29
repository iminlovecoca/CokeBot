const BaseCommand = require('../../core/BaseCommand');
const { EmbedBuilder } = require("discord.js");
const path = require("path");
const config = require("../../data/config");

const categoryTranslations = {
  action: "Hành động",
  admin: "Quản trị viên",
  cokecy: "Kinh tế",
  cokemon: "Cokemon",
  config: "Cấu hình",
  gamble: "Casino",
  general: "Thông tin chung",
  noitu: "Nối từ",
  rpg: "RPG",
  shop: "Cửa hàng",
  user: "Cá nhân"
};

class HelpCommand extends BaseCommand {
  constructor() {
    super({
      name: "help",
      aliases: ["h", "commands"],
      description: "Hiển thị danh sách tất cả các lệnh có sẵn.",
      usage: `${config.prefix}help [lệnh]`,
      examples: [
        { intent: "Xem danh sách các lệnh", command: `${config.prefix}help` },
        {
          intent: "Xem hướng dẫn chi tiết cho lệnh cokemon",
          command: `${config.prefix}help cokemon`,
        },
      ],
      category: 'user'
    });
  }

  async execute(message, args, client, locator) {
    const userService = locator.get('userService');
    const userId = message.author.id;
    const showAdmin = userService.isDev(userId) || userService.isAdmin(userId) || userService.isOwner(userId);
    const commands = message.client.commands;
    const noituCommands = message.client.noituCommands || new Map();

    const findCommand = (commandName) => {
      const mainCommand =
        commands.get(commandName) ||
        commands.find(
          (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
        );
      if (mainCommand) {
        return { command: mainCommand, scope: "main" };
      }

      const noituCommand =
        noituCommands.get(commandName) ||
        noituCommands.find(
          (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
        );
      if (noituCommand) {
        return { command: noituCommand, scope: "noitu" };
      }

      return null;
    };

    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const found = findCommand(commandName);
      if (!found) {
        return message.reply("Đó không phải là một lệnh hợp lệ!");
      }

      const { command, scope } = found;
      const isAdminCommand = command.filePath && path.dirname(require.resolve(command.filePath)).endsWith("admin");
      if (isAdminCommand && !showAdmin) {
        return message.reply("Đó không phải là một lệnh hợp lệ!");
      }

      const commandPrefix =
        scope === "noitu" ? `${config.prefix} noitu ` : `${config.prefix}`;

      const detailEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`Hướng dẫn cho lệnh: \`${commandPrefix}${command.name}\``)
        .addFields({
          name: "Mô tả",
          value: command.description || "Không có mô tả.",
        });

      if (command.aliases && command.aliases.length > 0) {
        detailEmbed.addFields({
          name: "Tên khác",
          value: `\`${command.aliases.join("`, `")}\``,
          inline: true,
        });
      }
      if (command.usage) {
        detailEmbed.addFields({
          name: "Cách dùng",
          value: command.usage,
          inline: true,
        });
      }
      if (command.examples) {
        let examplesValue;
        if (Array.isArray(command.examples)) {
          examplesValue = command.examples
            .map((ex) =>
              typeof ex === "object" && ex.command
                ? `**${ex.intent || "Ví dụ"}:** \`${ex.command}\``
                : String(ex),
            )
            .join("\n");
        } else {
          examplesValue = String(command.examples);
        }
        if (examplesValue.length > 0) {
          detailEmbed.addFields({ name: "Ví dụ", value: examplesValue });
        }
      }
      return message.reply({ embeds: [detailEmbed] });
    } else {
      const grouped = {};
      commands.forEach((cmd) => {
        if (cmd.hidden) return;
        const cat = cmd.category || 'general';
        if (cat === 'admin' && !showAdmin) return;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(cmd.name);
      });

      for (const cat in grouped) {
        grouped[cat].sort();
      }

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setAuthor({
          name: "Command List",
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setDescription(
          `Dưới đây là danh sách các lệnh của Coke!\n` +
          `Để biết thêm thông tin chi tiết của từng lệnh, sử dụng \`${config.prefix}help {tên lệnh}\``
        );

      const categoryOrder = [
        "user",
        "cokecy",
        "shop",
        "gamble",
        "rpg",
        "cokemon",
        "action",
        "general",
        "config",
        "admin"
      ];

      categoryOrder.forEach((cat) => {
        const cmdNames = grouped[cat];
        if (cmdNames && cmdNames.length > 0) {
          const emoji = config.category_emojis[cat] || config.category_emojis["default"] || "➡️";
          const categoryName = categoryTranslations[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
          
          embed.addFields({
            name: `${emoji} ${categoryName}`,
            value: cmdNames.map(name => `\`${name}\``).join(" "),
          });
        }
      });

      Object.keys(grouped).forEach((cat) => {
        if (!categoryOrder.includes(cat)) {
          const cmdNames = grouped[cat];
          if (cmdNames && cmdNames.length > 0) {
            const emoji = config.category_emojis[cat] || config.category_emojis["default"] || "➡️";
            const categoryName = categoryTranslations[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
            embed.addFields({
              name: `${emoji} ${categoryName}`,
              value: cmdNames.map(name => `\`${name}\``).join(" "),
            });
          }
        }
      });

      return message.reply({ embeds: [embed] });
    }
  }
}

module.exports = new HelpCommand();
