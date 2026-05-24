import { NextResponse } from "next/server";
import { Role, ProductStatus } from "@/lib/generated/prisma/client";
import { getProductStatus } from "@/lib/business";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiSession([Role.ADMIN, Role.VENDEDOR]);
  if ("error" in auth) return auth.error;

  const products = await prisma.product.findMany({
    include: { supplier: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const payload = productSchema.parse(await readJson(request));
    const duplicate = await prisma.product.findFirst({
      where: {
        OR: [{ code: payload.code }, { name: payload.name }],
      },
    });

    if (duplicate) {
      return jsonError("Ya existe un producto con ese codigo o nombre.", 409);
    }

    const product = await prisma.product.create({
      data: {
        code: payload.code,
        name: payload.name,
        category: payload.category,
        description: payload.description || null,
        price: payload.price,
        stock: payload.stock,
        minStock: payload.minStock,
        status:
          payload.status === ProductStatus.INACTIVE
            ? ProductStatus.INACTIVE
            : getProductStatus(payload.stock, payload.minStock),
        supplierId: payload.supplierId || null,
      },
      include: { supplier: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
