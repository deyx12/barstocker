export type ProductStatusValue =
  | "AVAILABLE"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "INACTIVE";

export type SaleLineInput = {
  productId: string;
  quantity: number;
};

export type SaleLineProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

export function getProductStatus(
  stock: number,
  minStock: number,
  inactive = false,
): ProductStatusValue {
  if (inactive) {
    return "INACTIVE";
  }

  if (stock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (stock <= minStock) {
    return "LOW_STOCK";
  }

  return "AVAILABLE";
}

export function calculateSaleTotal(
  lines: SaleLineInput[],
  products: SaleLineProduct[],
) {
  return lines.reduce((total, line) => {
    const product = products.find((item) => item.id === line.productId);
    return total + (product ? product.price * line.quantity : 0);
  }, 0);
}

export function getInsufficientStockItems(
  lines: SaleLineInput[],
  products: SaleLineProduct[],
) {
  return lines
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);

      if (!product || product.stock >= line.quantity) {
        return null;
      }

      return {
        productId: line.productId,
        name: product.name,
        requested: line.quantity,
        available: product.stock,
      };
    })
    .filter(Boolean);
}
