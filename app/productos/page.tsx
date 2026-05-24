import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ProductsTable } from "@/components/tables/products-table";
import { requirePageSession } from "@/lib/auth/session";
import { Role, Status } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { profile } = await requirePageSession([Role.ADMIN, Role.VENDEDOR]);
  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      include: { supplier: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { status: Status.ACTIVE },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Productos"
        description="Gestiona el catalogo, precios, estados y stock minimo."
      />
      <ProductsTable
        canManage={profile.role === Role.ADMIN}
        suppliers={suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
        }))}
        initialProducts={products.map((product) => ({
          id: product.id,
          code: product.code,
          name: product.name,
          category: product.category,
          description: product.description,
          price: Number(product.price),
          stock: product.stock,
          minStock: product.minStock,
          status: product.status,
          supplierId: product.supplierId,
          supplierName: product.supplier?.name ?? null,
        }))}
      />
    </AppShell>
  );
}
