"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountFormProps = {
  user: {
    name: string;
    email: string;
  };
};

export function AccountForm({ user }: AccountFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const response = await fetch("/api/cuenta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(data.message || "No se pudo actualizar la cuenta.");
      return;
    }

    setPassword("");
    toast.success("Cuenta actualizada correctamente.");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Informacion de la cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="account-name">Nombre</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">Correo</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-password">Nueva contrasena</Label>
            <Input
              id="account-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Deja vacio si no deseas cambiarla"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="size-4" aria-hidden="true" />
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
