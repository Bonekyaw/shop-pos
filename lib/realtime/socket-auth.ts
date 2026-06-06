import type { SocketJwtPayload } from "./socket-auth.types";
import { verifyAccessToken } from "../auth/jwt";

/**
 * Verify JWT from Socket.io handshake (same claims as REST access tokens).
 */
export async function verifySocketJwt(token: string): Promise<SocketJwtPayload> {
  return verifyAccessToken(token) as Promise<SocketJwtPayload>;
}

export type { SocketJwtPayload, SocketUserRole } from "./socket-auth.types";
