import { describe, expect, it } from "vitest";
import { productSchema } from "@/lib/validations/product";

describe("validacion de producto", () => {
  it("acepta un producto valido", () => {
    const result = productSchema.safeParse({
      code: "GIN-001",
      name: "Ginebra London Dry",
      category: "Licores",
      description: "Botella 750 ml",
      price: "96000",
      stock: "10",
      minStock: "5",
      status: "AVAILABLE",
      supplierId: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(96000);
      expect(result.data.stock).toBe(10);
    }
  });

  it("rechaza precio negativo y codigo corto", () => {
    const result = productSchema.safeParse({
      code: "A",
      name: "Producto",
      category: "Licores",
      price: -1,
      stock: 0,
      minStock: 0,
    });

    expect(result.success).toBe(false);
  });
});
