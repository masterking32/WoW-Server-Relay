class RealmSession {
  constructor(config, socket, logger) {
    this.config = config;
    this.socket = socket;
    this.logger = logger;
  }
}

export default RealmSession;
