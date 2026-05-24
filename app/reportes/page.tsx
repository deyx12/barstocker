import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsView } from "@/components/reports/reports-view";
import { requirePageSession } from "@/lib/auth/session";
import { ProductStatus, Role, SaleStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ReportPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportPageProps) {
  const { profile } = await requirePageSession([Role.ADMIN]);
  const params = await searchParams;
  const startDate = params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined;
  const endDate = params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined;
  const dateFilter =
    startDate || endDate
      ? {
          gte: startDate,
          lte: endDate,
        }
      : undefined;

  const [products, sales, salesAggregate, lowStock] = await Promise.all([
    prisma.product.findMany({
      include: { supplier: true },
      orderBy: { name: "asc" },
    }),
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
    prisma.product.count({
      where: {
        status: { in: [ProductStatus.LOW_STOCK, ProductStatus.OUT_OF_STOCK] },
      },
    }),
  ]);

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Reportes"
        description="Analiza inventario y ventas. Exporta los datos filtrados a CSV."
      />
      <ReportsView
        initialFrom={params.from ?? ""}
        initialTo={params.to ?? ""}
        summary={{
          inventoryValue: products.reduce(
            (sum, product) => sum + Number(product.price) * product.stock,
            0,
          ),
          products: products.length,
          lowStock,
          salesCount: salesAggregate._count.id,
          salesTotal: Number(salesAggregate._sum.total ?? 0),
        }}
        products={products.map((product) => ({
          code: product.code,
          name: product.name,
          category: product.category,
          stock: product.stock,
          minStock: product.minStock,
          price: Number(product.price),
          status: product.status,
          supplierName: product.supplier?.name ?? "Sin proveedor",
        }))}
        sales={sales.map((sale) => ({
          saleNumber: sale.saleNumber,
          sellerName: sale.user.name,
          total: Number(sale.total),
          createdAt: sale.createdAt.toISOString(),
          products: sale.details
            .map((detail) => `${detail.product.name} x${detail.quantity}`)
            .join(" | "),
        }))}
      />
    </AppShell>
  );
}
