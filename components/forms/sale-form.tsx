"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronDown,
  Download,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FieldError } from "@/components/field-error";
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
import { calculateSaleTotal } from "@/lib/business";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  saleSchema,
  type SaleFormInput,
  type SaleFormValues,
} from "@/lib/validations/sale";

type AvailableProduct = {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
};

type Receipt = {
  id: string;
  saleNumber: string;
  customerName: string;
  customerDocument: string | null;
  customerPhone: string | null;
  total: number;
  createdAt: string;
  details: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: {
      name: string;
      code: string;
    };
  }>;
};

function getProductLabel(product: AvailableProduct) {
  return `${product.code} - ${product.name} (${product.stock})`;
}

type ProductComboboxProps = {
  id: string;
  value: string;
  products: AvailableProduct[];
  onChange: (value: string) => void;
};

function ProductCombobox({
  id,
  value,
  products,
  onChange,
}: ProductComboboxProps) {
  const selectedProduct = products.find((product) => product.id === value);
  const selectedLabel = selectedProduct ? getProductLabel(selectedProduct) : "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const availableProducts = useMemo(
    () => products.filter((product) => product.stock > 0),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableProducts;
    }

    return availableProducts.filter((product) =>
      `${product.code} ${product.name}`.toLowerCase().includes(normalizedQuery),
    );
  }, [availableProducts, query]);
  const inputValue = open ? query : selectedLabel || query;

  function selectProduct(product: AvailableProduct) {
    onChange(product.id);
    setQuery("");
    setOpen(false);
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setOpen(true);

    if (selectedProduct && nextQuery !== selectedLabel) {
      onChange("");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && open && filteredProducts.length) {
      event.preventDefault();
      selectProduct(filteredProducts[0]);
    }

    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          if (selectedProduct) {
            setQuery("");
          }
        }
      }}
    >
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Buscar o seleccionar producto"
          value={inputValue}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pr-9"
        />
        <button
          type="button"
          aria-label="Abrir productos"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div
          id={`${id}-options`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filteredProducts.length ? (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={product.id === value}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:outline-none"
                onClick={() => selectProduct(product)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {product.code} - {product.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Stock: {product.stock}
                  </span>
                </span>
                {product.id === value ? (
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No hay productos coincidentes.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SaleForm({ initialProducts }: { initialProducts: AvailableProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const {
    control,
    handleSubmit,
    register,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormInput, unknown, SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: "",
      customerDocument: "",
      customerPhone: "",
      items: [{ productId: "", quantity: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const watchedItems = watch("items");
  const total = calculateSaleTotal(
    watchedItems.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity) || 0,
    })),
    products,
  );

  async function onSubmit(values: SaleFormValues) {
    const insufficientIndex = values.items.findIndex((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return !product || product.stock < item.quantity;
    });

    if (insufficientIndex >= 0) {
      setError(`items.${insufficientIndex}.quantity`, {
        message: "No hay stock suficiente para este producto.",
      });
      toast.error("Revisa las cantidades. Hay productos sin stock suficiente.");
      return;
    }

    const response = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "No se pudo registrar la venta.");
      return;
    }

    const sale = data.sale;
    setReceipt({
      id: sale.id,
      saleNumber: sale.saleNumber,
      customerName: sale.customerName,
      customerDocument: sale.customerDocument,
      customerPhone: sale.customerPhone,
      total: Number(sale.total),
      createdAt: sale.createdAt,
      details: sale.details.map(
        (detail: {
          id: string;
          productId: string;
          quantity: number;
          unitPrice: string | number;
          subtotal: string | number;
          product: { name: string; code: string };
        }) => ({
          id: detail.id,
          productId: detail.productId,
          quantity: detail.quantity,
          unitPrice: Number(detail.unitPrice),
          subtotal: Number(detail.subtotal),
          product: detail.product,
        }),
      ),
    });
    setProducts((current) =>
      current.map((product) => {
        const detail = sale.details.find(
          (item: { productId: string; product: { stock: number } }) =>
            item.productId === product.id,
        );

        return detail ? { ...product, stock: detail.product.stock } : product;
      }),
    );
    reset({
      customerName: "",
      customerDocument: "",
      customerPhone: "",
      items: [{ productId: "", quantity: 1 }],
    });
    toast.success("Venta registrada e inventario actualizado.");
  }

  async function reverseSale() {
    if (!receipt) return;

    setIsReversing(true);
    try {
      const response = await fetch(`/api/ventas/${receipt.id}`, {
        method: "PATCH",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "No se pudo reversar la venta.");
        return;
      }

      const sale = data.sale;
      setProducts((current) =>
        current.map((product) => {
          const detail = sale.details.find(
            (item: { productId: string; product: { stock: number } }) =>
              item.productId === product.id,
          );

          return detail ? { ...product, stock: detail.product.stock } : product;
        }),
      );
      setReceipt(null);
      setReverseDialogOpen(false);
      toast.success("Venta reversada e inventario restaurado.");
    } finally {
      setIsReversing(false);
    }
  }

  function clearReceipt() {
    setReceipt(null);
    setReverseDialogOpen(false);
  }

  async function downloadReceiptPdf() {
    if (!receipt) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 16;

    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BarStocker Web", margin, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Comprobante de venta", margin, y + 8);
    doc.text(receipt.saleNumber, pageWidth - margin, y + 8, { align: "right" });

    y = 48;
    doc.setTextColor(15, 23, 42);
    doc.setDrawColor(219, 227, 239);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y - 8, pageWidth - margin * 2, 36, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cliente", margin + 4, y);
    doc.text("Fecha", pageWidth / 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(receipt.customerName, margin + 4, y + 8);
    doc.text(formatDateTime(receipt.createdAt), pageWidth / 2, y + 8);
    doc.text(`Documento/NIT: ${receipt.customerDocument || "No registrado"}`, margin + 4, y + 16);
    doc.text(`Telefono: ${receipt.customerPhone || "No registrado"}`, pageWidth / 2, y + 16);

    y += 48;
    doc.setFillColor(30, 64, 175);
    doc.rect(margin, y - 7, pageWidth - margin * 2, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Producto", margin + 3, y);
    doc.text("Cant.", 122, y, { align: "right" });
    doc.text("Precio", 148, y, { align: "right" });
    doc.text("Subtotal", pageWidth - margin - 3, y, { align: "right" });

    y += 8;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    receipt.details.forEach((detail, index) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "F");
      }

      const productName = `${detail.product.code} - ${detail.product.name}`;
      doc.text(doc.splitTextToSize(productName, 85)[0], margin + 3, y);
      doc.text(String(detail.quantity), 122, y, { align: "right" });
      doc.text(formatCurrency(detail.unitPrice), 148, y, { align: "right" });
      doc.text(formatCurrency(detail.subtotal), pageWidth - margin - 3, y, {
        align: "right",
      });
      y += 8;
    });

    y += 5;
    doc.setDrawColor(30, 64, 175);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total", pageWidth - 70, y);
    doc.text(formatCurrency(receipt.total), pageWidth - margin, y, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Documento generado por BarStocker Web", margin, 287);
    doc.save(`${receipt.saleNumber}.pdf`);
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <Card>
        <CardHeader>
          <CardTitle>Registrar venta</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="rounded-lg border bg-slate-50 p-4">
              <h2 className="mb-3 text-sm font-semibold">Informacion del cliente</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre del cliente</Label>
                  <Input id="customerName" {...register("customerName")} />
                  <FieldError message={errors.customerName?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerDocument">Documento o NIT</Label>
                  <Input id="customerDocument" {...register("customerDocument")} />
                  <FieldError message={errors.customerDocument?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telefono</Label>
                  <Input id="customerPhone" {...register("customerPhone")} />
                  <FieldError message={errors.customerPhone?.message} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const product = products.find(
                  (entry) => entry.id === watchedItems[index]?.productId,
                );
                const quantity = Number(watchedItems[index]?.quantity) || 0;

                return (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-lg border bg-slate-50 p-3 lg:grid-cols-[1fr_140px_140px_auto]"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`product-${field.id}`}>Producto</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.productId`}
                        render={({ field: productField }) => (
                          <ProductCombobox
                            id={`product-${field.id}`}
                            products={products}
                            value={productField.value || ""}
                            onChange={productField.onChange}
                          />
                        )}
                      />
                      <FieldError message={errors.items?.[index]?.productId?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${field.id}`}>Cantidad</Label>
                      <Input
                        id={`quantity-${field.id}`}
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`)}
                      />
                      <FieldError message={errors.items?.[index]?.quantity?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label>Subtotal</Label>
                      <div className="flex h-10 items-center rounded-md border bg-white px-3 text-sm font-semibold">
                        {formatCurrency(product ? product.price * quantity : 0)}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Quitar producto"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <FieldError message={errors.items?.message} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ productId: "", quantity: 1 })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Agregar producto
              </Button>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-lg font-bold">Total: {formatCurrency(total)}</p>
                <Button type="submit" disabled={isSubmitting}>
                  <ShoppingCart className="size-4" aria-hidden="true" />
                  {isSubmitting ? "Confirmando..." : "Confirmar venta"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-5 text-primary" aria-hidden="true" />
            Comprobante
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receipt ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Numero</p>
                <p className="font-semibold">{receipt.saleNumber}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(receipt.createdAt)}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{receipt.customerName}</p>
                {receipt.customerDocument ? (
                  <p className="text-sm text-muted-foreground">
                    Documento/NIT: {receipt.customerDocument}
                  </p>
                ) : null}
                {receipt.customerPhone ? (
                  <p className="text-sm text-muted-foreground">
                    Telefono: {receipt.customerPhone}
                  </p>
                ) : null}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>{detail.product.name}</TableCell>
                      <TableCell>{detail.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(receipt.total)}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="button" onClick={downloadReceiptPdf}>
                  <Download className="size-4" aria-hidden="true" />
                  Descargar PDF
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setReverseDialogOpen(true)}
                  disabled={isReversing}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reversar venta
                </Button>
                <Button type="button" variant="secondary" onClick={clearReceipt}>
                  <Check className="size-4" aria-hidden="true" />
                  Listo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed text-center">
              <ReceiptText className="mb-2 size-10 text-primary" aria-hidden="true" />
              <p className="font-medium">Sin venta confirmada</p>
              <p className="text-sm text-muted-foreground">
                El comprobante aparecera al registrar una venta.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <ConfirmDialog
        open={reverseDialogOpen}
        title="Reversar venta"
        description="La venta se marcara como cancelada y las cantidades vendidas volveran al inventario."
        confirmText="Reversar venta"
        isLoading={isReversing}
        onOpenChange={(open) => {
          if (!isReversing) setReverseDialogOpen(open);
        }}
        onConfirm={reverseSale}
      />
    </>
  );
}
