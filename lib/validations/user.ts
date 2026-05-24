import { z } from "zod";

export const roleValues = ["ADMIN", "VENDEDOR"] as const;
export const statusValues = ["ACTIVE", "INACTIVE"] as const;

export const userPatchSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").optional(),
  email: z.string().trim().email("Ingresa un correo valido.").optional(),
  role: z.enum(roleValues).optional(),
  status: z.enum(statusValues).optional(),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().trim().email("Ingresa un correo valido."),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres."),
  role: z.enum(roleValues).default("VENDEDOR"),
  status: z.enum(statusValues).default("ACTIVE"),
});

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().trim().email("Ingresa un correo valido."),
  password: z
    .string()
    .min(6, "La contrasena debe tener al menos 6 caracteres.")
    .optional()
    .or(z.literal("")),
});

export type UserPatchValues = z.infer<typeof userPatchSchema>;
export type UserCreateValues = z.infer<typeof userCreateSchema>;
export type AccountUpdateValues = z.infer<typeof accountUpdateSchema>;
