"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
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

export function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);

  async function updateUser(id: string, payload: Partial<Pick<UserRow, "role" | "status">>) {
    const response = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message || "No se pudo actualizar el usuario.");
      return;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? {
              ...user,
              role: data.user.role,
              status: data.user.status,
            }
          : user,
      ),
    );
    toast.success("Usuario actualizado.");
  }

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Creado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length ? (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(role) =>
                      updateUser(user.id, { role: role as UserRow["role"] })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Cambiar rol de ${user.name}`}
                      className="w-40"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={user.status} />
                    <Select
                      value={user.status}
                      onValueChange={(status) =>
                        updateUser(user.id, { status: status as UserRow["status"] })
                      }
                    >
                      <SelectTrigger
                        aria-label={`Cambiar estado de ${user.name}`}
                        className="w-32"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Activo</SelectItem>
                        <SelectItem value="INACTIVE">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(user.createdAt)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No hay usuarios registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
