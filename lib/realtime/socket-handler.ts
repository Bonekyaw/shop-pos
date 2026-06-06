import type { Server as HTTPServer } from "node:http";
import { Server as IOServer, type Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@shared/socket-events";
import { createSocketIoServerOptions } from "./socket-config";
import { verifySocketJwt, type SocketJwtPayload } from "./socket-auth";

type PosSocketData = {
  user: SocketJwtPayload;
};

let ioSingleton: IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  PosSocketData
> | null = null;

export function getIO(): typeof ioSingleton {
  return ioSingleton;
}

function roomRestaurant(restaurantId: string): string {
  return `restaurant:${restaurantId}`;
}

function roomTable(tableId: string): string {
  return `table:${tableId}`;
}

function extractToken(socket: Socket): string | undefined {
  const auth = socket.handshake.auth as { token?: unknown };
  if (typeof auth?.token === "string" && auth.token.length > 0) {
    return auth.token;
  }
  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return undefined;
}

/**
 * Attach Socket.io to the same HTTP server as Next.js (custom `server.ts`).
 * JWT is required on every connection (middleware).
 */
export function setupSocketServer(httpServer: HTTPServer): void {
  const io = new IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    PosSocketData
  >(httpServer, createSocketIoServerOptions());

  ioSingleton = io;

  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        next(new Error("Unauthorized: missing token"));
        return;
      }
      const user = await verifySocketJwt(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { restaurantId, role } = socket.data.user;

    void socket.join(roomRestaurant(restaurantId));

    socket.on("subscribe:table", (payload) => {
      const { tableId } = payload;
      if (typeof tableId !== "string" || !tableId) {
        return;
      }
      void socket.join(roomTable(tableId));
    });

    socket.on("unsubscribe:table", (payload) => {
      const { tableId } = payload;
      if (typeof tableId !== "string" || !tableId) {
        return;
      }
      void socket.leave(roomTable(tableId));
    });

    socket.on("subscribe:kitchen", () => {
      if (role === "ADMIN") {
        void socket.join("kitchen");
      }
    });
  });
}
