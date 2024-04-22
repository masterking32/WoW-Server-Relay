# World of Warcraft (WoW) Relay Server

This project enables the creation of additional servers that function as a Content Delivery Network (CDN) for World of Warcraft private servers. It allows you to conceal your main server IP from users. Players connect to the relay servers, which then handle and forward packets to the main server. This setup not only protects your main server from DDoS attacks but also provides a smoother gameplay experience by having CDNs at different locations.

### ⭐ If you find this project useful, feel free to give it a star! ⭐

## How It Works

![How it Works?](https://raw.githubusercontent.com/masterking32/WoW-Server-Relay/main/docs/how-works.png)

Please note that this project is still under development. While it is fully functional, there may be some issues and unsupported packet types for the AuthServer that need to be implemented.

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
