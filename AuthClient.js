// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

import Net from "net";
import {
  RELAY_SERVER_CMD,
  CMD_AUTH_LOGON_CHALLENGE,
  CMD_AUTH_LOGON_PROOF,
} from "./opcodes.js";

class AuthClient {
  constructor(
    ip,
    port,
    secret_key,
    client_ip,
    authChallengePayload,
    logger,
    send_relay_packet,
    onStop,
    onData
  ) {
    this.ip = ip;
    this.port = port;
    this.logger = logger;
    this.secret_key = secret_key;
    this.client_ip = client_ip;
    this.authChallengePayload = authChallengePayload;
    this.send_relay_packet = send_relay_packet;
    this.onStop = onStop;
    this.onData = onData;
    this.isReady = false;
    this.isEnded = false;
  }

  run() {
    this.socket = Net.createConnection(this.port, this.ip, () => {
      this.logger.info(`[AuthClient] Connected to ${this.ip}:${this.port}`);

      if (this.send_relay_packet) {
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
        this.logger.debug(
          `[AuthClient] Sent Relay Packet: ${relay_packet.toString("hex")}`
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
        const ChallengeResponse = await this.HandleAuthLogonChallenge(data);
        if (!ChallengeResponse) {
          this.stop();
        }

        position = ChallengeResponse.position;
        break;
      case CMD_AUTH_LOGON_PROOF:
        this.logger.debug(`[AuthClient] Received Auth Logon Proof`);
        const AuthLogonProofResponse = await this.HandleAuthLogonProof(data);
        if (!AuthLogonProofResponse) {
          this.stop();
        }
        position = AuthLogonProofResponse.position;
        break;
      default:
        this.logger.error(`[AuthClient] Unknown opcode: ${opcode}`);
        this.stop();
        position = false;
        break;
    }

    return position;
  }

  async HandleAuthLogonProof(data) {
    this.logger.debug("[AuthClient] Handling Auth Logon Proof");
    const packet = Buffer.alloc(1 + data.length);
    packet.writeUInt8(CMD_AUTH_LOGON_PROOF, 0);
    data.copy(packet, 1, 0);
    const result = data.readUInt8(0x0);
    this.logger.debug(`[AuthClient] Auth Logon Proof Result: ${result}`);
    if (result === 0x00) {
      // success
      this.onData(packet);
      let position = data.length;
      return { position: position, payload: packet };
    } else {
      // fail
      this.onData(packet);
      setTimeout(() => {
        this.stop();
      }, 500);
      return false;
    }

    let position = data.length;
    return { position: position, payload: packet };
  }

  async HandleAuthLogonChallenge(data) {
    this.logger.debug("[AuthClient] Handling Auth Logon Challenge");
    let position = 1;
    const protocol_version = data.readUInt8(0x1 - position);
    const result = data.readUInt8(0x2 - position);

    this.logger.debug(
      `[AuthClient] Protocol Version: ${protocol_version} and Result: ${result}`
    );
    if (result === 0x00) {
      // Success
      const payload = Buffer.alloc(data.length + 1);
      payload.writeUInt8(0, CMD_AUTH_LOGON_CHALLENGE);
      data.copy(payload, 1, 0);
      this.logger.debug(
        `[AuthClient] Auth Logon Challenge Payload: ${payload.toString("hex")}`
      );
      this.onData(payload);
      return { position: payload.length - 1, payload: payload };
    } else if (result >= 0x00 && result <= 0x10) {
      let packetDisconnect = Buffer.alloc(1 + 1 + 1);
      packetDisconnect.writeUInt8(CMD_AUTH_LOGON_CHALLENGE, 0);
      packetDisconnect.writeUInt8(protocol_version, 1);
      packetDisconnect.writeUInt8(result, 2);
      this.onData(packetDisconnect);

      setTimeout(() => {
        this.stop();
      }, 500);
    } else {
      this.logger.error(`[AuthClient] Unknown result: ${result}`);
      this.stop();
    }

    return false;
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
