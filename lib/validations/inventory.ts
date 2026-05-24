import { z } from "zod";

export const movementTypeValues = ["IN", "OUT", "SALE_ADJUSTMENT"] as const;

export const inventoryMovementSchema = z.object({
  productId: z.string().uuid("Selecciona un producto valido."),
  type: z.enum(movementTypeValues).default("IN"),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que cero."),
  reason: z.string().trim().min(3, "Indica el motivo del movimiento."),
});

export type InventoryMovementValues = z.infer<typeof inventoryMovementSchema>;
export type InventoryMovementInput = z.input<typeof inventoryMovementSchema>;
