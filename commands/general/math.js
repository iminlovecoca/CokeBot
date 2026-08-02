const BaseCommand = require("../../core/BaseCommand");
const config = require("../../data/config");

class MathCommand extends BaseCommand {
  constructor() {
    super({
      name: "math",
      aliases: ["calc", "calculator"],
      description: "Máy tính Casio — tính toán biểu thức toán học.",
      usage: `${config.prefix}math <biểu thức>`,
      examples: [
        {
          intent: "Phép tính cơ bản",
          command: `${config.prefix}math 5+8*9`,
        },
        {
          intent: "Căn bậc hai",
          command: `${config.prefix}math sqrt(225)`,
        },
        {
          intent: "Lượng giác với góc degree",
          command: `${config.prefix}math sin(30 deg)`,
        },
        {
          intent: "Ước chung lớn nhất",
          command: `${config.prefix}math gcd(120,96)`,
        },
        {
          intent: "Tổ hợp",
          command: `${config.prefix}math 10C3`,
        },
        {
          intent: "Chuyển sang nhị phân",
          command: `${config.prefix}math bin(255)`,
        },
      ],
      category: "general",
    });
  }

  async execute(message, args, client, locator) {
    // Join all arguments as a single expression (user may type spaces)
    const expression = args.join(" ").trim();

    if (!expression) {
      return message
        .reply(`Sử dụng: \`${config.prefix}math <biểu thức>\`\nVí dụ: \`${config.prefix}math sqrt(225)\``)
        .catch(() => {});
    }

    const mathService = locator.get("mathService");
    const { result, error } = mathService.evaluate(expression);

    if (error) {
      return message.reply(error).catch(() => {});
    }

    return message.reply(result).catch(() => {});
  }
}

module.exports = new MathCommand();
