"use client";

import { useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VENDEDOR";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRow["role"];
  status: UserRow["status"];
};

const emptyForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "VENDEDOR",
  status: "ACTIVE",
};

export function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    });
    setOpen(true);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = editing
      ? {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
        }
      : form;
    const response = await fetch(
      editing ? `/api/usuarios/${editing.id}` : "/api/usuarios",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(data.message || "No se pudo guardar el usuario.");
      return;
    }

    const saved = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      status: data.user.status,
      createdAt: data.user.createdAt,
    } satisfies UserRow;

    setUsers((current) =>
      editing
        ? current.map((user) => (user.id === saved.id ? saved : user))
        : [saved, ...current],
    );
    toast.success(editing ? "Usuario actualizado." : "Usuario creado.");
    setOpen(false);
  }

  async function deleteUser() {
    if (!userToDelete) return;
    setIsDeleting(true);

    const response = await fetch(`/api/usuarios/${userToDelete.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setIsDeleting(false);

    if (!response.ok) {
      toast.error(data.message || "No se pudo eliminar el usuario.");
      return;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === data.user.id
          ? {
              ...user,
              status: data.user.status,
            }
          : user,
      ),
    );
    setUserToDelete(null);
    toast.success(data.message || "Usuario eliminado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo usuario
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(user)}
                      >
                        <Edit className="size-4" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setUserToDelete(user)}
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
                  No hay usuarios registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              Define la informacion de acceso, rol y estado del usuario.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitForm}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nombre</Label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Correo</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
              {!editing ? (
                <div className="space-y-2">
                  <Label htmlFor="user-password">Contrasena</Label>
                  <Input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={form.role}
                  onValueChange={(role) =>
                    setForm((current) => ({
                      ...current,
                      role: role as UserRow["role"],
                    }))
                  }
                >
                  <SelectTrigger aria-label="Seleccionar rol del usuario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm((current) => ({
                      ...current,
                      status: status as UserRow["status"],
                    }))
                  }
                >
                  <SelectTrigger aria-label="Seleccionar estado del usuario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Confirmar eliminacion"
        description={`El usuario "${userToDelete?.name ?? ""}" quedara inactivo y no podra iniciar sesion hasta que un administrador lo reactive.`}
        confirmText="Eliminar usuario"
        isLoading={isDeleting}
        onOpenChange={(value) => {
          if (!value) setUserToDelete(null);
        }}
        onConfirm={deleteUser}
      />
    </div>
  );
}
