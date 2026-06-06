import type { AdminRole, UserRole } from "@/app/generated/prisma/client";

export type { UserRole };
export type { AdminRole };

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  restaurantId: string;
};

export type PublicUser = {
  id: string;
  name: string;
  role: UserRole;
  adminRole: AdminRole | null;
  isActive: boolean;
  createdAt: Date;
};
