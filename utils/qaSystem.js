const { GoogleGenerativeAI } = require("@google/generative-ai");
const Knowledge = require("../models/Knowledge");
const Cokemon = require("../models/cokemon/Cokemon");
const config = require("../data/config");
const { cleanString } = require("./miscUtil");
const { getItem, getGenderText, getTypeText } = require("./cokemonUtil");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const getRulesContext = async (userQuestion) => {
  try {
    const embedModel = genAI.getGenerativeModel({
      model: config.ai.embedding_model,
    });
    const res = await embedModel.embedContent({
      content: { parts: [{ text: userQuestion }] },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: config.ai.embedding_dimensions,
    });
    const questionVector = res.embedding.values;

    return await Knowledge.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: questionVector,
          numCandidates: 10,
          limit: 3,
        },
      },
      {
        $project: {
          content: 1,
          metadata: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
  } catch (error) {
    console.error("Vector Search Error:", error);
    return [];
  }
};

const getSpeciesContext = (userQuestion, client) => {
  const cleanedQuestion = cleanString(userQuestion);
  const mentionedSpecies = client.allSpecies.filter((s) =>
    cleanedQuestion.includes(s.name.toLowerCase()),
  );

  if (mentionedSpecies.length === 0) return "";

  const formatSpeciesData = (species) => {
    const formatEvoLine = (evo) => {
      const target = client.allSpecies.find(
        (s) => s._id.toString() === evo.species_id?.toString(),
      );
      const targetName = target ? target.name : "loài tiếp theo";

      const conditionSentences = evo.conditions.map((c) => {
        switch (c.type) {
          case "level_up":
            return `đạt cấp ${c.value}`;
          case "trade":
            return `được trao đổi (trade)`;
          case "item":
            return `sử dụng vật phẩm ${getItem(client, c.value).name} ${getItem(client, c.value).emoji}`;
          case "trade_item":
            return `được trao đổi (trade) và đang giữ ${getItem(client, c.value).name} ${getItem(client, c.value).emoji}`;
          case "held_item":
            return `đang giữ ${getItem(client, c.value).name} ${getItem(client, c.value).emoji}`;
          case "friendship":
            return `có điểm tình bạn cao (trên ${c.value})`;
          case "gender":
            return `là giới tính ${getGenderText(c.value)}`;
          case "time_of_day":
            return `vào ${c.value === "day" ? "ban ngày" : "ban đêm"}`;
          case "stat_comparison":
            return `có ${c.value.stat1} ${c.value.operator} ${c.value.stat2}`;
          case "personality":
            return `tùy thuộc vào cá tính`;
          case "location":
            return `ở nơi có ${c.value} (${getTypeText(c.value)})`;
          case "move_known":
            return `sau khi học ${c.value}`;
          default:
            return "thỏa mãn điều kiện đặc biệt";
        }
      });
      return `- **${species.name}** tiến hóa thành **${targetName}** khi ${conditionSentences.join(" và ")}.`;
    };

    const evolutionDocs =
      species.evolution?.length > 0
        ? species.evolution.map(formatEvoLine).join("\n")
        : `- ${species.name} không có hình thái tiến hóa thêm.`;

    const abilities = species.available_abilities
      .map((a) =>
        a.is_hidden ? `${a.ability.name} (Hidden Ability)` : a.ability.name,
      )
      .join(", ");

    return `
        SPECIFIC DATA FOR ${species.name.toUpperCase()}:
        - ID: #${species.dex_id}
        - Emoji: ${species.emoji}
        - Type: ${species.type.join("/")}
        - Tier: ${species.tier}
        - Abilities: ${abilities}
        - Base Stats: HP ${species.base_stats.hp}, Atk ${species.base_stats.atk}, Def ${species.base_stats.def}, SpAtk ${species.base_stats.spatk}, SpDef ${species.base_stats.spdef}, Spd ${species.base_stats.spd}
        - Evolution Methods: ${evolutionDocs}
        `;
  };
  return mentionedSpecies.map(formatSpeciesData).join("\n\n");
};

const getAbilitiesContext = (userQuestion, client) => {
  const words = cleanString(userQuestion).split(" ");
  const uniqueAbilities = new Map();

  client.allSpecies.forEach((species) => {
    species.available_abilities.forEach((a) => {
      const ability = a.ability;
      if (
        words.some((word) =>
          ability.name.toLowerCase().includes(word.toLowerCase()),
        )
      ) {
        uniqueAbilities.set(ability._id.toString(), ability);
      }
    });
  });

  if (uniqueAbilities.size === 0) return "";

  const abilitiesText = Array.from(uniqueAbilities.values())
    .map(
      (a) =>
        `- Name: ${a.name}
          Description: ${a.description}`,
    )
    .join("\n");

  return `
    SPECIFIC DATA FOR ABILITIES:
    ${abilitiesText}
    `;
};

const getItemsContext = (userQuestion, client) => {
  const cleanedQuestion = cleanString(userQuestion);

  const hasEvoKeywords =
    cleanedQuestion.includes("tiến hóa") ||
    cleanedQuestion.includes("evolve") ||
    cleanedQuestion.includes("thành");
  const mentionedSpecies = client.allSpecies.filter((s) =>
    cleanedQuestion.includes(s.name.toLowerCase()),
  );
  const needsItemEvo = mentionedSpecies.some((s) =>
    s.evolution?.some((evo) =>
      evo.conditions.some((c) =>
        ["item", "held_item", "trade_item"].includes(c.type),
      ),
    ),
  );

  let mentionedItems = client.allItems.filter(
    (item) =>
      cleanedQuestion.includes(item.name.toLowerCase()) ||
      cleanedQuestion.includes(item.item_id.toLowerCase()),
  );

  
  if (hasEvoKeywords || needsItemEvo) {
    const evoItems = client.allItems.filter(
      (i) =>
        i.item_type === "evolution_stone" ||
        i.item_id.includes("stone") ||
        i.item_id.includes("coat") ||
        i.item_id.includes("scale"),
    );
    mentionedItems = [
      ...new Map(
        [...mentionedItems, ...evoItems].map((item) => [item.item_id, item]),
      ).values(),
    ];
  }

  if (mentionedItems.length === 0) return "";

  const itemsText = mentionedItems
    .map(
      (item) =>
        `- Vietnamese Name: ${item.name} | INTERNAL ID: ${item.item_id} | Category: ${item.item_type} | Price: ${item.price?.toLocaleString()} Coke`,
    )
    .join("\n");

  return `
    ITEM MAPPING (ALWAYS use 'INTERNAL ID' for commands):
    ${itemsText}
    `;
};

const getUserCokemonContext = async (userId) => {
  const userCokemons = await Cokemon.find({ owner_id: userId })
    .populate("species_id")
    .sort({ level: -1 })
    .limit(50) 
    .lean();

  if (userCokemons.length === 0) return "User currently owns 0 Cokemon.";

  const cokemons = userCokemons
    .filter((c) => c.species_id)
    .map(
      (c) =>
        `- ID: ${c.uid} | Name: ${c.nickname || c.species_id.name} | Type: ${c.species_id.type.join("/")} | Level: ${c.level}`,
    )
    .join("\n");

  return `
    USER'S PRIVATE COLLECTION:
    ${cokemons}
    `;
};

const answerQuestion = async (userQuestion, client, historyText, userId) => {
  const [rulesResults, userCokemonContext] = await Promise.all([
    getRulesContext(userQuestion),
    getUserCokemonContext(userId),
  ]);

  const rulesContext = rulesResults.map((r) => r.content).join("\n");
  const speciesContext = getSpeciesContext(userQuestion, client);
  const abilitiesContext = getAbilitiesContext(userQuestion, client);
  const itemsContext = getItemsContext(userQuestion, client);

  const formattedHistory =
    historyText && historyText.length > 0
      ? `CONVERSATION HISTORY:\n${historyText}\n`
      : "";

  const model = genAI.getGenerativeModel({ model: config.ai.generative_model });
  const systemPrompt = `
    You are Cola, the official AI Assistant for Cokebot on Discord.
    You help users with game rules, mechanics, and Cokemon info.

    STRICT GUIDELINES:
    1. Answer based ONLY on the "CONTEXT" section provided below.
    2. If the user asks about private info (another player's balance, inventory, or caught Cokemon), politely refuse. 
    3. You cannot see live player data. Instruct them to use commands like ${config.prefix}coke or ${config.prefix}inv.
    4. You NOW HAVE access to the user's private collection below. Use it to answer specific questions about their Cokemon.
    5. Language: ALWAYS respond in Vietnamese.
    6. Tone: Be energetic, playful, and obsessed with Coke (the soda). Occasionally use soda-themed puns (e.g., "Sủi bọt thôi!", "Mát lạnh như một lon Coke!"). Use Discord emojis like 🥤, ✨, 🫧, 🧊. Talk like a cool gamer friend.
    7. CREATIVE FREEDOM: DO NOT simply copy-paste the context. Rephrase it in your own words. Be dramatic and enthusiastic, especially when talking about legends like Myth! Make every answer feel unique!

    [COMMAND GENERATION RULES]
    - When generating commands, ALWAYS use the "INTERNAL ID" from the ITEM MAPPING section, never the Vietnamese name.
    - When a user wants to view, filter, release, or interact with Cokemon, look for a matching "Nhóm" or "Mục tiêu" in the [GENERAL RULES] section.
    - If you find a matching intent, provide the exact command shown in that rule as a baseline.
    - If you need to combine filters (e.g., Fire type AND low Level), follow the syntax patterns described in the command's "Cách dùng" or "Ví dụ".
    - Use the [USER'S PRIVATE COLLECTION] to refer to Cokemon by their ID if the user mentions a specific one.
      - Evolution Guide: When a user asks how to evolve their Cokemon, provide these steps:
        1. Identify the requirement from [SPECIES DATA] (e.g., Level, Item, Trade, etc.).
        2. If an ITEM is needed: Tell them to give the item (\`${config.prefix}interact give <id> <item_id}\`) then evolve (\`${config.prefix}evolve <id}\`).
        3. If a TRADE is needed: Tell them to trade (\`${config.prefix}trade <id> <@user}\`). If it also needs an item, tell them to give it first.
        4. For others (Level, Friendship, etc.): Tell them to use \`${config.prefix}evolve <id}\` once ready.
    - ALWAYS provide the exact command string in backticks.

    CONTEXT:
    ---
    [GENERAL RULES]
    ${rulesContext}

    [SPECIES DATA]
    ${speciesContext}

    [ABILITY DATA]
    ${abilitiesContext}

    [ITEM DATA]
    ${itemsContext}

    [USER'S PRIVATE COLLECTION]
    ${userCokemonContext}
    ---

    [CONVERSATION HISTORY]
    ${formattedHistory || "No previous history."}

    [CURRENT USER QUESTION]: "${userQuestion}"
    `;

  try {
    const result = await model.generateContent(systemPrompt);
    const answer = result.response.text();
    return { answer, sources: rulesResults };
  } catch (error) {
    console.error("Gemini Error:", error);
    const funnyErrors = [
      "Ối! Máy chủ vừa bị sặc khí gas rồi. Đợi tôi lau dọn tí nhé! 🫧",
      "Hết đường rồi! Tôi cần nạp thêm một lon Coke để suy nghĩ tiếp. Thử lại sau nha! 🥤",
      "Đang bị kẹt nắp chai... không mở não ra được. Bạn hỏi lại sau nhé! 🧊",
    ];
    return {
      answer: funnyErrors[Math.floor(Math.random() * funnyErrors.length)],
      sources: rulesResults,
    };
  }
};

const getThreadHistory = async (channel, excludeIds = [], client) => {
  const thinkingTexts = [
    "🤔 *Đang tra cứu lại thông tin...*",
    "🤔 *Đang suy nghĩ...*",
  ];
  const rawMessages = await channel.messages.fetch({
    limit: config.ai.ask_history_limit,
  });
  return rawMessages
    .reverse()
    .filter((m) => !excludeIds.includes(m.id)) 
    .filter((m) => {
      if (m.author.id !== client.user.id) return true;
      const isInitialGreeting = /^🤔 <@!?\d+> ơi/.test(m.content);
      const isStaticThinking = thinkingTexts.includes(m.content.trim());
      return !isInitialGreeting && !isStaticThinking;
    })
    .map((m) => {
      const role = m.author.id === client.user.id ? "Assistant" : "User";
      let content = m.content;
      if (content.toLowerCase().startsWith(`${config.prefix}ask`)) {
        content = content.slice(`${config.prefix}ask`.length).trim();
      }
      return `${role}: ${content}`;
    })
    .join("\n");
};

module.exports = { answerQuestion, getThreadHistory };
