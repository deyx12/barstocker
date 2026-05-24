"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Package, ShoppingCart, TrendingUp, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type ProductReportRow = {
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status: string;
  supplierName: string;
};

type SaleReportRow = {
  saleNumber: string;
  sellerName: string;
  total: number;
  createdAt: string;
  products: string;
};

type ReportsViewProps = {
  initialFrom: string;
  initialTo: string;
  summary: {
    inventoryValue: number;
    products: number;
    lowStock: number;
    salesCount: number;
    salesTotal: number;
  };
  products: ProductReportRow[];
  sales: SaleReportRow[];
};

export function ReportsView({
  initialFrom,
  initialTo,
  summary,
  products,
  sales,
}: ReportsViewProps) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const cards = [
    {
      label: "Valor de inventario",
      value: formatCurrency(summary.inventoryValue),
      icon: Warehouse,
    },
    {
      label: "Productos",
      value: summary.products.toString(),
      icon: Package,
    },
    {
      label: "Bajo stock",
      value: summary.lowStock.toString(),
      icon: TrendingUp,
    },
    {
      label: "Ventas filtradas",
      value: `${summary.salesCount} / ${formatCurrency(summary.salesTotal)}`,
      icon: ShoppingCart,
    },
  ];

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/reportes?${params.toString()}`);
  }

  function exportExcel() {
    const generatedAt = new Date().toLocaleString("es-CO");
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #172033; }
            h1 { color: #1d4ed8; margin-bottom: 4px; }
            h2 { margin-top: 24px; color: #1f3558; }
            .muted { color: #64748b; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th { background: #1d4ed8; color: #ffffff; font-weight: 700; }
            th, td { border: 1px solid #dbe3ef; padding: 8px; vertical-align: top; }
            tr:nth-child(even) td { background: #f8fafc; }
            .number { text-align: right; }
            .summary td { font-weight: 700; background: #eaf1fb; }
          </style>
        </head>
        <body>
          <h1>BarStocker Web</h1>
          <div class="muted">Reporte generado: ${escapeHtml(generatedAt)}</div>
          <div class="muted">Rango: ${escapeHtml(from || "Sin inicio")} - ${escapeHtml(to || "Sin fin")}</div>

          <h2>Resumen</h2>
          <table class="summary">
            <tr>
              <td>Valor de inventario</td>
              <td>Productos</td>
              <td>Bajo stock</td>
              <td>Ventas</td>
              <td>Total vendido</td>
            </tr>
            <tr>
              <td>${escapeHtml(formatCurrency(summary.inventoryValue))}</td>
              <td class="number">${summary.products}</td>
              <td class="number">${summary.lowStock}</td>
              <td class="number">${summary.salesCount}</td>
              <td>${escapeHtml(formatCurrency(summary.salesTotal))}</td>
            </tr>
          </table>

          <h2>Reporte de inventario</h2>
          <table>
            <tr>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Categoria</th>
              <th>Proveedor</th>
              <th>Stock</th>
              <th>Stock minimo</th>
              <th>Estado</th>
              <th>Precio</th>
              <th>Valor inventario</th>
            </tr>
            ${products
              .map(
                (product) => `<tr>
                  <td>${escapeHtml(product.code)}</td>
                  <td>${escapeHtml(product.name)}</td>
                  <td>${escapeHtml(product.category)}</td>
                  <td>${escapeHtml(product.supplierName)}</td>
                  <td class="number">${product.stock}</td>
                  <td class="number">${product.minStock}</td>
                  <td>${escapeHtml(product.status)}</td>
                  <td>${escapeHtml(formatCurrency(product.price))}</td>
                  <td>${escapeHtml(formatCurrency(product.price * product.stock))}</td>
                </tr>`,
              )
              .join("")}
          </table>

          <h2>Reporte de ventas</h2>
          <table>
            <tr>
              <th>Comprobante</th>
              <th>Vendedor</th>
              <th>Fecha</th>
              <th>Productos</th>
              <th>Total</th>
            </tr>
            ${sales
              .map(
                (sale) => `<tr>
                  <td>${escapeHtml(sale.saleNumber)}</td>
                  <td>${escapeHtml(sale.sellerName)}</td>
                  <td>${escapeHtml(formatDateTime(sale.createdAt))}</td>
                  <td>${escapeHtml(sale.products)}</td>
                  <td>${escapeHtml(formatCurrency(sale.total))}</td>
                </tr>`,
              )
              .join("")}
          </table>
        </body>
      </html>`;
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "barstocker-reportes.xls";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <form
        className="flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:items-end"
        onSubmit={applyFilters}
      >
        <div className="space-y-2">
          <Label htmlFor="from">Fecha inicial</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">Fecha final</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <Button type="submit">Aplicar filtros</Button>
        <Button type="button" variant="outline" onClick={exportExcel}>
          <Download className="size-4" aria-hidden="true" />
          Exportar Excel
        </Button>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm text-muted-foreground">
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

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border bg-white">
          <div className="border-b p-4">
            <h2 className="font-semibold">Reporte de inventario</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.code}>
                  <TableCell className="font-medium">
                    {product.code} - {product.name}
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.price * product.stock)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="border-b p-4">
            <h2 className="font-semibold">Reporte de ventas</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comprobante</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length ? (
                sales.map((sale) => (
                  <TableRow key={sale.saleNumber}>
                    <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                    <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                    <TableCell>{sale.sellerName}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.total)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No hay ventas en el rango seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
