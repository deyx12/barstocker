import { NextResponse } from "next/server";
import { ProductStatus, Role, SaleStatus, Status } from "@/lib/generated/prisma/client";
import { getDateRange, handleRouteError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const { startDate, endDate } = getDateRange(searchParams);
    const dateFilter =
      startDate || endDate
        ? {
            gte: startDate,
            lte: endDate,
          }
        : undefined;

    const [
      products,
      lowStock,
      outOfStock,
      activeSuppliers,
      sales,
      salesAggregate,
    ] = await Promise.all([
      prisma.product.findMany({
        include: { supplier: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where: { status: ProductStatus.LOW_STOCK } }),
      prisma.product.count({ where: { status: ProductStatus.OUT_OF_STOCK } }),
      prisma.supplier.count({ where: { status: Status.ACTIVE } }),
      prisma.sale.findMany({
        where: {
          status: SaleStatus.COMPLETED,
          createdAt: dateFilter,
        },
        include: {
          user: true,
          details: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sale.aggregate({
        where: {
          status: SaleStatus.COMPLETED,
          createdAt: dateFilter,
        },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      summary: {
        inventoryValue: products.reduce(
          (sum, product) => sum + Number(product.price) * product.stock,
          0,
        ),
        products: products.length,
        lowStock,
        outOfStock,
        activeSuppliers,
        salesCount: salesAggregate._count.id,
        salesTotal: Number(salesAggregate._sum.total ?? 0),
      },
      products,
      sales,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
