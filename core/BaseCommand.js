class BaseCommand {
  constructor({ name, aliases = [], description = '', usage = '', examples = [], category = 'general' }) {
    this.name = name;
    this.aliases = aliases;
    this.description = description;
    this.usage = usage;
    this.examples = examples;
    this.category = category;
  }

  /**
   * Execute the command.
   * @param {Object} message - Discord message object
   * @param {Array} args - Command arguments
   * @param {Object} client - Discord client instance
   * @param {Object} locator - ServiceLocator instance to retrieve services
   */
  async execute(message, args, client, locator) {
    throw new Error('Execute method must be implemented by subclass.');
  }
}

module.exports = BaseCommand;
