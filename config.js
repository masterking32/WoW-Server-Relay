// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

export const config = {
  log_level: "info", // Set the log level: debug, info, warning, error
  game_version: "3.3.5", // Specify the game version: 1.12.1, 2.4.3, 3.3.5 (based on game version and packet structure)
  build: 12340, // Specify the build number: 12340, ... (based on game version and packet structure)
  secret_key: "secret", // Secret Key for Relay Packet validation on the main server
  send_relay_packet: false, // Set this to true if your core supports relay packet. This will allow the main server to receive the real user IP and enable IP banning functionality.

  relay_ip: "127.0.0.1", // Specify the Relay Public IP
  auth_port: 3724, // Specify the Auth port for the relay server

  main_server_auth: {
    host: "192.168.32.32", // Specify the IP address of the main server for auth requests
    port: 3724, // Specify the port of the main server for auth requests
  },

  // Configuration for server realms. Fill this part with your main server configuration.
  realms: [
    {
      realm_id: 1, // Specify the Realm ID
      realm_name: "Realm 1", // Specify the Realm name
      realm_ip: "192.168.32.32", // Specify the Realm IP
      realm_port: 990, // Specify the Realm Port
    },
  ],
};
