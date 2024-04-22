// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

import RealmClient from "./RealmClient.js";

class RealmSession {
  constructor(realm_id, realm, config, socket, logger) {
    this.config = config;
    this.socket = socket;
    this.logger = logger;
    this.isEnded = false;
    this.realm_id = realm_id;
    this.realm = realm;
  }

  run() {
    this.client = new RealmClient(
      this.config,
      this.socket.remoteAddress.includes("::ffff:")
        ? this.socket.remoteAddress.replace("::ffff:", "")
        : this.socket.remoteAddress,
      this.realm,
      this.logger,
      this.stop.bind(this),
      (data) => {
        this.socket.write(data);
      }
    );
    this.client.run();

    this.socket.on("data", (data) => {
      if (this.isEnded) {
        return;
      }
      if (!this.client) {
        this.logger.error("[RealmSession] Client is not ready yet");
        return;
      }
      this.client.socket.write(data);
    });

    this.socket.on("close", () => {
      this.stop();
    });

    this.socket.on("error", (error) => {
      this.logger.error("[RealmSession] Socket error", error);
      this.stop();
    });
  }

  stop() {
    if (this.isEnded) {
      return;
    }

    this.logger.debug("[AuthSession] Stopping session");
    this.isEnded = true;

    if (this.client) {
      this.client.stop();
    }

    this.socket.destroy();
  }
}

export default RealmSession;
