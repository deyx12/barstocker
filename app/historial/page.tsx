import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SalesHistoryTable } from "@/components/tables/sales-history-table";
import { requirePageSession } from "@/lib/auth/session";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SalesHistoryPage() {
  const { profile } = await requirePageSession([Role.ADMIN, Role.VENDEDOR]);
  const [sales, sellers] = await Promise.all([
    prisma.sale.findMany({
      include: {
        user: true,
        details: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userProfile.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Historial de ventas"
        description="Consulta ventas realizadas, vendedor, estado y detalle de productos."
      />
      <SalesHistoryTable
        sellers={sellers.map((seller) => ({ id: seller.id, name: seller.name }))}
        sales={sales.map((sale) => ({
          id: sale.id,
          saleNumber: sale.saleNumber,
          sellerId: sale.userId,
          sellerName: sale.user.name,
          total: Number(sale.total),
          status: sale.status,
          createdAt: sale.createdAt.toISOString(),
          details: sale.details.map((detail) => ({
            id: detail.id,
            productName: detail.product.name,
            productCode: detail.product.code,
            quantity: detail.quantity,
            unitPrice: Number(detail.unitPrice),
            subtotal: Number(detail.subtotal),
          })),
        }))}
      />
    </AppShell>
  );
}
