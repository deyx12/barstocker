import { Suspense } from "react";
import { Wine } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wine className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-bold leading-tight">BarStocker Web</p>
            <p className="text-sm text-muted-foreground">
              Inventario y ventas para bares
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesion</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
