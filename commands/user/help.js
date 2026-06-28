const BaseCommand = require('../../core/BaseCommand');
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../../data/config");

const categoryTranslations = {
  action: "Hành động",
  admin: "Quản trị viên",
  cokecy: "Kinh tế",
  cokemon: "Cokemon (Thú cưng)",
  config: "Cấu hình",
  gamble: "Trò chơi may rủi",
  general: "Thông tin chung",
  noitu: "Nối từ",
  rpg: "RPG (Nhập vai)",
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
    const ownerId = "745950731638407210";
    const showAdmin = userService.isDev(userId) || userService.isAdmin(userId) || userId === ownerId || userId === process.env.OWNER_ID;
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
      let commandFolders = fs.readdirSync(
        path.join(__dirname, "../../commands"),
      ).filter((item) => {
        const fullPath = path.join(__dirname, "../../commands", item);
        return fs.statSync(fullPath).isDirectory() && item !== "noitu";
      });
      if (!showAdmin) {
        commandFolders = commandFolders.filter((folder) => folder !== "admin");
      }
      let currentCategory = "main";

      const generateEmbed = (category) => {
        const embed = new EmbedBuilder()
          .setColor("#5865F2")
          .setAuthor({
            name: "Bảng Hướng Dẫn Sử Dụng Lệnh",
            iconURL: message.client.user.displayAvatarURL(),
          });

        if (category === "main") {
          let desc = commandFolders
            .map((folder) => {
              const emoji =
                config.category_emojis[folder] ||
                config.category_emojis["default"];
              const categoryName =
                categoryTranslations[folder.toLowerCase()] ||
                (folder.charAt(0).toUpperCase() + folder.slice(1));
              return `- ${emoji} **${categoryName}**`;
            })
            .join("\n");

          if (showAdmin) {
            const packageJson = require("../../package.json");
            desc += `\n\n**Phiên bản bot:** \`v${packageJson.version}\``;
          }

          embed.setTitle("Chọn một danh mục để xem các lệnh").setDescription(desc);
        } else {
          if (category === "admin" && !showAdmin) {
            return embed
              .setColor("#FF0000")
              .setTitle("⚠️ Lỗi")
              .setDescription("Bạn không có quyền truy cập danh mục này.");
          }
          const emoji =
            config.category_emojis[category] ||
            config.category_emojis["default"];
          const categoryName =
            categoryTranslations[category.toLowerCase()] ||
            (category.charAt(0).toUpperCase() + category.slice(1));
          const isNoituCategory = category === "noitu";
          embed
            .setTitle(`${emoji} Lệnh trong danh mục: ${categoryName}`)
            .setDescription(
              `Nhập \`${config.prefix}help <lệnh>\` để biết thêm thông tin chi tiết.`,
            );

          const sourceCommands = isNoituCategory ? noituCommands : commands;
          const commandsInCategory = sourceCommands
            .filter((cmd) => {
              const commandPath = require.resolve(cmd.filePath);
              return path.dirname(commandPath).endsWith(category);
            })
            .filter((cmd) => !cmd.hidden);

          if (commandsInCategory.size > 0) {
            if (commandsInCategory.size <= 24) {
              commandsInCategory.forEach((cmd) => {
                embed.addFields({
                  name: `\`${isNoituCategory ? `${config.prefix} noitu ${cmd.name}` : `${config.prefix}${cmd.name}`}\``,
                  value: cmd.description || "Không có mô tả.",
                  inline: true,
                });
              });
            } else {
              let lines = [];
              commandsInCategory.forEach((cmd) => {
                const cmdName = isNoituCategory ? `noitu ${cmd.name}` : cmd.name;
                lines.push(`• \`${config.prefix}${cmdName}\`: ${cmd.description || "Không có mô tả."}`);
              });

              let currentFieldVal = "";
              let fieldIndex = 1;
              for (const line of lines) {
                if (currentFieldVal.length + line.length + 1 > 1000) {
                  embed.addFields({
                    name: `Danh sách lệnh (Phần ${fieldIndex})`,
                    value: currentFieldVal,
                  });
                  currentFieldVal = "";
                  fieldIndex++;
                }
                currentFieldVal += line + "\n";
              }
              if (currentFieldVal.length > 0) {
                embed.addFields({
                  name: fieldIndex > 1 ? `Danh sách lệnh (Phần ${fieldIndex})` : "Danh sách lệnh",
                  value: currentFieldVal,
                });
              }
            }
          } else {
            embed.setDescription("Không có lệnh nào trong danh mục này.");
          }
        }
        return embed;
      };

      const generateSelectMenu = () => {
        const options = commandFolders.map((folder) => {
          const categoryName =
            categoryTranslations[folder.toLowerCase()] ||
            (folder.charAt(0).toUpperCase() + folder.slice(1));
          return {
            label: categoryName,
            value: folder.toLowerCase(),
            description: `Xem các lệnh trong mục ${categoryName}.`,
          };
        });

        options.unshift({
          label: "Trang Chính",
          value: "main",
          description: "Quay lại danh sách các danh mục.",
        });
        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("help_category_select")
            .setPlaceholder("Chọn một danh mục...")
            .addOptions(options),
        );
      };

      const initialEmbed = generateEmbed(currentCategory);
      const initialComponents = generateSelectMenu();
      const replyMessage = await message.reply({
        embeds: [initialEmbed],
        components: [initialComponents],
        fetchReply: true,
      });

      const collector = replyMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 120000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "help_category_select") {
          currentCategory = i.values[0];
          const newEmbed = generateEmbed(currentCategory);
          await i.update({ embeds: [newEmbed] });
        }
      });

      collector.on("end", async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("help_category_select_disabled")
            .setPlaceholder("Chọn một danh mục...")
            .addOptions([
              {
                label: "Hết hạn",
                value: "expired",
                description: "Menu trợ giúp đã hết hạn tương tác.",
              },
            ])
            .setDisabled(true),
        );

        await replyMessage.edit({ components: [disabledRow] }).catch(() => {});
      });
    }
  }
}

module.exports = new HelpCommand();
