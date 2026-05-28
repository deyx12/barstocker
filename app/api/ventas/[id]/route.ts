import { NextResponse } from "next/server";
import {
  MovementType,
  ProductStatus,
  Role,
  SaleStatus,
} from "@/lib/generated/prisma/client";
import { getProductStatus } from "@/lib/business";
import { handleRouteError, jsonError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN, Role.VENDEDOR]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const sale = await prisma.$transaction(async (tx) => {
      const currentSale = await tx.sale.findUnique({
        where: { id },
        include: {
          user: true,
          details: { include: { product: true } },
        },
      });

      if (!currentSale) {
        throw new Error("SALE_NOT_FOUND");
      }

      if (
        auth.profile.role !== Role.ADMIN &&
        currentSale.userId !== auth.profile.id
      ) {
        throw new Error("SALE_FORBIDDEN");
      }

      if (currentSale.status === SaleStatus.CANCELLED) {
        throw new Error("SALE_ALREADY_CANCELLED");
      }

      const updatedSale = await tx.sale.updateMany({
        where: { id, status: SaleStatus.COMPLETED },
        data: { status: SaleStatus.CANCELLED },
      });

      if (updatedSale.count === 0) {
        throw new Error("SALE_ALREADY_CANCELLED");
      }

      for (const detail of currentSale.details) {
        const updatedProduct = await tx.product.update({
          where: { id: detail.productId },
          data: { stock: { increment: detail.quantity } },
        });
        const newStock = updatedProduct.stock;
        const previousStock = newStock - detail.quantity;

        await tx.product.update({
          where: { id: updatedProduct.id },
          data: {
            status: getProductStatus(
              newStock,
              updatedProduct.minStock,
              updatedProduct.status === ProductStatus.INACTIVE,
            ),
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: detail.productId,
            type: MovementType.IN,
            quantity: detail.quantity,
            previousStock,
            newStock,
            reason: `Reverso venta ${currentSale.saleNumber}`,
          },
        });
      }

      return tx.sale.findUniqueOrThrow({
        where: { id },
        include: {
          user: true,
          details: { include: { product: true } },
        },
      });
    });

    return NextResponse.json({ sale });
  } catch (error) {
    if (error instanceof Error && error.message === "SALE_NOT_FOUND") {
      return jsonError("La venta no existe.", 404);
    }

    if (error instanceof Error && error.message === "SALE_FORBIDDEN") {
      return jsonError("Solo puedes reversar ventas realizadas por tu usuario.", 403);
    }

    if (error instanceof Error && error.message === "SALE_ALREADY_CANCELLED") {
      return jsonError("La venta ya fue reversada.", 409);
    }

    return handleRouteError(error);
  }
}
