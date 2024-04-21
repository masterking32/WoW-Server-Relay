export const config = {
  log_level: "debug", // Log Level: debug, info, warning, error
  game_version: "3.3.5", // Game Version: 1.12.1, 2.4.3, 3.3.5 based on game version and packet structure
  build: 12340, // Build: 12340, ... based on game version and packet structure
  secret_key: "secret", // Secret Key
  auth_port: 3724, // Auth Port, default: 3724
  main_server_auth: {
    host: "192.168.1.10", // Main Server Auth Host
    port: 3724, // Main Server Auth Port
  },
  realms: [
    {
      realm_id: 1, // Realm ID
      realm_name: "Realm 1", // Realm name
      realm_port: 8085, // Realm Port
    },
  ],
};
