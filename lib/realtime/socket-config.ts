import type { ServerOptions } from "socket.io";

/** Socket.io HTTP path (must match client `io({ path })`). */
export const SOCKET_IO_PATH = "/api/socket" as const;

function parseAllowedOrigins(): string[] | boolean {
  const raw = process.env.SOCKET_CORS_ORIGINS;
  if (!raw || raw === "*") {
    return true;
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Socket.io engine options for self-hosted Next.js (custom `server.ts`).
 * See https://socket.io/docs/v4/server-options/
 */
export function createSocketIoServerOptions(): Partial<ServerOptions> {
  return {
    path: SOCKET_IO_PATH,
    cors: {
      origin: parseAllowedOrigins(),
      methods: ["GET", "POST"],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  };
}
