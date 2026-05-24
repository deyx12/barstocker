import { z } from "zod";

export const saleLineSchema = z.object({
  productId: z.string().uuid("Selecciona un producto valido."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que cero."),
});

export const saleSchema = z.object({
  items: z
    .array(saleLineSchema)
    .min(1, "Agrega al menos un producto a la venta."),
});

export type SaleFormValues = z.infer<typeof saleSchema>;
export type SaleFormInput = z.input<typeof saleSchema>;
