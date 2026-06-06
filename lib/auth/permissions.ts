import type { AdminRole } from "@/app/generated/prisma/client";
import type { PublicUser } from "./types";

type RoleShape = Pick<PublicUser, "role" | "adminRole">;

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "manager",
  COUNTER: "counter",
};

export const ADMIN_ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: ADMIN_ROLE_LABELS.SUPER_ADMIN },
  { value: "MANAGER", label: ADMIN_ROLE_LABELS.MANAGER },
  { value: "COUNTER", label: ADMIN_ROLE_LABELS.COUNTER },
] as const;

export function getEffectiveAdminRole(user: RoleShape): AdminRole | null {
  if (user.role !== "ADMIN") {
    return null;
  }
  return user.adminRole ?? "SUPER_ADMIN";
}

export function canManageAdmins(user: RoleShape): boolean {
  return getEffectiveAdminRole(user) === "SUPER_ADMIN";
}

export function canManageWaiters(user: RoleShape): boolean {
  const adminRole = getEffectiveAdminRole(user);
  return adminRole === "SUPER_ADMIN" || adminRole === "MANAGER";
}
