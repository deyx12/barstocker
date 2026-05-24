import { Role } from "@/lib/generated/prisma/client";

export const adminOnly = [Role.ADMIN];
export const staffRoles = [Role.ADMIN, Role.VENDEDOR];

export function canManage(role: Role) {
  return role === Role.ADMIN;
}
