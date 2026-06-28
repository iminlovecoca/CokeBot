class BaseCommand {
  constructor({ name, aliases = [], description = '', usage = '', examples = [], category = 'general', ...rest }) {
    this.name = name;
    this.aliases = aliases;
    this.description = description;
    this.usage = usage;
    this.examples = examples;
    this.category = category;
    
    
    Object.assign(this, rest);
  }

  
  async execute(message, args, client, locator) {
    throw new Error('Execute method must be implemented by subclass.');
  }
}

module.exports = BaseCommand;
