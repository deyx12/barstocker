import { SaleForm } from "@/components/forms/sale-form";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { requirePageSession } from "@/lib/auth/session";
import { ProductStatus, Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { profile } = await requirePageSession([Role.ADMIN, Role.VENDEDOR]);
  const products = await prisma.product.findMany({
    where: {
      status: { notIn: [ProductStatus.INACTIVE, ProductStatus.OUT_OF_STOCK] },
      stock: { gt: 0 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Ventas"
        description="Registra ventas, valida stock y descuenta inventario automaticamente."
      />
      <SaleForm
        initialProducts={products.map((product) => ({
          id: product.id,
          code: product.code,
          name: product.name,
          price: Number(product.price),
          stock: product.stock,
        }))}
      />
    </AppShell>
  );
}
