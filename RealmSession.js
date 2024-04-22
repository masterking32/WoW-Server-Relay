// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

class RealmSession {
  constructor(config, socket, logger) {
    this.config = config;
    this.socket = socket;
    this.logger = logger;
  }
}

export default RealmSession;
