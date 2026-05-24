"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import {
  productSchema,
  type ProductFormInput,
  type ProductFormValues,
} from "@/lib/validations/product";

export type ProductRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  stock: number;
  minStock: number;
  status: string;
  supplierId: string | null;
  supplierName: string | null;
};

type SupplierOption = {
  id: string;
  name: string;
};

type ProductsTableProps = {
  initialProducts: ProductRow[];
  suppliers: SupplierOption[];
  canManage: boolean;
};

const productStatusOptions = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "LOW_STOCK", label: "Bajo stock" },
  { value: "OUT_OF_STOCK", label: "Agotado" },
  { value: "INACTIVE", label: "Inactivo" },
];

const defaultValues: ProductFormValues = {
  code: "",
  name: "",
  category: "",
  description: "",
  price: 0,
  stock: 0,
  minStock: 0,
  status: "AVAILABLE",
  supplierId: "",
};

export function ProductsTable({
  initialProducts,
  suppliers,
  canManage,
}: ProductsTableProps) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.code.toLowerCase().includes(normalizedQuery);
      const matchesCategory = category === "ALL" || product.category === category;
      const matchesStatus = status === "ALL" || product.status === status;

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [products, query, category, status]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      { accessorKey: "code", header: "Codigo" },
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "category", header: "Categoria" },
      {
        accessorKey: "price",
        header: "Precio",
        cell: ({ row }) => formatCurrency(row.original.price),
      },
      { accessorKey: "stock", header: "Stock" },
      { accessorKey: "minStock", header: "Stock minimo" },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) =>
          canManage ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openEdit(row.original)}
              >
                <Edit className="size-4" aria-hidden="true" />
                Editar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteProduct(row.original)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar
              </Button>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Solo lectura</span>
          ),
      },
    ],
    [canManage],
  );

  const table = useReactTable({
    data: filteredProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function openCreate() {
    setEditing(null);
    reset(defaultValues);
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    reset({
      code: product.code,
      name: product.name,
      category: product.category,
      description: product.description ?? "",
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      status: product.status as ProductFormValues["status"],
      supplierId: product.supplierId ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: ProductFormValues) {
    const response = await fetch(
      editing ? `/api/productos/${editing.id}` : "/api/productos",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "No se pudo guardar el producto.");
      return;
    }

    const saved = normalizeProduct(data.product);
    setProducts((current) =>
      editing
        ? current.map((product) => (product.id === saved.id ? saved : product))
        : [saved, ...current],
    );
    toast.success(editing ? "Producto actualizado." : "Producto creado.");
    setOpen(false);
  }

  async function deleteProduct(product: ProductRow) {
    const response = await fetch(`/api/productos/${product.id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "No se pudo eliminar el producto.");
      return;
    }

    if (data.product) {
      const updated = normalizeProduct(data.product);
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(data.message || "Producto marcado como inactivo.");
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    toast.success("Producto eliminado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Buscar producto por nombre o codigo"
              placeholder="Buscar por nombre o codigo"
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filtrar por categoria">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {productStatusOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage ? (
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo producto
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.id === "actions" ? "text-right" : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.id === "actions" ? "text-right" : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No se encontraron productos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              Completa la informacion del producto y su inventario inicial.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Codigo</Label>
                <Input id="code" {...register("code")} />
                <FieldError message={errors.code?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...register("name")} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" {...register("category")} />
                <FieldError message={errors.category?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Input id="price" type="number" min="0" step="100" {...register("price")} />
                <FieldError message={errors.price?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" type="number" min="0" {...register("stock")} />
                <FieldError message={errors.stock?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stock minimo</Label>
                <Input id="minStock" type="number" min="0" {...register("minStock")} />
                <FieldError message={errors.minStock?.message} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={watch("status") || "AVAILABLE"}
                  onValueChange={(value) =>
                    setValue("status", value as ProductFormValues["status"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-label="Seleccionar estado del producto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productStatusOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.status?.message} />
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select
                  value={watch("supplierId") || "NONE"}
                  onValueChange={(value) =>
                    setValue("supplierId", value === "NONE" ? "" : value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-label="Seleccionar proveedor">
                    <SelectValue placeholder="Sin proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin proveedor</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.supplierId?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea id="description" {...register("description")} />
              <FieldError message={errors.description?.message} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normalizeProduct(product: ProductRow & { supplier?: SupplierOption | null }) {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    category: product.category,
    description: product.description,
    price: Number(product.price),
    stock: product.stock,
    minStock: product.minStock,
    status: product.status,
    supplierId: product.supplierId,
    supplierName: product.supplier?.name ?? product.supplierName ?? null,
  };
}
