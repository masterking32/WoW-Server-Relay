// Opcodes and packets https://wowdev.wiki/Login_Packet
export const CMD_AUTH_LOGON_CHALLENGE = 0x00;
export const CMD_AUTH_LOGON_PROOF = 0x01;
export const CMD_AUTH_RECONNECT_CHALLENGE = 0x02;
export const CMD_AUTH_RECONNECT_PROOF = 0x03;
export const CMD_SURVEY_RESULT = 0x03;
export const CMD_REALM_LIST = 0x10;
export const CMD_XFER_INITIATE = 0x30;
export const CMD_XFER_DATA = 0x31;
export const CMD_XFER_ACCEPT = 0x32;
export const CMD_XFER_RESUME = 0x33;
export const CMD_XFER_CANCEL = 0x34;
export const RELAY_SERVER_CMD = 0x64; // Custom opcode for relay server communication = 100
