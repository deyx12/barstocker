import { describe, expect, it } from "vitest";
import { calculateSaleTotal, getInsufficientStockItems } from "@/lib/business";

const products = [
  { id: "p1", name: "Ron", price: 82000, stock: 4 },
  { id: "p2", name: "Cerveza", price: 7000, stock: 10 },
];

describe("reglas de venta", () => {
  it("calcula el total de una venta", () => {
    const total = calculateSaleTotal(
      [
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 6 },
      ],
      products,
    );

    expect(total).toBe(124000);
  });

  it("detecta stock insuficiente", () => {
    const insufficient = getInsufficientStockItems(
      [{ productId: "p1", quantity: 5 }],
      products,
    );

    expect(insufficient).toHaveLength(1);
    expect(insufficient[0]).toMatchObject({
      name: "Ron",
      requested: 5,
      available: 4,
    });
  });
});
