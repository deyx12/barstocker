"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Minus, Plus, ReceiptText, ShoppingCart } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  saleNumber: string;
  customerName: string;
  customerDocument: string | null;
  customerPhone: string | null;
  total: number;
  createdAt: string;
  details: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: {
      name: string;
      code: string;
    };
  }>;
};

export function SaleForm({ initialProducts }: { initialProducts: AvailableProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
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
      saleNumber: sale.saleNumber,
      customerName: sale.customerName,
      customerDocument: sale.customerDocument,
      customerPhone: sale.customerPhone,
      total: Number(sale.total),
      createdAt: sale.createdAt,
      details: sale.details.map(
        (detail: {
          id: string;
          quantity: number;
          unitPrice: string | number;
          subtotal: string | number;
          product: { name: string; code: string };
        }) => ({
          id: detail.id,
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
                      <Label>Producto</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.productId`}
                        render={({ field: productField }) => (
                          <Select
                            value={productField.value || "NONE"}
                            onValueChange={(value) =>
                              productField.onChange(value === "NONE" ? "" : value)
                            }
                          >
                            <SelectTrigger aria-label={`Seleccionar producto ${index + 1}`}>
                              <SelectValue placeholder="Selecciona producto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">Selecciona producto</SelectItem>
                              {products
                                .filter((item) => item.stock > 0)
                                .map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.code} - {item.name} ({item.stock})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
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
              <Button type="button" className="w-full" onClick={downloadReceiptPdf}>
                <Download className="size-4" aria-hidden="true" />
                Descargar comprobante PDF
              </Button>
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
  );
}
