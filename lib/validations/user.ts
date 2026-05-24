import { z } from "zod";

export const roleValues = ["ADMIN", "VENDEDOR"] as const;
export const statusValues = ["ACTIVE", "INACTIVE"] as const;

export const userPatchSchema = z.object({
  role: z.enum(roleValues).optional(),
  status: z.enum(statusValues).optional(),
});

export type UserPatchValues = z.infer<typeof userPatchSchema>;
