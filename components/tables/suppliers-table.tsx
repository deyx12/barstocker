"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  supplierSchema,
  type SupplierFormValues,
} from "@/lib/validations/supplier";

export type SupplierRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
};

const defaultValues: SupplierFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  status: "ACTIVE",
};

export function SuppliersTable({
  initialSuppliers,
}: {
  initialSuppliers: SupplierRow[];
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  });

  const filteredSuppliers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return suppliers.filter(
      (supplier) =>
        !normalized ||
        supplier.name.toLowerCase().includes(normalized) ||
        supplier.email.toLowerCase().includes(normalized),
    );
  }, [suppliers, query]);

  function openCreate() {
    setEditing(null);
    reset(defaultValues);
    setOpen(true);
  }

  function openEdit(supplier: SupplierRow) {
    setEditing(supplier);
    reset({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: supplier.status as SupplierFormValues["status"],
    });
    setOpen(true);
  }

  async function onSubmit(values: SupplierFormValues) {
    const response = await fetch(
      editing ? `/api/proveedores/${editing.id}` : "/api/proveedores",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "No se pudo guardar el proveedor.");
      return;
    }

    const saved = data.supplier as SupplierRow;
    setSuppliers((current) =>
      editing
        ? current.map((supplier) => (supplier.id === saved.id ? saved : supplier))
        : [saved, ...current],
    );
    toast.success(editing ? "Proveedor actualizado." : "Proveedor creado.");
    setOpen(false);
  }

  async function deleteSupplier(supplier: SupplierRow) {
    const response = await fetch(`/api/proveedores/${supplier.id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "No se pudo eliminar el proveedor.");
      return;
    }

    if (data.supplier) {
      setSuppliers((current) =>
        current.map((item) => (item.id === data.supplier.id ? data.supplier : item)),
      );
      toast.success(data.message || "Proveedor inactivado.");
      return;
    }

    setSuppliers((current) => current.filter((item) => item.id !== supplier.id));
    toast.success("Proveedor eliminado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Buscar proveedor"
            placeholder="Buscar por nombre o correo"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo proveedor
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Direccion</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length ? (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>{supplier.address}</TableCell>
                  <TableCell>
                    <StatusBadge status={supplier.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(supplier)}
                      >
                        <Edit className="size-4" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSupplier(supplier)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay proveedores para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            <DialogDescription>
              Registra la informacion de contacto del proveedor.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Nombre</Label>
                <Input id="supplier-name" {...register("name")} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" {...register("phone")} />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Correo</Label>
                <Input id="supplier-email" type="email" {...register("email")} />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={watch("status") || "ACTIVE"}
                  onValueChange={(value) =>
                    setValue("status", value as SupplierFormValues["status"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-label="Seleccionar estado del proveedor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.status?.message} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input id="address" {...register("address")} />
              <FieldError message={errors.address?.message} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
