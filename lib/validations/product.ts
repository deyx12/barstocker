import { z } from "zod";

export const productStatusValues = [
  "AVAILABLE",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "INACTIVE",
] as const;

export const productSchema = z.object({
  code: z.string().trim().min(2, "El codigo debe tener al menos 2 caracteres."),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  category: z.string().trim().min(2, "La categoria es obligatoria."),
  description: z.string().trim().optional().or(z.literal("")),
  price: z.coerce.number().positive("El precio debe ser mayor que cero."),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo."),
  minStock: z.coerce
    .number()
    .int()
    .min(0, "El stock minimo no puede ser negativo."),
  status: z.enum(productStatusValues).optional(),
  supplierId: z.string().trim().optional().or(z.literal("")),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductFormInput = z.input<typeof productSchema>;
