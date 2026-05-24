"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FieldError } from "@/components/field-error";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatDateTime } from "@/lib/utils";
import {
  inventoryMovementSchema,
  type InventoryMovementInput,
  type InventoryMovementValues,
} from "@/lib/validations/inventory";

export type InventoryProductRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  status: string;
  supplierName: string | null;
};

type InventoryMovementRow = {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
};

type InventoryTableProps = {
  initialProducts: InventoryProductRow[];
  initialMovements: InventoryMovementRow[];
  canManage: boolean;
};

export function InventoryTable({
  initialProducts,
  initialMovements,
  canManage,
}: InventoryTableProps) {
  const [products, setProducts] = useState(initialProducts);
  const [movements, setMovements] = useState(initialMovements);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [open, setOpen] = useState(false);
  const {
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InventoryMovementInput, unknown, InventoryMovementValues>({
    resolver: zodResolver(inventoryMovementSchema),
    defaultValues: {
      productId: "",
      type: "IN",
      quantity: 1,
      reason: "",
    },
  });

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.code.toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "ALL" || product.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [products, query, status]);

  function openMovementDialog() {
    reset({
      productId: "",
      type: "IN",
      quantity: 1,
      reason: "",
    });
    setOpen(true);
  }

  async function onSubmit(values: InventoryMovementValues) {
    const response = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "No se pudo registrar el movimiento.");
      return;
    }

    const movement = data.movement;
    setMovements((current) => [
      {
        id: movement.id,
        productName: movement.product.name,
        type: movement.type,
        quantity: movement.quantity,
        previousStock: movement.previousStock,
        newStock: movement.newStock,
        reason: movement.reason,
        createdAt: movement.createdAt,
      },
      ...current,
    ]);
    setProducts((current) =>
      current.map((product) =>
        product.id === movement.productId
          ? {
              ...product,
              stock: movement.newStock,
              status: movement.product.status,
            }
          : product,
      ),
    );
    toast.success("Movimiento registrado y stock actualizado.");
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Buscar producto en inventario"
              placeholder="Buscar producto o codigo"
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filtrar estado de inventario">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="AVAILABLE">Disponible</SelectItem>
              <SelectItem value="LOW_STOCK">Bajo stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Agotado</SelectItem>
              <SelectItem value="INACTIVE">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage ? (
          <Button type="button" onClick={openMovementDialog}>
            <Plus className="size-4" aria-hidden="true" />
            Registrar movimiento
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codigo</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Stock actual</TableHead>
              <TableHead>Stock minimo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length ? (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.supplierName ?? "Sin proveedor"}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{product.minStock}</TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay productos para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Boxes className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Movimientos recientes</h2>
        </div>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Stock anterior</TableHead>
                <TableHead>Stock nuevo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length ? (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">{movement.productName}</TableCell>
                    <TableCell>
                      <StatusBadge status={movement.type} />
                    </TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.previousStock}</TableCell>
                    <TableCell>{movement.newStock}</TableCell>
                    <TableCell>{movement.reason}</TableCell>
                    <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aun no hay movimientos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar movimiento de inventario</DialogTitle>
            <DialogDescription>
              Los ingresos aumentan stock y las salidas lo descuentan.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select
                value={watch("productId") || "NONE"}
                onValueChange={(value) =>
                  setValue("productId", value === "NONE" ? "" : value, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger aria-label="Seleccionar producto del movimiento">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Selecciona un producto</SelectItem>
                  {products
                    .filter((product) => product.status !== "INACTIVE")
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.productId?.message} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={watch("type")}
                  onValueChange={(value) =>
                    setValue("type", value as InventoryMovementValues["type"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-label="Seleccionar tipo de movimiento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Ingreso</SelectItem>
                    <SelectItem value="OUT">Salida</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.type?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input id="quantity" type="number" min="1" {...register("quantity")} />
                <FieldError message={errors.quantity?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input id="reason" {...register("reason")} />
              <FieldError message={errors.reason?.message} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Guardar movimiento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
