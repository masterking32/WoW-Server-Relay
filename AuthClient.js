import Net from "net";
import { RELAY_SERVER_CMD } from "./opcodes.js";

class AuthClient {
  constructor(ip, port, secret_key, client_ip, authChallengePayload, logger) {
    this.ip = ip;
    this.port = port;
    this.logger = logger;
    this.secret_key = secret_key;
    this.client_ip = client_ip;
    this.authChallengePayload = authChallengePayload;
  }

  run() {
    this.socket = Net.createConnection(this.port, this.ip, () => {
      this.logger.info(`Connected to ${this.ip}:${this.port}`);
      let relay_packet = Buffer.alloc(
        this.secret_key.length + this.client_ip.length + 9
      );
      relay_packet.writeUInt8(RELAY_SERVER_CMD, 0);
      relay_packet.writeUInt32LE(this.secret_key.length, 1);
      relay_packet.write(this.secret_key, 5);
      relay_packet.writeUInt32LE(
        this.client_ip.length,
        5 + this.secret_key.length
      );
      relay_packet.write(this.client_ip, 9 + this.secret_key.length);
      this.socket.write(relay_packet);

      this.socket.write(this.authChallengePayload);
    });
  }

  stop() {
    this.socket.destroy();
  }
}

export default AuthClient;
