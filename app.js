// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

import RelayServer from "./RelayServer.js";
import { config } from "./config.js";

const server = new RelayServer(config);
server.run();
