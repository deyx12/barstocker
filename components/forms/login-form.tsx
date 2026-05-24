"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FieldError } from "@/components/field-error";
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/login";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const inactiveFromUrl = searchParams.get("error") === "inactive";
  const [serverError, setServerError] = useState<string | null>(
    inactiveFromUrl
      ? "Tu cuenta esta inactiva. Para activarla debes comunicarte con el administrador"
      : null,
  );
  const [inactiveDialogOpen, setInactiveDialogOpen] = useState(inactiveFromUrl);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!inactiveFromUrl) {
      return;
    }

    supabase.auth.signOut();
  }, [inactiveFromUrl, supabase]);

  function showInactiveAccountMessage() {
    const message =
      "Tu cuenta esta inactiva. Para activarla debes comunicarte con el administrador.";
    setServerError(message);
    setInactiveDialogOpen(true);
    toast.error("Cuenta inactiva.");
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : "No pudimos iniciar sesión. Revisa tus credenciales.";
      setServerError(message);
      toast.error(message);
      return;
    }

    const sessionCheck = await fetch("/api/cuenta");
    if (sessionCheck.status === 403) {
      await supabase.auth.signOut();
      showInactiveAccountMessage();
      router.replace("/login?error=inactive");
      router.refresh();
      return;
    }

    toast.success("Bienvenido a BarStocker Web.");
    router.replace(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            role="alert"
          >
            {serverError}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Correo electronico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@barstocker.com"
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Ingresa tu contrasena"
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          <LogIn className="size-4" aria-hidden="true" />
          {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
        </Button>
      </form>

      <Dialog open={inactiveDialogOpen} onOpenChange={setInactiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cuenta inactiva</DialogTitle>
            <DialogDescription>
              Tu cuenta esta inactiva. Para solicitar la activacion debes
              comunicarte con el administrador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setInactiveDialogOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
