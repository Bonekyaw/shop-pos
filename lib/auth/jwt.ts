import * as jose from "jose";
import type { AuthTokenPayload } from "./types";
import { getDefaultRestaurantId } from "./env";

const ALG = "HS256" as const;
const EXPIRY = "8h" as const;

export function getJwtSecretKeyBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a strong secret in .env (≥16 chars).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  payload: Omit<AuthTokenPayload, "restaurantId"> & {
    restaurantId?: string;
  },
): Promise<string> {
  const restaurantId = payload.restaurantId ?? getDefaultRestaurantId();
  return await new jose.SignJWT({
    sub: payload.sub,
    role: payload.role,
    restaurantId,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getJwtSecretKeyBytes());
}

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jose.jwtVerify(token, getJwtSecretKeyBytes(), {
    algorithms: [ALG],
  });

  const sub = payload.sub;
  const role = payload.role;
  const restaurantId = payload.restaurantId;

  if (typeof sub !== "string" || !sub) {
    throw new Error("Invalid token: sub");
  }
  if (role !== "ADMIN" && role !== "WAITER") {
    throw new Error("Invalid token: role");
  }
  if (typeof restaurantId !== "string" || !restaurantId) {
    throw new Error("Invalid token: restaurantId");
  }

  return {
    sub,
    role,
    restaurantId,
  };
}
