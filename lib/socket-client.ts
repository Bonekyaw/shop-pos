"use client";

import { io, type Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@shared/socket-events";

export type PosSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: PosSocket | null = null;

/**
 * Returns (and lazily creates) a singleton Socket.io client for the admin
 * dashboard. The JWT is read from the session cookie automatically by the
 * browser (same-origin), but Socket.io needs it in handshake auth too, so we
 * accept it as a parameter.
 */
export function getSocket(token?: string): PosSocket {
  if (socketInstance) return socketInstance;

  socketInstance = io({
    path: "/api/socket",
    autoConnect: false,
    auth: token ? { token } : undefined,
  });

  return socketInstance;
}

export function disconnectSocket(): void {
  socketInstance?.disconnect();
  socketInstance = null;
}
