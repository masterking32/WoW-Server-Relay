# World of Warcraft (WoW) Servidor de retransmisión

[Ingles](README.md) | [Español](README_ES.md)

Este proyecto permite la creación de servidores adicionales que funcionan como una Red de Entrega de Contenido (CDN) para servidores privados de World of Warcraft. Le permite ocultar la IP de su servidor principal a los usuarios. Los jugadores se conectan a los servidores de retransmisión, que luego manejan y reenvían paquetes al servidor principal. Esta configuración no solo protege su servidor principal de ataques DDoS, sino que también brinda una experiencia de juego más fluida al tener CDN en diferentes ubicaciones.

### ⭐ Si encuentra útil este proyecto, ¡no dude en darle una estrella! ⭐

Este proyecto lee y maneja paquetes del cliente para AuthServer y funciona como un servidor de autenticación WoW y un cliente WoW. Además, edita `REALMLIST_PACKET` para reemplazar la IP del servidor principal con la IP de retransmisión. Las contribuciones son bienvenidas.

## ¿Cómo funciona?

![How it Works?](https://raw.githubusercontent.com/masterking32/WoW-Server-Relay/main/docs/how-works.png)

# ¿Por qué deberíamos utilizar esta herramienta y qué la hace diferente?

<details>
<summary><h4>1) Does adding another node in the network increase ping?</h4></summary>
Contrary to what some may believe, adding another node can actually decrease ping for users. For instance, if your server is located in the EU, but you have players in North and South America, each player will have a different network route to the EU. If you establish a server in the US with a better route to your EU server, players can connect to your US server. This server will then forward packets via the better route, resulting in improved ping for players.
</details>

<details>
<summary><h4>2) How does it mitigate DDoS attacks?</h4></summary>
Most DDoS attacks utilize packet types such as UDP, ACK, SYN, etc. This tool does not forward all types of these attacks to your main server. By implementing rate limits on your UFW/IPtable, you can further protect your main server from DDoS attacks. If one of your servers is under attack, some users connected to that server may get disconnected, but others can still play. While this tool can help mitigate the effects of DDoS attacks, it does not provide 100% protection. It simply adds an additional layer of network security.
</details>

<details>
<summary><h4>3) Why should we use this instead of Load Balancers, IPTable forwards, and other proxy tools?</h4></summary>

#### Issue 1:

While you can use other tools to forward packets, load balancers, etc., it's important to understand that by default, TrinityCore/AzerothCore retrieves the user's IP from the remote socket IP. This means that when you use something like IPTable, the user's IP on the WoW server is your relay server's IP. For instance, if `us-relay1`'s IP is `8.8.8.8`, and a player connected to that server attempts the wrong password multiple times, the server will ban `8.8.8.8` instead of the user's IP. Consequently, no one can connect to the server from the `us-relay1` node. For users connected to the WoW server from the `us-relay1` node, the IP will always be `8.8.8.8`, and in the game, if you cannot retrieve the real player's IP, you will always see the relay node IPs.

#### How did you fix it?

This project works like other forwarders by default, but with a difference: it only works for WoW and reads, parses, and handles packets. To fix the read-ip issue, we added a custom packet for WorldServer and AuthServer with these Opcodes:

```
RELAY_SERVER_CMD_AUTH = 0x64 // 100
RELAY_SERVER_CMD_WORLD = 0xA32 // 2610
```

If you enable `send_relay_packet` in the config file, this project will send a relay packet to the auth and world server after opening a socket connection. This packet includes a secret key and the real IP of the user. Your Auth and World servers need to parse this packet and replace the user IP with the IP inside this packet.

#### Packet Structure for AuthServer

| Offset | Size | Type   | Name       | Description                                                    |
| ------ | ---- | ------ | ---------- | -------------------------------------------------------------- |
| 0x0    | 1    | uint8  | OpCode     | Opcode for relay custom packet. `RELAY_SERVER_CMD_AUTH = 0x64` |
| 0x1    | 2    | uint16 | Secret_Len | Secret key length                                              |
| 0x3    | 2    | uint16 | IP_len     | The length of user IP                                          |
| 0x5    | -    | String | Secret_Key | The secret key value starts from 0x5 and ends with Secret_Len  |
| -      | -    | String | User_IP    | User IP address                                                |

#### Packet Structure for WorldServer

#### HEADER

| Offset | Size | Type   | Name | Description                                                                                 |
| ------ | ---- | ------ | ---- | ------------------------------------------------------------------------------------------- |
| 0x0    | 2    | uint16 | Size | Packet Header - Size of Packet (Size of the packet including the opcode field.)             |
| 0x2    | 4    | uint32 | CMD  | Packet Header - Opcode or Command for relay custom packet. `RELAY_SERVER_CMD_WORLD = 0xA32` |

#### BODY

| Offset | Size | Type   | Name       | Description                                                                               |
| ------ | ---- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| 0x0    | -    | String | Secret_Key | The secret key value starts from 0x6 and ends with Secret_Len. `(Null terminated string)` |
| -      | -    | String | User_IP    | User IP address. `(Null terminated string)`                                               |
</details>

---

## Does TrinityCore/AzerothCore support this packet?

- ## TrinityCore Custom Changes:

For TrinityCore, you can refer to [masterking32/TrinityCore-Relay-Support](https://github.com/masterking32/TrinityCore-Relay-Support) and [this specific commit](https://github.com/masterking32/TrinityCore-Relay-Support/commit/cb5aa9eefd4caec032864b9249fd16341ab64b73) for version 3.3.5. These resources will guide you on how to make custom changes to your core to support handling and parsing of the relay packet.

- ## AzerothCore Custom Changes/Module:

This section is not ready yet. You can implement it similarly to TrinityCore, with some modifications. If you manage to do it, please let me know so we can update this part.

---

**Please Note: If you haven't made any custom changes to the core, ensure that `send_relay_packet` is set to `false`. If you have made custom changes, set `send_relay_packet` to `true` and establish a secure `secret_key` that is between 32 to 64 characters long (the maximum allowed value is 64). This `secret_key` should be the same in both this project's `config.js` file and your core configuration files, `authserver.conf` and `worldserver.conf`.**

---

# Installation Guide for Ubuntu/Debian

1. **Install the required packages:**

   ```bash
   apt install curl git nano sudo
   ```

2. **Install NodeJS (version 20 or higher):**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
   sudo apt-get install -y nodejs
   ```

3. **Download the project:**

   ```bash
   git clone https://github.com/masterking32/WoW-Server-Relay
   cd WoW-Server-Relay
   ```

4. **Install NPM Packages:**

   ```bash
   npm install
   ```

5. **Configure the project:**

   ```bash
   cp config.js.sample config.js
   nano config.js
   ```

6. **Run the project:**

   ```bash
   node app.js
   ```

7. **Run as Service/Startup:**

   ```bash
   npm install pm2 -g
   pm2 start app.js
   pm2 startup
   pm2 save
   ```

**Note:** For optimal performance, support for real user IP, and to ensure the IP ban function works on your server, you need to make some modifications to your core. Please read [this section](https://github.com/masterking32/WoW-Server-Relay?tab=readme-ov-file#does-trinitycoreazerothcore-support-this-packet) and apply the necessary changes to your core.

---

# Windows Installation:

1. Download and install the latest version of [NodeJS](https://nodejs.org/en).
2. Download the project and extract the files.
3. Navigate to the project directory and rename `config.js.sample` to `config.js`.
4. Modify the `config.js` file with your server information.
5. Open the `Command Prompt`, navigate to the project directory.
6. Run the command `node app.js`.
7. Ensure that the necessary ports are open in your firewall.

**Note:** For optimal performance, support for real user IP, and to ensure the IP ban function works on your server, you need to make some modifications to your core. Please read [this section](https://github.com/masterking32/WoW-Server-Relay?tab=readme-ov-file#does-trinitycoreazerothcore-support-this-packet) and apply the necessary changes to your core.

---

## Developer Information

This project was developed by [Amin.MasterkinG](https://masterking32.com). You can also find me on [Github](https://github.com/masterking32).
