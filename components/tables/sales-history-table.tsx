"use client";

import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export type SaleHistoryRow = {
  id: string;
  saleNumber: string;
  customerName: string;
  customerDocument: string | null;
  customerPhone: string | null;
  sellerId: string;
  sellerName: string;
  total: number;
  status: string;
  createdAt: string;
  details: Array<{
    id: string;
    productName: string;
    productCode: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

type SellerOption = {
  id: string;
  name: string;
};

type SalesHistoryTableProps = {
  sales: SaleHistoryRow[];
  sellers: SellerOption[];
  initialQuery?: string;
};

export function SalesHistoryTable({
  sales,
  sellers,
  initialQuery = "",
}: SalesHistoryTableProps) {
  const [query, setQuery] = useState(initialQuery);
  const [sellerId, setSellerId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleHistoryRow | null>(null);

  const filteredSales = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sales.filter((sale) => {
      const date = sale.createdAt.slice(0, 10);
      const matchesQuery =
        !normalizedQuery ||
        sale.saleNumber.toLowerCase().includes(normalizedQuery) ||
        sale.sellerName.toLowerCase().includes(normalizedQuery) ||
        sale.customerName.toLowerCase().includes(normalizedQuery) ||
        (sale.customerDocument ?? "").toLowerCase().includes(normalizedQuery) ||
        (sale.customerPhone ?? "").toLowerCase().includes(normalizedQuery);
      const matchesSeller = sellerId === "ALL" || sale.sellerId === sellerId;
      const matchesStatus = status === "ALL" || sale.status === status;
      const matchesFrom = !from || date >= from;
      const matchesTo = !to || date <= to;

      return (
        matchesQuery &&
        matchesSeller &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [sales, query, sellerId, status, from, to]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_160px_160px_160px]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Buscar venta por numero o vendedor"
            placeholder="Buscar venta o vendedor"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select value={sellerId} onValueChange={setSellerId}>
          <SelectTrigger aria-label="Filtrar por vendedor">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                {seller.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filtrar por estado de venta">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="COMPLETED">Completadas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Input
          aria-label="Fecha inicial"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input
          aria-label="Fecha final"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length ? (
              filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                  <TableCell>{sale.sellerName}</TableCell>
                  <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={sale.status} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(sale.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay ventas que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selectedSale)} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de venta</DialogTitle>
            <DialogDescription>
              {selectedSale?.saleNumber} - {selectedSale ? formatDateTime(selectedSale.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedSale ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    Cliente
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedSale.customerName || "No registrado"}
                  </p>
                  <p className="text-muted-foreground">
                    Documento/NIT: {selectedSale.customerDocument || "No registrado"}
                  </p>
                  <p className="text-muted-foreground">
                    Telefono: {selectedSale.customerPhone || "No registrado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    Vendedor
                  </p>
                  <p className="mt-1 font-semibold">{selectedSale.sellerName}</p>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <span>Estado:</span>
                    <StatusBadge status={selectedSale.status} />
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSale.details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>
                        {detail.productCode} - {detail.productName}
                      </TableCell>
                      <TableCell>{detail.quantity}</TableCell>
                      <TableCell>{formatCurrency(detail.unitPrice)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
