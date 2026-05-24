import { NextResponse } from "next/server";
import { MovementType, Role, ProductStatus } from "@/lib/generated/prisma/client";
import { getProductStatus } from "@/lib/business";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { inventoryMovementSchema } from "@/lib/validations/inventory";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiSession([Role.ADMIN, Role.VENDEDOR]);
  if ("error" in auth) return auth.error;

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      include: { supplier: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryMovement.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return NextResponse.json({ products, movements });
}

export async function POST(request: Request) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const payload = inventoryMovementSchema.parse(await readJson(request));

    if (payload.type === MovementType.SALE_ADJUSTMENT) {
      return jsonError("Los ajustes por venta se crean al registrar una venta.", 422);
    }

    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: payload.productId },
      });

      if (!product || product.status === ProductStatus.INACTIVE) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const previousStock = product.stock;
      const newStock =
        payload.type === MovementType.OUT
          ? previousStock - payload.quantity
          : previousStock + payload.quantity;

      if (newStock < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: newStock,
          status: getProductStatus(newStock, product.minStock),
        },
      });

      return tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: payload.type,
          quantity: payload.quantity,
          previousStock,
          newStock,
          reason: payload.reason,
        },
        include: { product: true },
      });
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return jsonError("El producto no existe o esta inactivo.", 404);
    }

    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return jsonError("No hay stock suficiente para registrar la salida.", 409);
    }

    return handleRouteError(error);
  }
}
