// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

import Net from "net";
import {
  CMD_AUTH_LOGON_CHALLENGE,
  CMD_AUTH_LOGON_PROOF,
  CMD_AUTH_RECONNECT_CHALLENGE,
  CMD_AUTH_RECONNECT_PROOF,
  CMD_REALM_LIST,
  CMD_XFER_DATA,
  CMD_XFER_INITIATE,
  RELAY_SERVER_CMD_AUTH,
} from "./opcodes.js";

class AuthClient {
  constructor(config, client_ip, authChallengePayload, logger, onStop, onData) {
    this.ip = config.main_server_auth.host;
    this.port = config.main_server_auth.port;
    this.logger = logger;
    this.secret_key = config.secret_key;
    this.client_ip = client_ip;
    this.authChallengePayload = authChallengePayload;
    this.send_relay_packet = config.send_relay_packet;
    this.onStop = onStop;
    this.onData = onData;
    this.isReady = false;
    this.isEnded = false;
    this.config = config;
  }

  run() {
    this.socket = Net.createConnection(this.port, this.ip, () => {
      this.logger.info(`[AuthClient] Connected to ${this.ip}:${this.port}`);

      if (this.send_relay_packet) {
        let relay_packet = Buffer.alloc(
          this.secret_key.length + this.client_ip.length + 5
        );
        relay_packet.writeUInt8(RELAY_SERVER_CMD_AUTH, 0);
        relay_packet.writeUint16LE(this.secret_key.length, 1);
        relay_packet.writeUint16LE(this.client_ip.length, 3);
        relay_packet.write(this.secret_key, 5);
        relay_packet.write(this.client_ip, 5 + this.secret_key.length);
        this.socket.write(relay_packet);
        this.logger.debug(
          `[AuthClient] Sent Relay Packet: ${relay_packet.toString(
            "hex"
          )}, length: ${relay_packet.length} bytes`
        );
      }

      this.socket.write(this.authChallengePayload);
      this.logger.debug(
        `[AuthClient] Sent Auth Challenge Payload: ${this.authChallengePayload.toString()}`
      );
      this.isReady = true;
    });

    this.socket.on("data", this.onSocketData.bind(this));
    this.socket.on("error", this.onSocketError.bind(this));
    this.socket.on("close", this.onSocketClose.bind(this));
    this.socket.on("timeout", this.onSocketTimeout.bind(this));
  }

  async onSocketData(data) {
    this.logger.debug(`[AuthClient] Received ${data.length} bytes`);

    let bytes = data.length;
    let position = 0;
    while (bytes > 0) {
      const opcode = data.readUInt8(position);
      position += 1;
      bytes -= 1;
      const new_position = await this.HandleOpcode(
        opcode,
        data.slice(position)
      );
      if (!new_position) {
        break;
      }
      position += new_position;
      bytes -= new_position;
    }

    this.logger.debug(`[AuthClient] Remaining bytes: ${bytes}`);
  }

  async HandleOpcode(opcode, data) {
    let position = 0;
    this.logger.debug(`[AuthClient] Opcode: ${opcode}`);
    switch (opcode) {
      case CMD_AUTH_LOGON_CHALLENGE:
      case CMD_AUTH_RECONNECT_CHALLENGE:
        const ChallengeResponse = await this.HandleAuthLogonChallenge(
          opcode,
          data
        );
        if (!ChallengeResponse) {
          this.stop();
        }

        position = ChallengeResponse.position;
        break;
      case CMD_AUTH_LOGON_PROOF:
      case CMD_AUTH_RECONNECT_PROOF:
        this.logger.debug(`[AuthClient] Received Auth Logon Proof`);
        const AuthLogonProofResponse = await this.HandleAuthLogonProof(
          opcode,
          data
        );
        if (!AuthLogonProofResponse) {
          this.stop();
        }
        position = AuthLogonProofResponse.position;
        break;

      case CMD_REALM_LIST:
        this.logger.debug(`[AuthClient] Received Realm List`);
        const RealmListResponse = await this.HandleRealmList(data);
        if (!RealmListResponse) {
          this.stop();
        }
        position = RealmListResponse.position;
        break;
      case CMD_XFER_INITIATE:
      case CMD_XFER_DATA:
        const packet = Buffer.alloc(1 + data.length);
        packet.writeUInt8(opcode, 0);
        data.copy(packet, 1, 0);
        this.onData(packet);
        position = data.length;
        break;
      default:
        this.logger.error(`[AuthClient] Unknown opcode: ${opcode}`);
        this.stop();
        position = false;
        break;
    }

    return position;
  }

  async HandleAuthLogonProof(opcode, data) {
    this.logger.debug("[AuthClient] Handling Auth Logon Proof");
    const packet = Buffer.alloc(1 + data.length);
    packet.writeUInt8(opcode, 0);
    data.copy(packet, 1, 0);
    this.onData(packet);

    const result = data.readUInt8(0x0);
    this.logger.debug(`[AuthClient] Auth Logon Proof Result: ${result}`);
    if (result === 0x00) {
      // success
      let position = data.length;
      return { position: position, payload: packet };
    } else {
      // fail
      return false;
    }
  }

  async HandleAuthLogonChallenge(opcode, data) {
    this.logger.debug("[AuthClient] Handling Auth Logon Challenge");
    let position = 1;
    let result = data.readUInt8(0x1 - position);
    if (CMD_AUTH_LOGON_CHALLENGE === opcode) {
      result = data.readUInt8(0x2 - position);
    }

    this.logger.debug(`[AuthClient] Result: ${result}`);

    const payload = Buffer.alloc(data.length + 1);
    payload.writeUInt8(opcode, 0);
    data.copy(payload, 1, 0);
    this.logger.debug(
      `[AuthClient] Auth Logon Challenge Payload: ${payload.toString("hex")}`
    );
    this.onData(payload);

    if (result === 0x00) {
      // Success
      return { position: payload.length - 1, payload: payload };
    }

    return false;
  }

  async HandleRealmList(data) {
    this.logger.debug("[AuthClient] Handling Realm List");
    let position = 1;
    const size = data.readUInt8(0x1 - position);
    const realm_count = data.readUInt8(0x7 - position);

    this.logger.debug(
      `[AuthClient] Realm Count: ${realm_count}, size: ${size}, packetSize: ${data.length}`
    );

    let new_data = data;

    position = 0x7;
    for (let i = 0; i < realm_count; i++) {
      let realmName = "";
      position = 0x4 + position;
      while (data.readUInt8(position) !== 0) {
        realmName += String.fromCharCode(data.readUInt8(position));
        position++;
      }

      position++;
      let address_port = "";
      let start_address_position = position;
      let end_address_position = position;
      while (data.readUInt8(position) !== 0) {
        address_port += String.fromCharCode(data.readUInt8(position));
        if (String.fromCharCode(data.readUInt8(position)) == ":") {
          end_address_position = position;
        }
        position++;
      }

      position += 7;
      const realm_id = data.readUInt8(position);
      position += 1;

      this.logger.debug(
        `[AuthClient] Realm Name: ${realmName}, Address: ${address_port}, Realm ID: ${realm_id}`
      );

      let new_address_port = this.config.relay_ip;

      let different_length =
        new_address_port.length -
        (end_address_position - start_address_position);
      let temp_packet = Buffer.alloc(new_data.length + different_length);
      new_data.copy(temp_packet, 0, 0, start_address_position);
      temp_packet.write(new_address_port, start_address_position);
      new_data.copy(
        temp_packet,
        start_address_position + new_address_port.length,
        end_address_position
      );

      temp_packet.writeUInt8(temp_packet.length - 2, 0);
      new_data = temp_packet;

      if (size <= position) {
        break;
      }

      position -= 1;
    }

    const new_packet = Buffer.alloc(new_data.length + 1);
    new_packet.writeUInt8(CMD_REALM_LIST, 0);
    new_data.copy(new_packet, 1, 0);
    this.onData(new_packet);
    return { position: data.length, payload: new_packet };
  }

  onSocketError(error) {
    this.logger.error(`[AuthClient] Error: ${error.message}`);
    this.stop();
  }

  onSocketClose() {
    this.logger.info("[AuthClient] Connection closed");
    this.stop();
  }

  onSocketTimeout() {
    this.logger.info("[AuthClient] Connection timeout");
    this.stop();
  }

  WriteData(data) {
    if (this.isEnded) {
      return;
    }

    this.logger.debug(`[AuthClient] Sending ${data.length} bytes`);
    this.socket.write(data);
  }

  stop() {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.logger.info("[AuthClient] Stopping");
    this.onStop();
    this.socket.destroy();
  }
}

export default AuthClient;
