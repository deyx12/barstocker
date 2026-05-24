import {
  AlertTriangle,
  Package,
  ShoppingCart,
  Truck,
  Wine,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePageSession } from "@/lib/auth/session";
import { ProductStatus, SaleStatus, Status } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function DashboardPage() {
  const { profile } = await requirePageSession();
  const today = startOfToday();

  const [
    productCount,
    dailySales,
    lowStockCount,
    activeSuppliers,
    recentSales,
    lowStockProducts,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.sale.aggregate({
      where: {
        status: SaleStatus.COMPLETED,
        createdAt: { gte: today },
      },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.product.count({
      where: {
        status: { in: [ProductStatus.LOW_STOCK, ProductStatus.OUT_OF_STOCK] },
      },
    }),
    prisma.supplier.count({ where: { status: Status.ACTIVE } }),
    prisma.sale.findMany({
      include: {
        user: true,
        details: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.product.findMany({
      where: {
        status: { in: [ProductStatus.LOW_STOCK, ProductStatus.OUT_OF_STOCK] },
      },
      orderBy: [{ status: "desc" }, { stock: "asc" }],
      take: 6,
    }),
  ]);

  const cards = [
    {
      label: "Productos registrados",
      value: productCount.toString(),
      icon: Package,
    },
    {
      label: "Ventas del dia",
      value: `${dailySales._count.id} / ${formatCurrency(Number(dailySales._sum.total ?? 0))}`,
      icon: ShoppingCart,
    },
    {
      label: "Productos con bajo stock",
      value: lowStockCount.toString(),
      icon: AlertTriangle,
    },
    {
      label: "Proveedores activos",
      value: activeSuppliers.toString(),
      icon: Truck,
    },
  ];

  return (
    <AppShell
      user={{ name: profile.name, email: profile.email, role: profile.role }}
    >
      <PageHeader
        title="Dashboard"
        description="Resumen operativo de inventario, ventas y alertas del bar."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ventas recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.length ? (
                  recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{sale.user.name}</TableCell>
                      <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(sale.total))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Aun no hay ventas registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos con bajo stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockProducts.length ? (
              lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-white px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock {product.stock} / minimo {product.minStock}
                    </p>
                  </div>
                  <StatusBadge status={product.status} />
                </div>
              ))
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed text-center">
                <Wine className="mb-2 size-8 text-primary" aria-hidden="true" />
                <p className="text-sm font-medium">Inventario saludable</p>
                <p className="text-sm text-muted-foreground">
                  No hay alertas de bajo stock.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
