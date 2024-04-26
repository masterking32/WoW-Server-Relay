# World of Warcraft (WoW) Servidor de retransmisión

[Ingles](README.md) | [Español](README_ES.md)

Este proyecto permite la creación de servidores adicionales que funcionan como una Red de Entrega de Contenido (CDN) para servidores privados de World of Warcraft. Le permite ocultar la IP de su servidor principal a los usuarios. Los jugadores se conectan a los servidores de retransmisión, que luego manejan y reenvían paquetes al servidor principal. Esta configuración no solo protege su servidor principal de ataques DDoS, sino que también brinda una experiencia de juego más fluida al tener CDN en diferentes ubicaciones.

### ⭐ Si encuentra útil este proyecto, ¡no dude en darle una estrella! ⭐

Este proyecto lee y maneja paquetes del cliente para AuthServer y funciona como un servidor de autenticación WoW y un cliente WoW. Además, edita `REALMLIST_PACKET` para reemplazar la IP del servidor principal con la IP de retransmisión. Las contribuciones son bienvenidas.

## ¿Cómo funciona?

![How it Works?](https://raw.githubusercontent.com/masterking32/WoW-Server-Relay/main/docs/how-works.png)

# ¿Por qué deberíamos utilizar esta herramienta y qué la hace diferente?

<details>
<summary><h4>1) ¿Agregar otro nodo en la red aumenta el ping?</h4></summary>
Al contrario de lo que algunos puedan creer, agregar otro nodo en realidad puede disminuir el ping de los usuarios. Por ejemplo, si tu servidor está ubicado en la UE, pero tienes jugadores en América del Norte y del Sur, cada jugador tendrá una ruta de red diferente hacia la UE. Si establece un servidor en EE. UU. con una mejor ruta a su servidor de la UE, los jugadores pueden conectarse a su servidor de EE. UU. Este servidor luego reenviará los paquetes a través de la mejor ruta, lo que resultará en un ping mejorado para los jugadores.
</details>

<details>
<summary><h4>2) ¿Cómo mitiga los ataques DDoS?</h4></summary>
La mayoría de los ataques DDoS utilizan tipos de paquetes como UDP, ACK, SYN, etc. Esta herramienta no reenvía todos los tipos de estos ataques a su servidor principal. Al implementar límites de velocidad en su UFW/IPtable, puede proteger aún más su servidor principal de ataques DDoS. Si uno de tus servidores está siendo atacado, algunos usuarios conectados a ese servidor pueden desconectarse, pero otros aún pueden jugar. Si bien esta herramienta puede ayudar a mitigar los efectos de los ataques DDoS, no proporciona una protección del 100%. Simplemente agrega una capa adicional de seguridad de la red.
</details>

<details>
<summary><h4>3) ¿Por qué deberíamos usar esto en lugar de Load Balancers, IPTable forwards y otras herramientas proxy?</h4></summary>

#### Número 1:

Si bien puede utilizar otras herramientas para reenviar paquetes, balanceadores de carga, etc., es importante comprender que, de forma predeterminada, TrinityCore/AzerothCore recupera la IP del usuario de la IP del socket remoto. Esto significa que cuando usas algo como IPTable, la IP del usuario en el servidor WoW es la IP de tu servidor de retransmisión. Por ejemplo, si la IP de `us-relay1` es `8.8.8.8` y un jugador conectado a ese servidor intenta ingresar la contraseña incorrecta varias veces, el servidor prohibirá `8.8.8.8` en lugar de la IP del usuario. En consecuencia, nadie puede conectarse al servidor desde el nodo `us-relay1`. Para los usuarios conectados al servidor WoW desde el nodo `us-relay1`, la IP siempre será `8.8.8.8`, y en el juego, si no puedes recuperar la IP del jugador real, siempre verás las IP del nodo de retransmisión.

#### ¿Cómo lo arreglaste?

Este proyecto funciona como otros reenviadores de forma predeterminada, pero con una diferencia: solo funciona para WoW y lee, analiza y maneja paquetes. Para solucionar el problema de lectura de IP, agregamos un paquete personalizado para WorldServer y AuthServer con estos códigos de operación:

```
RELAY_SERVER_CMD_AUTH = 0x64 // 100
RELAY_SERVER_CMD_WORLD = 0xA32 // 2610
```

Si habilita `send_relay_packet` en el archivo de configuración, este proyecto enviará un paquete de retransmisión al servidor mundial y de autenticación después de abrir una conexión de socket. Este paquete incluye una clave secreta y la IP real del usuario. Sus servidores Auth y World deben analizar este paquete y reemplazar la IP del usuario con la IP dentro de este paquete.

#### Estructura de paquetes para AuthServer

| Offset | Size | Type   | Name       | Description                                                    |
| ------ | ---- | ------ | ---------- | -------------------------------------------------------------- |
| 0x0    | 1    | uint8  | OpCode     | Opcode for relay custom packet. `RELAY_SERVER_CMD_AUTH = 0x64` |
| 0x1    | 2    | uint16 | Secret_Len | Secret key length                                              |
| 0x3    | 2    | uint16 | IP_len     | The length of user IP                                          |
| 0x5    | -    | String | Secret_Key | The secret key value starts from 0x5 and ends with Secret_Len  |
| -      | -    | String | User_IP    | User IP address                                                |

#### Estructura de paquetes para WorldServer

#### ENCABEZADO

| Offset | Size | Type   | Name | Description                                                                                 |
| ------ | ---- | ------ | ---- | ------------------------------------------------------------------------------------------- |
| 0x0    | 2    | uint16 | Size | Packet Header - Size of Packet (Size of the packet including the opcode field.)             |
| 0x2    | 4    | uint32 | CMD  | Packet Header - Opcode or Command for relay custom packet. `RELAY_SERVER_CMD_WORLD = 0xA32` |

#### CUERPO

| Offset | Size | Type   | Name       | Description                                                                               |
| ------ | ---- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| 0x0    | -    | String | Secret_Key | The secret key value starts from 0x6 and ends with Secret_Len. `(Null terminated string)` |
| -      | -    | String | User_IP    | User IP address. `(Null terminated string)`                                               |
</details>

---

## ¿TrinityCore/AzerothCore admite este paquete?

- ## Cambios personalizados de TrinityCore:

Para TrinityCore, puede consultar [masterking32/TrinityCore-Relay-Support](https://github.com/masterking32/TrinityCore-Relay-Support) y [este compromiso específico](https://github.com/masterking32/TrinityCore-Relay-Support/commit/cb5aa9eefd4caec032864b9249fd16341ab64b73) para la versión 3.3.5. Estos recursos lo guiarán sobre cómo realizar cambios personalizados en su núcleo para admitir el manejo y análisis del paquete de retransmisión.

- ## Módulo/cambios personalizados de AzerothCore:

Esta sección aún no está lista. Puedes implementarlo de manera similar a TrinityCore, con algunas modificaciones. Si logra hacerlo, hágamelo saber para que podamos actualizar esta parte.

---

**Tenga en cuenta: si no ha realizado ningún cambio personalizado en el núcleo, asegúrese de que `send_relay_packet` esté configurado en `false`. Si ha realizado cambios personalizados, establezca `send_relay_packet` en `true` y establezca una `secret_key` segura que tenga entre 32 y 64 caracteres (el valor máximo permitido es 64). Esta `clave_secreta` debe ser la misma tanto en el archivo `config.js` de este proyecto como en sus archivos de configuración principales, `authserver.conf` y `worldserver.conf`.**

---

# Guía de instalación para Ubuntu/Debian

1. **Instale los paquetes necesarios:**

   ```bash
   apt install curl git nano sudo
   ```

2. **Instale NodeJS (versión 20 o superior):**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone el proyecto:**

   ```bash
   git clone https://github.com/masterking32/WoW-Server-Relay
   cd WoW-Server-Relay
   ```

4. **Instalar dependencias (npm):**

   ```bash
   npm install
   ```

5. **Configurar el proyecto:**

   ```bash
   cp config.js.sample config.js
   nano config.js
   ```

6. **Ejecute el proyecto:**

   ```bash
   node app.js
   ```

7. **Ejecutar como servicio/inicio:**

   ```bash
   npm install pm2 -g
   pm2 start app.js
   pm2 startup
   pm2 save
   ```

**Nota:** Para un rendimiento óptimo, soporte para IP de usuario real y para garantizar que la función de prohibición de IP funcione en su servidor, debe realizar algunas modificaciones en su núcleo. Lea [esta sección](https://github.com/masterking32/WoW-Server-Relay?tab=readme-ov-file#does-trinitycoreazerothcore-support-this-packet) y aplique los cambios necesarios a su núcleo.

---

# Instalación en Windows:

1. Descargue e instale la última versión de [NodeJS](https://nodejs.org/en).
2. Descargue el proyecto y extraiga los archivos.
3. Navegue hasta el directorio del proyecto y cambie el nombre de `config.js.sample` a `config.js`.
4. Modifique el archivo `config.js` con la información de su servidor.
5. Abra el `Símbolo del sistema`, navegue hasta el directorio del proyecto.
6. Ejecute el comando `node app.js`.
7. Asegúrese de que los puertos necesarios estén abiertos en su firewall.

**Nota:** Para un rendimiento óptimo, soporte para IP de usuario real y para garantizar que la función de prohibición de IP funcione en su servidor, debe realizar algunas modificaciones en su núcleo. Lea [esta sección](https://github.com/masterking32/WoW-Server-Relay?tab=readme-ov-file#does-trinitycoreazerothcore-support-this-packet) y aplique los cambios necesarios a su núcleo.

---

## Información del desarrollador

Este proyecto fue desarrollado por [Amin.MasterkinG](https://masterking32.com). También puedes encontrarme en [Github](https://github.com/masterking32).
