// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

import Logger from "@ptkdev/logger";
import Net from "net";
import AuthSession from "./AuthSession.js";
import RealmSession from "./RealmSession.js";

class RelayServer {
  constructor(config) {
    const options = {
      language: "en",
      colors: true,
      debug: config.log_level === "debug",
      info: config.log_level === "info" || config.log_level === "debug",
      warning:
        config.log_level === "warning" ||
        config.log_level === "info" ||
        config.log_level === "debug",
      error:
        config.log_level === "error" ||
        config.log_level === "warning" ||
        config.log_level === "info" ||
        config.log_level === "debug",
      sponsor: false,
      write: false,
      type: "log",
    };

    this.logger = new Logger(options);
    this.config = config;

    this.auth_server = Net.createServer((socket) => {
      let session = new AuthSession(config, socket, this.logger);
      session.run();
    });

    this.realms = {};
    for (let realm of config.realms) {
      this.realms[realm.realm_id] = Net.createServer((socket) => {
        this.logger.info(
          `New connection from ${socket.remoteAddress} to realm "${realm.realm_name}"`
        );

        let session = new RealmSession(config, socket, this.logger);
        session.run();
      });
    }
  }

  run() {
    this.auth_server.listen(this.config.auth_port, () => {
      this.logger.info(
        `Auth server listening on port ${this.config.auth_port}`
      );
    });

    for (let realm of this.config.realms) {
      this.realms[realm.realm_id].listen(realm.realm_port, () => {
        this.logger.info(
          `Realm server listening on port ${realm.realm_port} - ${realm.realm_name}`
        );
      });
    }
  }

  stop() {
    this.auth_server.close();
    for (let realm of this.realms) {
      realm.close();
    }

    this.logger.info("Server stopped");
  }
}

export default RelayServer;
