import RelayServer from "./RelayServer.js";
import { config } from "./config.js";

const server = new RelayServer(config);
server.run();
