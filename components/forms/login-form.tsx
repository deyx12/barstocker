"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/login";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [serverError, setServerError] = useState<string | null>(
    searchParams.get("error") === "inactive"
      ? "Tu usuario esta inactivo. Contacta al administrador."
      : null,
  );
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

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "Correo o contrasena incorrectos."
          : "No pudimos iniciar sesion. Revisa tus credenciales.";
      setServerError(message);
      toast.error(message);
      return;
    }

    toast.success("Bienvenido a BarStocker Web.");
    router.replace(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
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
  );
}
