/**
 * Realtime entry: Socket.io path, server options, and IO singleton.
 * Socket.io is mounted on the custom HTTP server in `server.ts`, not on a Route Handler.
 */
export {
  SOCKET_IO_PATH,
  createSocketIoServerOptions,
} from "./socket-config";
export { getIO, setupSocketServer } from "./socket-handler";
export { verifySocketJwt, type SocketJwtPayload } from "./socket-auth";
export {
  emitToRestaurant,
  emitToTable,
  emitToKitchen,
} from "./emit";
