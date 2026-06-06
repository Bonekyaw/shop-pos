import type { JWTPayload } from "jose";

export type SocketUserRole = "ADMIN" | "WAITER";

export type SocketJwtPayload = JWTPayload & {
  sub: string;
  role: SocketUserRole;
  restaurantId: string;
};
