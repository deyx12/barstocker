import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/tables/inventory-table";
import { requirePageSession } from "@/lib/auth/session";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const { profile } = await requirePageSession([Role.ADMIN, Role.VENDEDOR]);
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

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Inventario"
        description="Consulta stock, alertas y movimientos de entrada o salida."
      />
      <InventoryTable
        canManage={profile.role === Role.ADMIN}
        initialProducts={products.map((product) => ({
          id: product.id,
          code: product.code,
          name: product.name,
          category: product.category,
          stock: product.stock,
          minStock: product.minStock,
          status: product.status,
          supplierName: product.supplier?.name ?? null,
        }))}
        initialMovements={movements.map((movement) => ({
          id: movement.id,
          productName: movement.product.name,
          type: movement.type,
          quantity: movement.quantity,
          previousStock: movement.previousStock,
          newStock: movement.newStock,
          reason: movement.reason,
          createdAt: movement.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
