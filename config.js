// Developed by: Amin.MasterkinG (https://masterking32.com)
// Github: https://github.com/masterking32/WoW-Server-Relay
// Year: 2024

export const config = {
  log_level: "info", // Set the log level: debug, info, warning, error

  // Specify the game version: 1.12.1, 2.4.3, 3.3.5 (based on the game version and packet structure)
  // If you are unsure, change the log_level to debug and create a connection to this server with a valid game version client. Check the console log for the game version.
  game_version: "3.3.5",
  // Specify the build number: 12340, ... (based on the game version and packet structure)
  // If you are unsure, change the log_level to debug and create a connection to this server with a valid game version client. Check the console log for the build number.
  build: 12340,

  // Set this to true if your core supports relay packets.
  // This will allow the relay server to send the relay packet to the main server, and the main server will receive and process it. With the relay packet, the main server can get the real user IP and enable IP banning functionality.
  // If this is set to false, the relay server will not send the relay packet to the main server, and the main server will not receive the real user IP.
  // If you don't have any custom changes in your core regarding this, make sure this is set to false.
  send_relay_packet: false,
  // Secret Key for Relay Packet validation on the main server.
  // This key should be the same as the main server's secret key.
  secret_key: "secret",

  // Specify the Relay Public IP Address to allow players to connect to the relay server.
  relay_ip: "127.0.0.1",
  // You can use another port for relay server auth requests, the default is 3724.
  auth_port: 3724,

  main_server_auth: {
    // Specify the IP address of the main server for auth requests.
    // This IP is used by the relay server to send the auth request to the main server.
    // This IP should be the same as the main server's IP. If you have a private connection between the relay and main server, you can use the private IP.
    host: "192.168.32.32",
    // Specify the port of the main server for auth requests in authserver.conf.
    port: 3724,
  },

  // Configuration for server realms. Fill this part with your main server realmlist table in the auth database.
  realms: [
    {
      // realm_id should be the same as the id in the realmlist table.
      realm_id: 1,
      // realm_name should be the same as the name in the realmlist table.
      realm_name: "Realm 1",
      // realm_ip should be the same as the address in the realmlist table.
      // This IP is used by the relay server to connect and receive the game packets from the main server.
      // If you have a private connection between the relay and main server, you can use the private IP here. Set the address in the realmlist table to the private IP, and in the CMD_REALM_LIST packet, we will replace that IP with the relay IP.
      realm_ip: "192.168.32.32",
      // realm_port should be the same as the port in the realmlist table.
      // This port is used by the relay server to connect and receive the game packets from the main server.
      // This port is also used by the client to connect to the relay server.
      realm_port: 990,
    },
  ],
};
