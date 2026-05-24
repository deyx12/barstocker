import { NextResponse } from "next/server";
import { MovementType, ProductStatus, Role } from "@/lib/generated/prisma/client";
import {
  calculateSaleTotal,
  getInsufficientStockItems,
  getProductStatus,
} from "@/lib/business";
import { getDateRange, handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { saleSchema } from "@/lib/validations/sale";

export const runtime = "nodejs";

function buildSaleNumber() {
  return `VENTA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now()
    .toString()
    .slice(-6)}`;
}

export async function GET(request: Request) {
  const auth = await requireApiSession([Role.ADMIN, Role.VENDEDOR]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const { startDate, endDate } = getDateRange(searchParams);
  const userId = searchParams.get("userId") || undefined;
  const status = searchParams.get("status") || undefined;

  const sales = await prisma.sale.findMany({
    where: {
      userId,
      status: status === "COMPLETED" || status === "CANCELLED" ? status : undefined,
      createdAt:
        startDate || endDate
          ? {
              gte: startDate,
              lte: endDate,
            }
          : undefined,
    },
    include: {
      user: true,
      details: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sales });
}

export async function POST(request: Request) {
  const auth = await requireApiSession([Role.ADMIN, Role.VENDEDOR]);
  if ("error" in auth) return auth.error;

  try {
    const payload = saleSchema.parse(await readJson(request));
    const normalizedItems = Object.values(
      payload.items.reduce<Record<string, { productId: string; quantity: number }>>(
        (acc, item) => {
          acc[item.productId] = {
            productId: item.productId,
            quantity: (acc[item.productId]?.quantity ?? 0) + item.quantity,
          };
          return acc;
        },
        {},
      ),
    );

    const products = await prisma.product.findMany({
      where: {
        id: { in: normalizedItems.map((item) => item.productId) },
        status: { not: ProductStatus.INACTIVE },
      },
    });

    if (products.length !== normalizedItems.length) {
      return jsonError("Uno o mas productos no existen o estan inactivos.", 404);
    }

    const productsForSale = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      stock: product.stock,
    }));
    const insufficient = getInsufficientStockItems(normalizedItems, productsForSale);

    if (insufficient.length) {
      return jsonError("No hay stock suficiente para completar la venta.", 409, {
        insufficient,
      });
    }

    const total = calculateSaleTotal(normalizedItems, productsForSale);

    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          saleNumber: buildSaleNumber(),
          userId: auth.profile.id,
          customerName: payload.customerName,
          customerDocument: payload.customerDocument || null,
          customerPhone: payload.customerPhone || null,
          total,
          details: {
            create: normalizedItems.map((item) => {
              const product = productsForSale.find(
                (entry) => entry.id === item.productId,
              );
              const unitPrice = product?.price ?? 0;

              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                subtotal: unitPrice * item.quantity,
              };
            }),
          },
        },
      });

      for (const item of normalizedItems) {
        const product = products.find((entry) => entry.id === item.productId);

        if (!product) continue;

        const previousStock = product.stock;
        const newStock = previousStock - item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: newStock,
            status: getProductStatus(newStock, product.minStock),
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            type: MovementType.SALE_ADJUSTMENT,
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: `Venta ${createdSale.saleNumber}`,
          },
        });
      }

      return tx.sale.findUniqueOrThrow({
        where: { id: createdSale.id },
        include: {
          user: true,
          details: { include: { product: true } },
        },
      });
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
