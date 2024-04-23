# World of Warcraft (WoW) Relay Server

This project enables the creation of additional servers that function as a Content Delivery Network (CDN) for World of Warcraft private servers. It allows you to conceal your main server IP from users. Players connect to the relay servers, which then handle and forward packets to the main server. This setup not only protects your main server from DDoS attacks but also provides a smoother gameplay experience by having CDNs at different locations.

### ⭐ If you find this project useful, feel free to give it a star! ⭐

## How It Works

![How it Works?](https://raw.githubusercontent.com/masterking32/WoW-Server-Relay/main/docs/how-works.png)

Please note that this project is still under development. While it is fully functional, there may be some issues and unsupported packet types for the AuthServer that need to be implemented.

# Why Should We Use This Tool and What Makes It Different?

### 1) Does adding another node in the network increase ping?

Contrary to what some may believe, adding another node can actually decrease ping for users. For instance, if your server is located in the EU, but you have players in North and South America, each player will have a different network route to the EU. If you establish a server in the US with a better route to your EU server, players can connect to your US server. This server will then forward packets via the better route, resulting in improved ping for players.

### 2) How does it mitigate DDoS attacks?

Most DDoS attacks utilize packet types such as UDP, ACK, SYN, etc. This tool does not forward all types of these attacks to your main server. By implementing rate limits on your UFW/IPtable, you can further protect your main server from DDoS attacks. If one of your servers is under attack, some users connected to that server may get disconnected, but others can still play. While this tool can help mitigate the effects of DDoS attacks, it does not provide 100% protection. It simply adds an additional layer of network security.

### 3) Why should we use this instead of Load Balancers, IPTable forwards, and other proxy tools?

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
| 0x1    | 4    | uint32 | Secret_Len | Secret key length                                              |
| 0x5    | -    | String | Secret_Key | The secret key value starts from 0x5 and ends with Secret_Len  |
| -      | 4    | uint32 | IP_len     | The length of user IP                                          |
| -      | -    | String | User_IP    | User IP address                                                |

#### Packet Structure for WorldServer

| Offset | Size | Type   | Name       | Description                                                      |
| ------ | ---- | ------ | ---------- | ---------------------------------------------------------------- |
| 0x0    | 2    | uint16 | OpCode     | Opcode for relay custom packet. `RELAY_SERVER_CMD_WORLD = 0xA32` |
| 0x2    | 4    | uint32 | Secret_Len | Secret key length                                                |
| 0x6    | -    | String | Secret_Key | The secret key value starts from 0x6 and ends with Secret_Len    |
| -      | 4    | uint32 | IP_len     | The length of user IP                                            |
| -      | -    | String | User_IP    | User IP address                                                  |

#### Does TrinityCore/AzerothCore support this packet?

Currently, no, and it hasn't been tested yet. However, in the future, we or others can test it and provide updates on how to modify your core to support this type of packet. These packets follow the same structure as other WoW packets. If your core doesn't have a handler for these packets, make sure `send_relay_packet` is set to false.

Here is an example of how we implemented packet support and parsed it in our code. [Example code (Javascript)](https://github.com/masterking32/WoW-Server-Relay/blob/3dd04460b4061ad9a081239206b80256514b4e0b/AuthSession.js#L226)

### Additional Information:

This project reads and handles packets from the client for AuthServer and functions like a WoW Auth Server and WoW Client. Additionally, it edits the REALMLIST_PACKET to replace the main server IP with the relay IP. This project is currently in beta and testing stages. Contributions are welcome.

## Installation Guide for Ubuntu

1. **Install the required packages:**

   ```bash
   apt install curl git nano
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
   nano config.js
   ```

6. **Run the project:**

   ```bash
   node app.js
   ```

## Developer Information

This project was developed by [Amin.MasterkinG](https://masterking32.com). You can also find me on [Github](https://github.com/masterking32).
