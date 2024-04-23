// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

import AuthClient from "./AuthClient.js";
import {
  CMD_AUTH_LOGON_CHALLENGE,
  CMD_AUTH_LOGON_PROOF,
  CMD_AUTH_RECONNECT_CHALLENGE,
  CMD_AUTH_RECONNECT_PROOF,
  CMD_REALM_LIST,
  RELAY_SERVER_CMD_AUTH,
} from "./opcodes.js";

class AuthSession {
  constructor(config, socket, logger) {
    this.config = config;
    this.socket = socket;
    this.logger = logger;
    this.status = "init";
    this.ClientIP = socket.remoteAddress.includes("::ffff:")
      ? socket.remoteAddress.replace("::ffff:", "")
      : socket.remoteAddress;
    this.isEnded = false;
  }

  run() {
    this.socket.on("data", this.onSocketData.bind(this));
    this.socket.on("close", this.onSocketClose.bind(this));
    this.socket.on("error", this.onSocketError.bind(this));
    this.socket.on("timeout", this.onSocketTimeout.bind(this));
  }

  async onSocketData(data) {
    let bytes = data.length;
    this.logger.debug(`[AuthSession] Received ${data.length} bytes`);
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
  }

  async HandleOpcode(opcode, data) {
    let position = 0;
    switch (opcode) {
      case CMD_AUTH_LOGON_CHALLENGE:
      case CMD_AUTH_RECONNECT_CHALLENGE:
        const ChallengeResponse = await this.HandleAuthLogonChallenge(data);
        if (!ChallengeResponse) {
          this.stop();
        }

        position = ChallengeResponse.position;
        let AuthChallengePayload = Buffer.alloc(
          ChallengeResponse.payload.length + 1
        );
        AuthChallengePayload.writeUInt8(opcode, 0);
        ChallengeResponse.payload.copy(AuthChallengePayload, 1);

        this.onClientStop = () => {
          this.stop();
        };

        this.onClientData = (data) => {
          this.socket.write(data);
          this.logger.debug(`[AuthSession] Sent ${data.toString("hex")}`);
        };

        this.client = new AuthClient(
          this.config,
          this.ClientIP,
          AuthChallengePayload,
          this.logger,
          this.onClientStop,
          this.onClientData
        );

        this.client.run();
        break;
      case CMD_AUTH_LOGON_PROOF:
      case CMD_AUTH_RECONNECT_PROOF:
        this.logger.debug("[AuthSession] Auth logon proof");
        if (this.client) {
          const packet = Buffer.alloc(data.length + 1);
          packet.writeUInt8(opcode, 0);
          data.copy(packet, 1);
          this.client.WriteData(packet);
        } else {
          this.logger.error(
            "[AuthSession] Auth logon proof received without client"
          );
          this.stop();
        }

        position = data.length;
        break;
      case CMD_REALM_LIST:
        this.logger.debug("[AuthSession] Realm list");
        const packet = Buffer.alloc(data.length + 1);
        packet.writeUInt8(CMD_REALM_LIST, 0);
        data.copy(packet, 1);
        this.client.WriteData(packet);
        position = data.length;
        break;
      case RELAY_SERVER_CMD_AUTH:
        this.logger.debug("[AuthSession] Relay server command");
        const RelayServerResponse = await this.HandleRelayServerCommand(data);

        if (!RelayServerResponse) {
          this.stop();
        }

        position = RelayServerResponse.position;
        break;
      default:
        this.logger.error(`[AuthSession] Unknown opcode ${opcode}`);
        this.stop();
    }

    return position;
  }

  async HandleAuthLogonChallenge(data) {
    let position = 1;
    const protocol_version = await data.readUInt8(0x01 - position);
    const packet_size = await data.readUInt16LE(0x02 - position);
    const game_name = await data.toString(
      "utf8",
      0x04 - position,
      0x08 - position
    );
    const versionArray = [];
    for (let i = 0; i < 3; i++) {
      const versionByte = await data.readUInt8(0x08 + i - position);
      versionArray.push(versionByte);
    }

    const version = versionArray.join(".");
    const build = await data.readUInt16LE(0x0b - position);
    const platform = await data.toString(
      "utf8",
      0x0d - position,
      0x0d + 4 - position
    );
    const os = await data.toString(
      "utf8",
      0x11 - position,
      0x11 + 4 - position
    );
    const locale = await data.toString(
      "utf8",
      0x15 - position,
      0x15 + 4 - position
    );
    const timezone_bias = await data.readInt32LE(0x19 - position);
    const ip = await data.readUInt32LE(0x1d - position);
    const username_length = await data.readUInt8(0x21 - position);
    const username = await data.toString(
      "utf8",
      0x22 - position,
      0x22 + username_length - position
    );

    this.logger.debug(
      `[AuthSession] Protocol Version: ${protocol_version}, Packet Size: ${packet_size}, Game Name: ${game_name}, Version: ${version}, Build: ${build}, Platform: ${platform
        .split("")
        .reverse()
        .join("")}, OS: ${os.split("").reverse().join("")}, Locale: ${locale
        .split("")
        .reverse()
        .join(
          ""
        )}, Timezone Bias: ${timezone_bias}, IP: ${ip}, Username Length: ${username_length}, Username: ${username}`
    );

    if (version !== this.config.game_version) {
      this.logger.error(`[AuthSession] Invalid version: ${version}`);
      return false;
    }

    if (build !== this.config.build) {
      this.logger.error(`[AuthSession] Invalid build: ${build}`);
      return false;
    }
    if (!username_length) {
      this.logger.error(
        `[AuthSession] Invalid username length: ${username_length}`
      );
      return false;
    }

    if (username_length + 0x22 - 4 !== packet_size) {
      this.logger.error(`[AuthSession] Invalid packet size: ${packet_size}`);
      return false;
    }

    position = 0x22 + username_length - position;

    const output = {
      protocol_version: protocol_version,
      packet_size: packet_size,
      game_name: game_name,
      version: version,
      build: build,
      platform: platform,
      os: os,
      locale: locale,
      timezone_bias: timezone_bias,
      ip: ip,
      position: position,
      payload: data,
    };

    return output;
  }

  // TODO: We need to implement this function for TrinityCore and AzerothCore
  // ? With this custom packet we can get the real user IP and forward it to the main server
  // ? Then if you ban the user, you can ban the user by IP without any problems!
  async HandleRelayServerCommand(data) {
    const secret_key_length = await data.readUInt32LE(0);
    const secret_key = await data.toString("utf8", 4, 4 + secret_key_length);
    const client_ip_length = await data.readUInt32LE(4 + secret_key_length);
    const client_ip = await data.toString(
      "utf8",
      8 + secret_key_length,
      8 + secret_key_length + client_ip_length
    );

    this.logger.debug(
      `[AuthSession] Secret Key Length: ${secret_key_length}, Secret Key: ${secret_key}, Client IP Length: ${client_ip_length}, Client IP: ${client_ip}`
    );

    if (secret_key !== this.config.secret_key) {
      this.logger.error("[AuthSession] Invalid secret key");
      this.stop();
    }

    const output = {
      secret_key_length: secret_key_length,
      secret_key: secret_key,
      client_ip_length: client_ip_length,
      client_ip: client_ip,
      position: 8 + secret_key_length + client_ip_length,
    };

    return output;
  }

  onSocketClose() {
    this.logger.debug("[AuthSession] Connection closed");
    this.stop();
  }

  onSocketError(error) {
    this.logger.debug("[AuthSession] Connection error: " + error.message);
    this.stop();
  }
  onSocketTimeout() {
    this.logger.debug("[AuthSession] Connection timeout");
    this.stop();
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

export default AuthSession;
