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
    this.config = config;
  }

  run() {
    this.socket = Net.createConnection(this.port, this.ip, () => {
      this.logger.info(`[RealmClient] Connected to ${this.ip}:${this.port}`);

      if (this.config.send_relay_packet) {
        this.logger.debug(
          `[RealmClient] Sending Relay Packet: ${this.secret_key} ${this.client_ip}`
        );

        const secret_key = this.secret_key + "\0";
        const client_ip = this.client_ip + "\0";
        const packet_data_size = secret_key.length + client_ip.length + 10;

        let relay_packet = Buffer.alloc(packet_data_size);

        relay_packet.writeUint16BE(packet_data_size - 2); // Packet size (excluding size field but including opcode)
        relay_packet.writeUint32LE(RELAY_SERVER_CMD_WORLD, 2);
        relay_packet.write(secret_key, 6); // Terminal null byte is included in the secret key
        relay_packet.write(client_ip, 6 + secret_key.length); // Terminal null byte is included in the client IP
        this.socket.write(relay_packet);
        this.logger.debug(
          `[RealmClient] Sent Relay Packet: ${relay_packet.toString(
            "hex"
          )}, length: ${relay_packet.length} bytes`
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
