import { NextResponse } from "next/server";
import { Role, ProductStatus } from "@/lib/generated/prisma/client";
import { getProductStatus } from "@/lib/business";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const payload = productUpdateSchema.parse(await readJson(request));
    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: id },
        OR: [{ code: payload.code }, { name: payload.name }],
      },
    });

    if (duplicate) {
      return jsonError("Ya existe un producto con ese codigo o nombre.", 409);
    }

    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) {
      return jsonError("El producto no existe.", 404);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        code: payload.code,
        name: payload.name,
        category: payload.category,
        description: payload.description || null,
        price: payload.price,
        minStock: payload.minStock,
        status:
          payload.status === ProductStatus.INACTIVE
            ? ProductStatus.INACTIVE
            : getProductStatus(current.stock, payload.minStock),
        supplierId: payload.supplierId || null,
      },
      include: { supplier: true },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const [saleDetails, movements] = await Promise.all([
      prisma.saleDetail.count({ where: { productId: id } }),
      prisma.inventoryMovement.count({ where: { productId: id } }),
    ]);

    if (saleDetails > 0 || movements > 0) {
      const product = await prisma.product.update({
        where: { id },
        data: { status: ProductStatus.INACTIVE },
      });

      return NextResponse.json({
        product,
        message:
          "El producto tiene historial y fue marcado como inactivo.",
      });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    return handleRouteError(error);
  }
}
