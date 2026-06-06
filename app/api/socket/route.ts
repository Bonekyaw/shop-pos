import { NextResponse } from "next/server";
import { SOCKET_IO_PATH } from "@/lib/realtime/socket-config";

/**
 * Discovery/metadata for clients. The actual Socket.io engine listens on `SOCKET_IO_PATH`
 * via the custom `server.ts` HTTP server (not this Route Handler).
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    transport: "socket.io",
    path: SOCKET_IO_PATH,
    hint: "Connect Socket.io client with { path: SOCKET_IO_PATH }; JWT in handshake.auth.token or Authorization: Bearer",
  });
}
