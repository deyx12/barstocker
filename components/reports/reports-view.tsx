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

  function exportCsv() {
    const lines = [
      "Reporte de inventario",
      ["Codigo", "Nombre", "Categoria", "Stock", "Stock minimo", "Precio", "Estado", "Proveedor"].join(","),
      ...products.map((product) =>
        [
          product.code,
          product.name,
          product.category,
          product.stock,
          product.minStock,
          product.price,
          product.status,
          product.supplierName,
        ]
          .map(csvCell)
          .join(","),
      ),
      "",
      "Reporte de ventas",
      ["Comprobante", "Vendedor", "Fecha", "Productos", "Total"].join(","),
      ...sales.map((sale) =>
        [
          sale.saleNumber,
          sale.sellerName,
          sale.createdAt,
          sale.products,
          sale.total,
        ]
          .map(csvCell)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "barstocker-reportes.csv";
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
        <Button type="button" variant="outline" onClick={exportCsv}>
          <Download className="size-4" aria-hidden="true" />
          Exportar CSV
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
