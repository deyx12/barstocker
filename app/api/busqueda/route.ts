import { NextResponse } from "next/server";
import { Role } from "@/lib/generated/prisma/client";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiSession([Role.ADMIN, Role.VENDEDOR]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [products, sales, suppliers] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.sale.findMany({
      where: {
        OR: [
          { saleNumber: { contains: query, mode: "insensitive" } },
          { customerName: { contains: query, mode: "insensitive" } },
          { customerDocument: { contains: query, mode: "insensitive" } },
          { user: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    auth.profile.role === Role.ADMIN
      ? prisma.supplier.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { nit: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { name: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...products.map((product) => ({
      id: product.id,
      type: "Producto",
      title: `${product.code} - ${product.name}`,
      description: `${product.category} | Stock ${product.stock}`,
      href: `/productos?buscar=${encodeURIComponent(product.code)}`,
    })),
    ...sales.map((sale) => ({
      id: sale.id,
      type: "Venta",
      title: sale.saleNumber,
      description: `${sale.customerName ?? "Cliente no registrado"} | ${sale.user.name}`,
      href: `/historial?buscar=${encodeURIComponent(sale.saleNumber)}`,
    })),
    ...suppliers.map((supplier) => ({
      id: supplier.id,
      type: "Proveedor",
      title: supplier.name,
      description: `${supplier.nit ?? "Sin NIT"} | ${supplier.email}`,
      href: `/proveedores?buscar=${encodeURIComponent(supplier.name)}`,
    })),
  ];

  return NextResponse.json({ results });
}
