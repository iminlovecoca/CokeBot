class ServiceLocator {
  constructor() {
    this.services = new Map();
  }

  register(name, instance) {
    this.services.set(name, instance);
  }

  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not found in ServiceLocator.`);
    }
    return this.services.get(name);
  }
}

module.exports = ServiceLocator;
