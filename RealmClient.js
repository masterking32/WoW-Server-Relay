// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

import Net from "net";
import { RELAY_SERVER_CMD_WORLD } from "./opcodes.js";

class RealmClient {
  constructor(config, client_ip, realm, logger, onStop, onData) {
    this.ip = realm.realm_ip;
    this.port = realm.realm_port;
    this.logger = logger;
    this.secret_key = config.secret_key;
    this.client_ip = client_ip;
    this.realm = realm;
    this.onStop = onStop;
    this.onData = onData;
    this.isReady = false;
    this.isEnded = false;
  }

  run() {
    this.socket = Net.createConnection(this.port, this.ip, () => {
      this.logger.info(`[RealmClient] Connected to ${this.ip}:${this.port}`);

      if (this.send_relay_packet) {
        let relay_packet = Buffer.alloc(
          this.secret_key.length + this.client_ip.length + 9
        );
        relay_packet.writeUInt16(RELAY_SERVER_CMD_WORLD, 0);
        relay_packet.writeUInt32LE(this.secret_key.length, 1);
        relay_packet.write(this.secret_key, 5);
        relay_packet.writeUInt32LE(
          this.client_ip.length,
          5 + this.secret_key.length
        );
        relay_packet.write(this.client_ip, 9 + this.secret_key.length);
        this.socket.write(relay_packet);
        this.logger.debug(
          `[RealmClient] Sent Relay Packet: ${relay_packet.toString("hex")}`
        );
      }

      this.isReady = true;
    });

    this.socket.on("data", this.onSocketData.bind(this));
    this.socket.on("error", this.onSocketError.bind(this));
    this.socket.on("close", this.onSocketClose.bind(this));
    this.socket.on("timeout", this.onSocketTimeout.bind(this));
  }

  async onSocketData(data) {
    this.logger.debug(`[RealmClient] Received ${data.length} bytes`);
    this.onData(data);
  }

  onSocketError(error) {
    this.logger.error(`[RealmClient] Error: ${error.message}`);
    this.stop();
  }

  onSocketClose() {
    this.logger.info("[RealmClient] Connection closed");
    this.stop();
  }

  onSocketTimeout() {
    this.logger.info("[RealmClient] Connection timeout");
    this.stop();
  }

  WriteData(data) {
    if (this.isEnded) {
      return;
    }

    this.logger.debug(`[RealmClient] Sending ${data.length} bytes`);
    this.socket.write(data);
  }

  stop() {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.logger.info("[RealmClient] Stopping");
    this.onStop();
    this.socket.destroy();
  }
}

export default RealmClient;
