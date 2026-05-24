import { z } from "zod";

export const statusValues = ["ACTIVE", "INACTIVE"] as const;

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  nit: z.string().trim().min(5, "El NIT debe tener al menos 5 caracteres."),
  phone: z.string().trim().min(7, "El telefono debe tener al menos 7 caracteres."),
  email: z.string().trim().email("Ingresa un correo valido."),
  address: z.string().trim().min(5, "La direccion es obligatoria."),
  status: z.enum(statusValues).optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
