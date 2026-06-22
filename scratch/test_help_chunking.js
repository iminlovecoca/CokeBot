const path = require("path");
const fs = require("fs");
const { Collection } = require("discord.js");
const config = require("../data/config");
const helpCmd = require("../commands/user/help.js");

// Mock client with loaded commands
const client = {
  user: {
    displayAvatarURL: () => "https://example.com/avatar.png"
  },
  commands: new Collection(),
  noituCommands: new Collection()
};

// Load real commands from workspace
const loadFiles = (dir, callback) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      loadFiles(filePath, callback);
    } else if (file.endsWith(".js")) {
      callback(filePath);
    }
  }
};

loadFiles(path.join(__dirname, "../commands"), (filePath) => {
  try {
    const cmd = require(filePath);
    if (cmd && cmd.name) {
      cmd.filePath = filePath;
      if (filePath.includes(`${path.sep}commands${path.sep}noitu${path.sep}`)) {
        client.noituCommands.set(cmd.name, cmd);
      } else {
        client.commands.set(cmd.name, cmd);
      }
    }
  } catch (err) {
    // Ignore require errors for files that might require bot client or setup
  }
});

console.log(`Loaded ${client.commands.size} main commands.`);
console.log(`Loaded ${client.noituCommands.size} noitu commands.`);

const mockMessage = {
  author: {
    id: "745950731638407210", // Owner ID (has showAdmin = true)
    username: "TestOwner"
  },
  client: client,
  reply: async (payload) => {
    console.log("\n--- REPLY EMBEDS ---");
    if (payload.embeds) {
      payload.embeds.forEach(embed => {
        console.log("Title:", embed.data.title);
        console.log("Fields count:", embed.data.fields ? embed.data.fields.length : 0);
        if (embed.data.fields) {
          embed.data.fields.forEach(f => {
            console.log(`\nField Name: [${f.name}]`);
            console.log(`Field Value:\n${f.value}`);
          });
        }
      });
    }
    return {
      createMessageComponentCollector: () => {
        // Return a mock collector that immediately fires a select event
        return {
          on: (event, callback) => {
            if (event === "collect") {
              // Simulate selecting the "admin" category
              console.log("\n--- Simulating selecting 'admin' category from select menu ---");
              const mockInteraction = {
                isStringSelectMenu: () => true,
                values: ["admin"],
                deferUpdate: async () => {},
                editReply: async (updatePayload) => {
                  console.log("\n--- EDIT REPLY (Admin Category Embeds) ---");
                  updatePayload.embeds.forEach(embed => {
                    console.log("Title:", embed.data.title);
                    console.log("Description:", embed.data.description);
                    console.log("Fields count:", embed.data.fields ? embed.data.fields.length : 0);
                    if (embed.data.fields) {
                      embed.data.fields.forEach(f => {
                        console.log(`\nField Name: [${f.name}]`);
                        console.log(`Field Value:\n${f.value}`);
                      });
                    }
                  });
                }
              };
              callback(mockInteraction);
            }
          },
          end: () => {}
        };
      },
      edit: () => {}
    };
  }
};

async function test() {
  await helpCmd.execute(mockMessage, []);
}

test().then(() => {
  console.log("\n✅ Test completed successfully!");
  process.exit(0);
}).catch(err => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
