import { z } from "zod";

export const saleLineSchema = z.object({
  productId: z.string().uuid("Selecciona un producto valido."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que cero."),
});

export const saleSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, "El nombre del cliente debe tener al menos 3 caracteres.")
    .max(80, "El nombre del cliente no puede superar 80 caracteres."),
  customerDocument: z
    .string()
    .trim()
    .min(5, "El documento o NIT debe tener al menos 5 caracteres.")
    .max(30, "El documento o NIT no puede superar 30 caracteres.")
    .regex(
      /^[A-Za-z0-9.\-\s]+$/,
      "Usa solo letras, numeros, puntos, guiones y espacios.",
    ),
  customerPhone: z
    .string()
    .trim()
    .min(7, "El telefono debe tener al menos 7 caracteres.")
    .max(20, "El telefono no puede superar 20 caracteres.")
    .regex(/^[0-9+\-\s()]+$/, "Ingresa un telefono valido."),
  items: z
    .array(saleLineSchema)
    .min(1, "Agrega al menos un producto a la venta."),
});

export type SaleFormValues = z.infer<typeof saleSchema>;
export type SaleFormInput = z.input<typeof saleSchema>;
