"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = loadPlugins;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const pluginsFolder = node_path_1.join(
  process.cwd(),
  "dist",
  "plugin",
  "plugins",
);
async function loadPlugins(client) {
  try {
    const pluginFiles = node_fs_1
      .readdirSync(pluginsFolder)
      .filter((file) => file.endsWith(".js"));
    for (const file of pluginFiles) {
      const pluginPath = node_path_1.join(pluginsFolder, file);
      const { default: plugin } = require(pluginPath);
      if (plugin.initialize) plugin.initialize(client);
      client.logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
    }
  } catch (error) {
    client.logger.error("Error loading plugins:", error);
  }
}
